window.__ModuleLoader__.load({
  id: 'dsh-model-params',
  factory(require) {
    const React = require('react');
    const { createPortal } = require('react-dom');
    const h = React.createElement;
    const { useState, useLayoutEffect, useMemo, useRef, useSyncExternalStore, useCallback } = React;

    const NS = 'dsh-model-params';
    const SETTINGS_ENTRY = 'llm-pi-ai';
    const LEVELS = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'];
    const LEVEL_CHOICES = ['low', 'medium', 'high', 'xhigh', 'max'];
    const CONTEXT_PRESETS = [
      { label: '128K', value: 128000 },
      { label: '256K', value: 256000 },
      { label: '512K', value: 512000 },
      { label: '1M', value: 1000000 },
    ];
    const DEFAULT_CONTEXT_WINDOW = 262144;

    const zh = {
      'edit.aria': '编辑模型参数',
      'panel.context': '上下文',
      'panel.contextDefault': '默认',
      'panel.thinking': '思考模式',
      'panel.thinkingSwitch': '开启思考',
      'panel.willDeclare': '该模型未声明思考档位，点击开关或档位将自动写入配置。',
      'panel.noProvider': '该提供方不支持编辑模型配置（如官方账号模型）。',
      'panel.readonly': '当前配置不可写。',
      'panel.refused': '写入被拒绝：配置可能已被其他修改更新，请重试。',
      'panel.busy': '应用中…',
      'panel.aria': '模型参数',
      'level.off': '关闭',
      'level.minimal': '极简',
      'level.low': '低',
      'level.medium': '中',
      'level.high': '高',
      'level.xhigh': '超高',
      'level.max': '最大',
    };
    const en = {
      'edit.aria': 'Edit model parameters',
      'panel.context': 'Context',
      'panel.contextDefault': 'Default',
      'panel.thinking': 'Thinking',
      'panel.thinkingSwitch': 'Thinking',
      'panel.willDeclare': 'This model declares no reasoning levels; clicking the toggle or a level writes them to the config.',
      'panel.noProvider': 'This provider does not support config editing here (e.g. the official account).',
      'panel.readonly': 'The configuration is not writable.',
      'panel.refused': 'Write refused: the config may have changed elsewhere; please retry.',
      'panel.busy': 'Applying…',
      'panel.aria': 'Model parameters',
      'level.off': 'Off',
      'level.minimal': 'Minimal',
      'level.low': 'Low',
      'level.medium': 'Medium',
      'level.high': 'High',
      'level.xhigh': 'Extra high',
      'level.max': 'Max',
    };

    /* ---------- helpers ---------- */
    function isRecord(value) {
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    }
    function positiveInteger(value) {
      return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : undefined;
    }
    function formatCapacity(value) {
      if (!Number.isInteger(value) || value <= 0) return String(value);
      if (value % 1000000 === 0) return (value / 1000000) + 'M';
      if (value % 1000 === 0) return (value / 1000) + 'K';
      return String(value);
    }
    function levelsOf(entry) {
      const efforts = entry && entry.reasoningEfforts;
      if (efforts === false || efforts === undefined) return new Set();
      if (!isRecord(efforts)) return new Set();
      return new Set(LEVELS.filter(level => Object.prototype.hasOwnProperty.call(efforts, level)));
    }
    /** Merge needed levels into the existing wire map, preserving custom values. */
    function mergedEfforts(existing, needLevels, includeOff, offWire) {
      const known = isRecord(existing) ? existing : {};
      const result = {};
      const ordered = LEVELS.filter(level =>
        Object.prototype.hasOwnProperty.call(known, level) || needLevels.has(level) || (includeOff && level === 'off'));
      for (const level of ordered) {
        const current = known[level];
        if (typeof current === 'string' && current.length > 0) result[level] = current;
        else if (level === 'off') result.off = offWire ?? null;
        else result[level] = level;
      }
      return result;
    }
    function sameWire(a, b) {
      return JSON.stringify(a) === JSON.stringify(b);
    }

    /* ---------- styles ---------- */
    const LABEL_CSS = `
.dmp-label{display:inline-flex;align-items:center;gap:4px;min-width:0;white-space:nowrap;}
.dmp-name{min-width:0;overflow:hidden;text-overflow:ellipsis;}
.dmp-badge{display:inline-flex;align-items:center;flex:none;padding:0 6px;border-radius:var(--dsw-radius-sm,4px);font-size:11px;line-height:16px;font-weight:500;}
.dmp-badgeNeutral{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);}
.dmp-badgeInfo{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 14%,transparent);color:var(--dsw-alias-brand-primary);}
.dmp-badgeSuccess{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 14%,transparent);color:var(--dsw-alias-state-success-primary);}
.dmp-badgeWarning{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 16%,transparent);color:var(--dsw-alias-state-warn-primary);}
.dmp-edit{display:inline-flex;align-items:center;justify-content:center;flex:none;width:18px;height:18px;border-radius:var(--dsw-radius-sm,4px);color:var(--dsw-alias-label-caption,var(--dsw-alias-label-secondary));cursor:pointer;outline:none;}
.dmp-edit:hover,.dmp-edit:focus-visible{background:var(--dsw-alias-interactive-bg-hover,var(--dsw-alias-bg-layer-2));color:var(--dsw-alias-brand-primary);}
.dmp-edit svg{width:12px;height:12px;}
`;
    const PANEL_CSS = LABEL_CSS + `
.dmp-panel{box-sizing:border-box;position:fixed;z-index:1150;width:240px;max-height:min(380px,calc(100dvh - 24px));overflow-y:auto;padding:4px;border:0;border-radius:var(--dsw-radius-lg,12px);background:var(--dsw-menu-surface-fill,var(--dsw-alias-bg-overlay));backdrop-filter:var(--dsw-menu-backdrop-filter,none);color:var(--dsw-alias-label-primary);--dsw-elevation-stroke-color:var(--dsw-alias-border-l1);box-shadow:var(--dsw-elevation-prominent,0 8px 24px rgba(0,0,0,.25));font-size:13px;line-height:20px;outline:none;}
.dmp-panelTitle{margin:0;padding:6px 8px;font-size:11px;line-height:15px;font-weight:600;color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary));overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.dmp-sectionLabel{margin:0;padding:6px 8px;font-size:11px;line-height:15px;font-weight:600;color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary));}
.dmp-divider{height:0.5px;margin:3px 8px;background:var(--dsw-alias-border-l2);}
.dmp-row{box-sizing:border-box;display:flex;align-items:center;gap:6px;width:100%;min-height:34px;padding:6px 8px;border:none;border-radius:var(--dsw-radius-md,6px);background:transparent;color:inherit;font-size:13px;line-height:20px;font-family:inherit;text-align:left;cursor:pointer;outline:none;}
.dmp-row:focus-visible{background:var(--dsw-alias-interactive-bg-hover,var(--dsw-alias-bg-layer-2));}
@media (hover:hover){.dmp-row:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,var(--dsw-alias-bg-layer-2));}}
.dmp-row:disabled{color:var(--dsw-alias-label-dimmed,var(--dsw-alias-label-secondary));cursor:default;}
.dmp-rowLabel{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.dmp-rowHint{flex:none;font-size:11px;color:var(--dsw-alias-label-caption,var(--dsw-alias-label-secondary));}
.dmp-check{display:grid;place-items:center;flex:0 0 14px;color:var(--dsw-alias-label-primary);}
.dmp-check svg{width:14px;height:14px;}
.dmp-checkEmpty{flex:0 0 14px;}
.dmp-switch{position:relative;flex:0 0 auto;width:32px;height:18px;padding:0;border:none;border-radius:9px;background:var(--dsw-alias-border-l2);cursor:pointer;transition:background 120ms ease;}
.dmp-row[aria-checked="true"] .dmp-switch{background:var(--dsw-alias-state-success-primary,var(--dsw-alias-brand-primary));}
.dmp-row:disabled .dmp-switch{opacity:.5;cursor:default;}
.dmp-knob{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:var(--dsw-alias-bg-overlay);transition:left 120ms ease;}
.dmp-row[aria-checked="true"] .dmp-switch .dmp-knob{left:16px;}
.dmp-hint{margin:0;padding:4px 8px 6px;font-size:11px;line-height:16px;color:var(--dsw-alias-label-caption,var(--dsw-alias-label-secondary));}
.dmp-error{margin:0;padding:4px 8px 6px;font-size:11px;line-height:16px;color:var(--dsw-alias-state-error-primary);}
`;

    function PencilIcon() {
      return h('svg', {
        viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor',
        strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
      },
        h('path', { d: 'M11.3 2.3a1.6 1.6 0 0 1 2.3 2.3L5.4 12.8 2 14l1.2-3.4z' }),
        h('path', { d: 'M9.8 3.8l2.3 2.3' }),
      );
    }
    function CheckIcon() {
      return h('span', { className: 'dmp-check' },
        h('svg', { viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
          h('path', { d: 'M3 8.5l3.2 3.2L13 5' })));
    }
    function Badge({ badge, resolveText }) {
      const tone = badge.tone === 'info' ? 'Info' : badge.tone === 'success' ? 'Success' : badge.tone === 'warning' ? 'Warning' : 'Neutral';
      return h('span', { className: 'dmp-badge dmp-badge' + tone }, resolveText(badge.text));
    }

    /* ---------- flyout panel beside the model list ---------- */
    function Panel({ providerId, model, directory, form, ownForm, t, anchorRect, onClose }) {
      const state = useSyncExternalStore(fn => directory.store.subscribe(fn), () => directory.store.getSnapshot());
      const formSnap = useSyncExternalStore(fn => form.subscribe(fn), () => form.getSnapshot());
      const panelRef = useRef(null);
      const [pos, setPos] = useState(null);
      const [msg, setMsg] = useState(null);
      const [saving, setSaving] = useState(false);

      const current = state.current;
      const isCurrent = current !== null && current.provider === providerId && current.model === model.id;
      const catalogModel = useMemo(() => {
        const group = state.groups.find(g => g.id === providerId);
        return group && group.models.find(m => m.id === model.id);
      }, [state.groups, providerId, model.id]);
      const reasoning = catalogModel && catalogModel.reasoning;
      const efforts = (reasoning && reasoning.efforts) || [];
      const hasOff = efforts.some(e => e.id === 'off');
      const busy = state.status === 'selecting';

      const providers = formSnap.value && formSnap.value.providers;
      const profile = isRecord(providers) ? providers[providerId] : undefined;
      const capEditable = formSnap.status === 'ready' && formSnap.writable && isRecord(profile);
      const entry = capEditable && Array.isArray(profile.models)
        ? profile.models.find(m => isRecord(m) && m.id === model.id)
        : undefined;
      const explicitlyDisabled = entry !== undefined && entry.reasoningEfforts === false;

      // pi-ai sends the system prompt as `developer` for reasoning models on
      // endpoints outside its non-standard table (e.g. Bailian), which those
      // endpoints reject with a 400. Thinking writes are only offered on
      // table-listed endpoints or when the user explicitly fixed the role.
      const SAFE_BASEURL = /api\.z\.ai|open\.bigmodel\.cn|deepseek\.com|api\.moonshot\.|api\.together\.(ai|xyz)|api\.x\.ai|chutes\.ai|integrate\.api\.nvidia\.com|cerebras\.ai|opencode\.ai|api\.cloudflare\.com|gateway\.ai\.cloudflare\.com|api\.ant-ling\.com/i;
      const SAFE_PROVIDERS = ['zai', 'zai-coding-cn', 'deepseek', 'moonshotai', 'moonshotai-cn', 'together', 'xai', 'nvidia', 'cerebras', 'opencode', 'cloudflare-workers-ai', 'cloudflare-ai-gateway', 'ant-ling'];
      const baseUrl = profile && typeof profile.baseURL === 'string' ? profile.baseURL : '';
      const roleSafe = SAFE_PROVIDERS.includes(providerId)
        || SAFE_BASEURL.test(baseUrl)
        || (entry !== undefined && isRecord(entry.compat) && entry.compat.supportsDeveloperRole === false);
      // Bailian/DashScope: off must ship `none` (maps to enable_thinking=false);
      // canonical low/medium/high/xhigh/max are native or server-mapped values.
      const isBailian = /aliyuncs\.com|dashscope/i.test(baseUrl);

      const displayedEffort = isCurrent
        ? (current.reasoningEffort ?? (reasoning && reasoning.defaultEffort))
        : (reasoning && reasoning.defaultEffort);
      const toggleOn = reasoning !== undefined ? displayedEffort !== 'off' : !explicitlyDisabled;
      const selectedLevel = reasoning !== undefined
        ? (displayedEffort !== undefined && displayedEffort !== 'off' ? displayedEffort : 'high')
        : 'high';
      const levelChoices = useMemo(() => {
        const extra = efforts.map(e => e.id).filter(id => id !== 'off' && !LEVEL_CHOICES.includes(id));
        return LEVEL_CHOICES.concat(extra);
      }, [efforts]);
      const contextActive = positiveInteger(entry && entry.contextWindow);
      const inheritContext = positiveInteger(profile && profile.defaultContextWindow) ?? DEFAULT_CONTEXT_WINDOW;

      /* Position beside the clicked row; guards keep the host menu open while
         focus/clicks land in this body-portaled panel. */
      useLayoutEffect(() => {
        const el = panelRef.current;
        if (el === null) return;
        const guardClick = (event) => {
          if (panelRef.current !== null && panelRef.current.contains(event.target)) event.stopPropagation();
        };
        const guardFocus = (event) => {
          if (panelRef.current !== null && event.relatedTarget instanceof Node && panelRef.current.contains(event.relatedTarget)) {
            event.stopPropagation();
          }
        };
        const outside = (event) => {
          if (panelRef.current !== null && !panelRef.current.contains(event.target)) onClose();
        };
        document.addEventListener('mousedown', guardClick, true);
        document.addEventListener('focusout', guardFocus, true);
        document.addEventListener('mousedown', outside);
        const w = el.offsetWidth;
        const hh = el.offsetHeight;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        let left = anchorRect.right + 6;
        if (left + w > vw - 8) left = Math.max(8, anchorRect.left - w - 6);
        const top = Math.min(Math.max(8, anchorRect.top - 4), Math.max(8, vh - hh - 8));
        setPos({ left, top });
        const first = el.querySelector('button:not([disabled])');
        if (first !== null) first.focus();
        return () => {
          document.removeEventListener('mousedown', guardClick, true);
          document.removeEventListener('focusout', guardFocus, true);
          document.removeEventListener('mousedown', outside);
        };
      }, [anchorRect, onClose]);

      function fail(text) { setMsg({ kind: 'error', text }); }

      /** Presence-aware snapshot of the plugin-managed fields. */
      function fieldsSnapshot(entry) {
        const source = isRecord(entry) ? entry : {};
        return {
          cwPresent: Object.prototype.hasOwnProperty.call(source, 'contextWindow'),
          cw: source.contextWindow,
          rePresent: Object.prototype.hasOwnProperty.call(source, 'reasoningEfforts'),
          re: source.reasoningEfforts,
          compatPresent: Object.prototype.hasOwnProperty.call(source, 'compat'),
          compat: source.compat,
        };
      }

      /**
       * One journaled model-config write: record original + intended values in
       * the plugin's own settings namespace FIRST (the Host half rolls them
       * back on uninstall), then apply the llm-pi-ai change.
       */
      async function applyModelWrite(transform) {
        // Keep focus on the panel container: the write disables the rows, and
        // a focused row that becomes disabled drops focus to body, which the
        // host menu's blur guard reads as "leave" and closes the whole menu.
        if (panelRef.current !== null) panelRef.current.focus();
        // Read the freshest llm snapshot: consecutive writes in one action
        // (role fix + level declaration) must not clobber each other.
        const liveSnap = form.getSnapshot();
        const liveProviders = liveSnap.value && liveSnap.value.providers;
        const liveProfile = isRecord(liveProviders) ? liveProviders[providerId] : undefined;
        const liveEditable = liveSnap.status === 'ready' && liveSnap.writable && isRecord(liveProfile);
        if (!liveEditable) { fail(liveSnap.writable ? t('panel.noProvider') : t('panel.readonly')); return false; }
        const ownSnap = ownForm.getSnapshot();
        if (ownSnap.status !== 'ready' || !ownSnap.writable) { fail(t('panel.readonly')); return false; }
        const existingModels = Array.isArray(liveProfile.models) ? liveProfile.models : [];
        const raw = existingModels.find(m => isRecord(m) && m.id === model.id);
        const next = transform(isRecord(raw) ? { ...raw } : { id: model.id });
        const journal = (ownSnap.value && isRecord(ownSnap.value.journal)) ? ownSnap.value.journal : {};
        const key = providerId + '/' + model.id;
        let record = null;
        try { record = journal[key] !== undefined ? JSON.parse(journal[key]) : null; } catch { record = null; }
        if (!isRecord(record) || !isRecord(record.orig)) {
          record = { entryPresent: isRecord(raw), orig: fieldsSnapshot(raw), wrote: null };
        }
        record.wrote = fieldsSnapshot(next);
        setSaving(true);
        setMsg(null);
        try {
          const journaled = await ownForm.mutate(
            [{ op: 'set', path: ['journal', key], value: JSON.stringify(record) }],
            ownSnap.revision,
          );
          if (!journaled) { fail(t('panel.refused')); return false; }
          let found = false;
          const nextModels = existingModels.map(m => {
            if (isRecord(m) && m.id === model.id) { found = true; return next; }
            return m;
          });
          if (!found) nextModels.push(next);
          const accepted = await form.mutate(
            [{ op: 'set', path: ['providers', providerId, 'models'], value: JSON.parse(JSON.stringify(nextModels)) }],
            liveSnap.revision,
          );
          if (!accepted) { fail(t('panel.refused')); return false; }
          return true;
        } catch (error) {
          fail(error instanceof Error ? error.message : String(error));
          return false;
        } finally {
          setSaving(false);
        }
      }

      async function chooseContext(value) {
        await applyModelWrite(next => {
          delete next.contextWindow;
          if (value !== null) next.contextWindow = value;
          return next;
        });
      }

      async function selectEffort(effort) {
        if (panelRef.current !== null) panelRef.current.focus();
        setMsg(null);
        try {
          const result = await directory.select({ provider: providerId, model: model.id, reasoningEffort: effort });
          if (!result.ok) fail(result.error.message);
        } catch (error) {
          fail(error instanceof Error ? error.message : String(error));
        }
      }

      /** Ensure the config declares the given levels; returns false on write failure. */
      async function ensureLevels(needLevels, includeOff) {
        const live = form.getSnapshot();
        const liveProviders = live.value && live.value.providers;
        const liveProfile = isRecord(liveProviders) ? liveProviders[providerId] : undefined;
        if (live.status !== 'ready' || !live.writable || !isRecord(liveProfile)) {
          fail(live.writable ? t('panel.noProvider') : t('panel.readonly'));
          return false;
        }
        const liveEntry = Array.isArray(liveProfile.models)
          ? liveProfile.models.find(m => isRecord(m) && m.id === model.id)
          : undefined;
        const existing = liveEntry && liveEntry.reasoningEfforts;
        const merged = mergedEfforts(existing, needLevels, includeOff, isBailian ? 'none' : null);
        if (existing !== false && isRecord(existing) && sameWire(merged, existing)) return true;
        return applyModelWrite(next => { next.reasoningEfforts = merged; return next; });
      }

      /**
       * Endpoints outside pi-ai's non-standard table reject the developer role
       * pi-ai uses for reasoning models. Fix it in the model config before any
       * thinking write — automatically, no manual setup.
       */
      async function ensureRoleSafe() {
        if (roleSafe) return true;
        return applyModelWrite(next => {
          next.compat = { ...(isRecord(next.compat) ? next.compat : {}), supportsDeveloperRole: false };
          return next;
        });
      }

      async function turnOn() {
        if (!await ensureRoleSafe()) return;
        const target = LEVEL_CHOICES.includes(selectedLevel) ? selectedLevel : 'high';
        if (reasoning === undefined || explicitlyDisabled) {
          const ok = await ensureLevels(new Set(LEVEL_CHOICES), true);
          if (!ok) return;
        } else if (!efforts.some(e => e.id === target)) {
          const ok = await ensureLevels(new Set([target]), true);
          if (!ok) return;
        }
        await selectEffort(target);
      }
      async function turnOff() {
        if (!await ensureRoleSafe()) return;
        if (reasoning !== undefined) {
          if (!hasOff) {
            const ok = await ensureLevels(new Set(), true);
            if (!ok) return;
          }
          await selectEffort('off');
          return;
        }
        await applyModelWrite(next => { next.reasoningEfforts = false; return next; });
      }
      async function chooseLevel(level) {
        if (!await ensureRoleSafe()) return;
        if (reasoning === undefined || explicitlyDisabled || !efforts.some(e => e.id === level)) {
          const ok = await ensureLevels(new Set([level]), true);
          if (!ok) return;
        }
        await selectEffort(level);
      }

      function onPanelKeyDown(event) {
        event.stopPropagation();
        if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
        const el = panelRef.current;
        if (el === null) return;
        const rows = Array.from(el.querySelectorAll('button:not([disabled])'));
        if (event.key === 'Tab') {
          event.preventDefault();
          if (rows.length === 0) return;
          const at = rows.indexOf(document.activeElement);
          const next = event.shiftKey
            ? (at <= 0 ? rows.length - 1 : at - 1)
            : (at === -1 || at === rows.length - 1 ? 0 : at + 1);
          rows[next].focus();
          return;
        }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          if (rows.length === 0) return;
          const at = rows.indexOf(document.activeElement);
          const next = event.key === 'ArrowDown'
            ? (at === -1 ? 0 : (at + 1) % rows.length)
            : (at <= 0 ? rows.length - 1 : at - 1);
          rows[next].focus();
        }
      }

      const contextRows = CONTEXT_PRESETS.map(preset => ({ key: String(preset.value), label: preset.label, value: preset.value }));
      if (contextActive !== undefined && !CONTEXT_PRESETS.some(p => p.value === contextActive)) {
        contextRows.push({ key: 'custom', label: formatCapacity(contextActive), value: contextActive });
      }

      return createPortal(
        h('div', {
          className: 'dmp-panel',
          role: 'menu',
          'aria-label': t('panel.aria'),
          ref: panelRef,
          tabIndex: -1,
          style: pos === null
            ? { left: anchorRect.right + 6, top: anchorRect.top, visibility: 'hidden' }
            : { left: pos.left, top: pos.top },
          onKeyDown: onPanelKeyDown,
          // The panel's React parent is the host model row button; without
          // this, every panel click bubbles into the row's onClick and the
          // host treats it as a model selection, closing the whole menu.
          onClick: (event) => { event.stopPropagation(); },
        },
          h('style', null, PANEL_CSS),
          h('p', { className: 'dmp-panelTitle' }, (catalogModel ? catalogModel.name : model.name) + ' · ' + providerId),
          h('p', { className: 'dmp-sectionLabel' }, t('panel.context')),
          h('button', {
            type: 'button', role: 'menuitemradio', 'aria-checked': contextActive === undefined,
            className: 'dmp-row', disabled: saving || busy,
            onClick: () => { void chooseContext(null); },
          },
            contextActive === undefined ? h(CheckIcon) : h('span', { className: 'dmp-checkEmpty' }),
            h('span', { className: 'dmp-rowLabel' }, t('panel.contextDefault')),
            h('span', { className: 'dmp-rowHint' }, formatCapacity(inheritContext)),
          ),
          contextRows.map(row => h('button', {
            key: row.key,
            type: 'button', role: 'menuitemradio', 'aria-checked': contextActive === row.value,
            className: 'dmp-row', disabled: saving || busy,
            onClick: () => { void chooseContext(row.value); },
          },
            contextActive === row.value ? h(CheckIcon) : h('span', { className: 'dmp-checkEmpty' }),
            h('span', { className: 'dmp-rowLabel' }, row.label),
          )),
          !capEditable ? h('p', { className: 'dmp-hint' }, formSnap.writable ? t('panel.noProvider') : t('panel.readonly')) : null,
          h('div', { className: 'dmp-divider' }),
          h('p', { className: 'dmp-sectionLabel' }, t('panel.thinking')),
          h('button', {
            type: 'button', role: 'switch', 'aria-checked': toggleOn,
            className: 'dmp-row', disabled: saving || busy,
            onClick: () => { void (toggleOn ? turnOff() : turnOn()); },
          },
            h('span', { className: 'dmp-rowLabel' }, t('panel.thinkingSwitch')),
            h('span', { className: 'dmp-switch', 'aria-hidden': true, tabIndex: -1 }, h('span', { className: 'dmp-knob' })),
          ),
          toggleOn ? levelChoices.map(level => h('button', {
            key: level,
            type: 'button', role: 'menuitemradio', 'aria-checked': selectedLevel === level,
            className: 'dmp-row', disabled: saving || busy,
            onClick: () => { void chooseLevel(level); },
          },
            selectedLevel === level ? h(CheckIcon) : h('span', { className: 'dmp-checkEmpty' }),
            h('span', { className: 'dmp-rowLabel' }, t('level.' + level)),
            h('span', { className: 'dmp-rowHint' }, level),
          )) : null,
          reasoning === undefined && capEditable && !explicitlyDisabled
            ? h('p', { className: 'dmp-hint' }, t('panel.willDeclare'))
            : null,
          busy || saving ? h('p', { className: 'dmp-hint' }, t('panel.busy')) : null,
          msg === null ? null : h('p', { className: 'dmp-error', role: 'alert' }, msg.text),
        ),
        document.body,
      );
    }

    /* ---------- model label with per-row edit affordance ---------- */
    function ModelLabel({ provider, model, placement, t, directory, form, ownForm, resolveText }) {
      const [open, setOpen] = useState(false);
      const [rect, setRect] = useState(null);
      const editRef = useRef(null);
      const showEdit = placement === 'option';
      const name = h('span', { className: 'dmp-name' }, model.name);
      const badge = model.badge === undefined ? null : h(Badge, { badge: model.badge, resolveText });
      // Stable identity: the panel's positioning/guard effect must not re-run
      // (and steal focus) on unrelated menu re-renders. Restore focus to the
      // edit affordance first so the host menu's blur guard keeps it open.
      const close = useCallback(() => {
        if (editRef.current !== null) editRef.current.focus();
        setOpen(false);
      }, []);
      return h(React.Fragment, null,
        h('style', null, LABEL_CSS),
        h('span', { className: 'dmp-label' },
          placement === 'trigger' ? [badge, name] : [name, badge],
          showEdit ? h('span', {
            ref: editRef,
            role: 'button',
            tabIndex: 0,
            className: 'dmp-edit',
            'aria-label': t('edit.aria'),
            onClick: (event) => {
              event.stopPropagation();
              if (editRef.current !== null) setRect(editRef.current.getBoundingClientRect());
              setOpen(true);
            },
            onKeyDown: (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                event.stopPropagation();
                if (editRef.current !== null) setRect(editRef.current.getBoundingClientRect());
                setOpen(true);
              }
            },
          }, h(PencilIcon)) : null,
        ),
        open && rect !== null ? h(Panel, {
          providerId: provider.id,
          model,
          directory,
          form,
          ownForm,
          t,
          anchorRect: rect,
          onClose: close,
        }) : null,
      );
    }

    return {
      inject: ['slots', 'locale', 'configForms', 'modelDirectories'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-model-params: dictionaries');
        ctx.slots.inject('conversation.input.model.label', () => ctx.slots.register({
          name: 'conversation.input.model.label',
          locale: NS,
          inject: sessionId => ({
            directory: ctx.modelDirectories.directoryFor(sessionId),
            form: ctx.configForms.get(SETTINGS_ENTRY),
            ownForm: ctx.configForms.get(NS),
            resolveText: text => ctx.locale.resolveText(text),
          }),
        }, ModelLabel));
      },
    };
  },
});