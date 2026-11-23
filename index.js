/**
 * Host half of dsh-model-params.
 *
 * Owns the rollback journal: the Client half records every model-config write
 * (original values + written values) into this plugin's own volatile `journal`
 * config field before touching llm-pi-ai. When the bundle is UNINSTALLED (the
 * entry leaves the Loader composition), the dispose effect restores the
 * journaled fields to their originals — but only where the current value still
 * equals what the plugin wrote, so later manual edits are never clobbered.
 * Disable and app shutdown keep the configuration (the entry stays listed).
 */
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

// link:-installed bundles get no managed node_modules, so resolve schemastery
// from the running DSH installation when the local resolution fails.
const localRequire = createRequire(import.meta.url)
let z
try {
  const mod = localRequire('@deepseek-ai/schemastery')
  z = mod.default ?? mod
} catch {
  const anchor = process.env.DSH_INSTALL_DIR !== undefined
    ? join(process.env.DSH_INSTALL_DIR, 'package.json')
    // Desktop layout: <app>/<exe> -> resources/app.asar/dsh (the CLI package).
    : join(dirname(process.execPath), 'resources', 'app.asar', 'dsh', 'node_modules', '@deepseek-ai', 'dsh', 'package.json')
  const hostRequire = createRequire(anchor)
  const mod = hostRequire('@deepseek-ai/schemastery')
  z = mod.default ?? mod
}

export const Config = z.object({
  /** provider/model -> JSON {entryPresent, orig, wrote} over contextWindow/reasoningEfforts/compat; written by the Client half. */
  journal: z.dict(z.string()).default({}).volatile(),
})

const ENTRY_ID = 'dsh-model-params'
const LLM_NS = 'llm-pi-ai'

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function has(object, key) {
  return isRecord(object) && Object.prototype.hasOwnProperty.call(object, key)
}
/** Presence-aware JSON encoding: an absent field never equals a present one. */
function enc(value) {
  return value === undefined ? '\u0000absent' : JSON.stringify(value)
}

/**
 * Restore one model entry from its journal record.
 * @returns the restored entry, the unchanged entry, or null to remove an
 * entry the plugin created and whose fields all rolled back to absent.
 */
function restoreEntry(raw, record) {
  if (!isRecord(raw) || !isRecord(record) || !isRecord(record.orig) || !isRecord(record.wrote)) return raw
  const next = { ...raw }
  let changed = false
  const fields = [
    ['contextWindow', 'cw'],
    ['reasoningEfforts', 're'],
    ['compat', 'compat'],
  ]
  for (const [rawKey, jKey] of fields) {
    const current = has(raw, rawKey) ? raw[rawKey] : undefined
    const written = record.wrote[jKey + 'Present'] ? record.wrote[jKey] : undefined
    // Only undo a value the plugin wrote and nobody has changed since.
    if (enc(current) !== enc(written)) continue
    const origPresent = record.orig[jKey + 'Present'] === true
    const origValue = origPresent ? record.orig[jKey] : undefined
    if (enc(current) === enc(origValue)) continue
    if (origPresent) next[rawKey] = origValue
    else delete next[rawKey]
    changed = true
  }
  if (!changed) return raw
  if (record.entryPresent === false && Object.keys(next).length === 1 && next.id === raw.id) return null
  return next
}

async function rollback(ctx, config, entry) {
  try {
    const editor = ctx.get('configEditor')
    const settings = ctx.get('settings')
    if (editor === undefined || settings === undefined) return
    // Uninstall signal: the entry left the composition. Disable and app
    // shutdown keep the entry listed, so they must NOT roll back.
    const stillListed = editor.entries().some(row => row.options.id === ENTRY_ID)
    if (stillListed) return
    const journal = config.journal && typeof config.journal.get === 'function' ? config.journal.get() : {}
    const keys = Object.keys(journal ?? {})
    if (keys.length === 0) return
    const descriptor = settings.describe().find(row => row.ns === LLM_NS)
    const providers = descriptor && isRecord(descriptor.value) ? descriptor.value.providers : undefined
    if (isRecord(providers)) {
      const byProvider = new Map()
      for (const key of keys) {
        let record
        try { record = JSON.parse(journal[key]) } catch { continue }
        const slash = key.indexOf('/')
        if (slash <= 0) continue
        const provider = key.slice(0, slash)
        const model = key.slice(slash + 1)
        if (!byProvider.has(provider)) byProvider.set(provider, [])
        byProvider.get(provider).push({ model, record })
      }
      for (const [provider, items] of byProvider) {
        const profile = providers[provider]
        if (!isRecord(profile) || !Array.isArray(profile.models)) continue
        let changed = false
        const nextModels = []
        for (const raw of profile.models) {
          const item = isRecord(raw) ? items.find(candidate => candidate.model === raw.id) : undefined
          if (item === undefined) { nextModels.push(raw); continue }
          const restored = restoreEntry(raw, item.record)
          if (restored === null) { changed = true; continue }
          if (restored !== raw) changed = true
          nextModels.push(restored)
        }
        if (!changed) continue
        try {
          await settings.mutate(LLM_NS, [{ op: 'set', path: ['providers', provider, 'models'], value: nextModels }])
        } catch (error) {
          ctx.logger.warn('dsh-model-params: rollback of provider %s failed', provider, error)
        }
      }
    }
    // Best effort: leave no journal residue in the user's patch layer.
    try {
      await editor.edit(entry, raw => ({ ...raw, journal: {} }))
    } catch { /* entry already gone with the bundle — the override is inert */ }
  } catch (error) {
    try { ctx.logger.warn('dsh-model-params: rollback failed', error) } catch { /* logger gone */ }
  }
}

export function apply(ctx, config) {
  ctx.inject(['settings'], (child) => {
    child.effect(() => child.settings.configure({ auto: false }, ctx.fiber))
  })
  const entry = ctx.fiber.entry
  ctx.effect(() => () => { void rollback(ctx, config, entry) }, 'dsh-model-params: rollback on uninstall')
}