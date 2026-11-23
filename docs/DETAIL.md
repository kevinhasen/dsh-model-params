# 模型参数编辑（dsh-model-params）

在 DSH 模型列表里直接编辑每个模型的参数，交互类似 Qoder：不弹模态窗，而是在列表旁展开一个参数面板。**插件写入的每一项配置都有日志，卸载插件时自动回滚。**

## 功能

- 模型按钮 → 模型列表：每个模型名右侧有一个铅笔编辑按钮。
- 点击编辑按钮，在当前列表旁展开参数面板（点外部 / Escape 关闭）：
  - **上下文**：默认（继承）/ 128K / 256K / 512K / 1M 预设，点选即写入 `llm-pi-ai` 提供方配置（K=1000，M=1000000，与官方设置页一致）；已配置的自定义值作为额外行显示。
  - **思考模式**：开关默认打开（绿色=开，灰色=关）；打开时下方显示 low / medium / high / xhigh / max 档位（默认选中 high），点选即应用到本会话。
- 未声明思考档位的模型：面板按「开 + high」显示默认提案，点击开关或档位会自动把档位声明写入模型配置（保留已有自定义线端值），随后应用到会话。

## 百炼自动兼容（v0.4.0）

pi-ai 对「推理模型 + 标准 OpenAI 兼容端点」会把系统提示改用 `developer` 角色发送，百炼等端点只接受 system/assistant/user/tool/function，会返回 400。插件在思考写入前**自动**完成兼容配置，无需手动设置：

- 检测到百炼/DashScope 端点（baseURL 含 aliyuncs.com / dashscope）时，自动给模型写入 `compat.supportsDeveloperRole: false`（保留其他 compat 字段）。
- 档位线端值按[百炼 OpenAI 兼容文档](https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-chat-completions)：`off: none`（映射为关闭思考），low/medium/high/xhigh/max 为原生或服务端映射值（qwen3.8 系列 high/max→xhigh；qwen4-max medium/high→high、xhigh/max→xhigh）。
- 其他表外端点同样自动补 `supportsDeveloperRole: false`，档位用规范名（off 为空）。
- GLM（open.bigmodel.cn，pi-ai 识别为 zai）、DeepSeek、Moonshot 等表内端点无需任何兼容写入。
- 上下文预设写入不涉及 reasoning，对所有自定义提供方安全。

## 卸载回滚

- 每次写入前，插件把「原始值 + 写入值」记入自己的配置日志（`journal`，持久化在 profile 补丁层本插件名下），覆盖 `contextWindow` / `reasoningEfforts` / `compat` 三个字段。
- **卸载插件时**（条目离开 Loader 组合），Host 侧 dispose 钩子按日志还原；插件创建的模型条目若字段全部还原则整条删除。
- 只回滚「当前值仍等于插件写入值」的字段——你后来在设置页手动改过的值不会被覆盖。
- **禁用插件或退出应用不会回滚**（条目仍在组合里）；重新启用后日志继续有效。

## 限制

- 配置写入仅适用于 `llm-pi-ai` 自定义提供方路由；官方账号模型显示只读提示。
- 编辑按钮经官方 `conversation.input.model.label` 扩展位渲染，面板为 body 端口浮层，不替换官方选择器本体。
- 仅 Web/桌面对话界面；需要 profile 组合了设置页（configForms）与模型选择插件。

---

# Model parameter editor (dsh-model-params)

Edit per-model parameters directly in the DSH model list, Qoder-style: a flyout panel opens beside the list, no modal. **Every config write is journaled and rolled back when the plugin is uninstalled.**

## Features

- Pencil edit button beside each model name in the model list.
- Flyout panel (outside click / Escape closes): context presets Default/128K/256K/512K/1M written to the `llm-pi-ai` provider config on click; thinking toggle (default on, green=on) with low/medium/high/xhigh/max levels (default high) applied to the session on click.
- Models without declared levels show the on+high proposal; clicking writes the level declarations (preserving custom wire values) then applies the session selection.

## Automatic Bailian compatibility (v0.4.0)

pi-ai sends the system prompt as `developer` for reasoning models on endpoints outside its non-standard table; Bailian-style endpoints reject that role (400). Before any thinking write the plugin automatically:

- Writes `compat.supportsDeveloperRole: false` on Bailian/DashScope endpoints (baseURL matching aliyuncs.com / dashscope) and other non-table endpoints, preserving other compat fields.
- Uses Bailian wire values per the [DashScope OpenAI-compatible docs](https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-chat-completions): `off: none` (thinking disabled), canonical low/medium/high/xhigh/max (native or server-mapped: qwen3.8 high/max→xhigh; qwen4-max medium/high→high, xhigh/max→xhigh).
- Table-listed endpoints (GLM/bigmodel=zai, DeepSeek, Moonshot, …) need no compatibility writes.
- Context presets never touch reasoning and are safe on every custom provider.

## Uninstall rollback

- Before each write, original + written values are recorded in the plugin's own volatile `journal` config (persisted in the profile patch under the plugin's row), covering `contextWindow` / `reasoningEfforts` / `compat`.
- On uninstall (the entry leaves the Loader composition), the Host dispose hook restores them; entries the plugin created are removed when all fields roll back to absent.
- Only fields whose current value still equals the plugin-written value are restored — later manual edits are never clobbered.
- Disabling the plugin or quitting the app does NOT roll back; re-enabling keeps the journal.

## Limits

- Config writes apply only to custom pi-ai provider routes; account providers are read-only here.
- The edit button renders through the official `conversation.input.model.label` seat; the panel is a body portal and does not replace the shipped selector.
- Web/Desktop conversation UI only; requires the settings (configForms) and model-selection plugins in the profile.