# dsh-image-workbench · P1 / P2 / P3

DSH 面板插件：左栏「图像风格」打开 1120 宽工作台。P1 做本机风格与工作流，P2 加模板文字、单版参数、原图导出、ZIP 打包与持久历史；P3 云端 H3 已接入：保存 API Key 后启用（按量、国内站），画质 1K/2K/4K 可选，费用/预算/隐私确认与 unknown 状态已接。

源码：`~/Code/dsh-image-workbench`（git）。安装：`plugin_manager install_bundle` 指向本目录；已安装时对 `include:image-workbench` 禁用再启用可重载 Host。

## 结构

- `index.js`：Host 路由与设置；P2 资产/批次/历史/导出；P3 云端路由（`config.cloudEnabled` 才开启）。
- `lib/storage.js`：`~/Data/dsh-image-workbench/{library,outputs}`、sha256 去重、`index.jsonl`、历史/删除。
- `lib/zip.js`：无依赖 store-mode ZIP；`lib/minimax.js` / `jobs.js` / `budget.js` / `ledger.js` / `cloud.js`：P3 provider/队列/预算/账本。
- `client.js`：React 外壳 + 单页控制器；6 个本机风格，印刷海报支持「海报 / 卡片」两种模板版式；参数支持「共用 / 当前风格」；原图导出；ZIP；历史。
- `assets/sample.jpg`：示例静物；`docs/DETAIL.md`：插件详情；`tests/`：Host 测试。

## Host 路由（全部经过 `connection.requestRejection`）

- P1：`GET/POST /settings`、`GET /sample`、`POST /test`、`GET /health`
- P2：`POST /assets`、`GET /asset/:id`、`POST /batches`、`GET /history?limit=20`、`DELETE /batch/:id`、`GET /result/:batch/:style.jpg`、`POST /export`、`GET /storage`
- P3（保存 Key 后启用）：`POST /cloud/jobs`、`GET /cloud/jobs/:id`、`POST /cloud/key-test`（如实 501，不伪造）、`GET /usage`

## 数据与隐私

- 配置：`~/Data/dsh-image-workbench/config.json`（0600）：尺寸、预算、隐私、P3 云端参数。
- 原图/结果：`~/Data/dsh-image-workbench/library/<sha16>/`、`outputs/<batchId>/`；`index.jsonl` 追加索引。
- API Key：DSH credentials 记录 `dsh-image-workbench/minimax`，只显示尾号；保存 Key 后 Host 自动打开云端（按量 · 国内站）。
- 历史：Host 优先；Host 不可用时回落浏览器 `localStorage`（最多 3 批）。

## 验证

- `node --test tests/`：12 pass / 0 fail（设置与 401、资产去重/路径穿越、批次 text 对象 + frame、历史/删除/损坏索引、ZIP + unzip、P3 开关、key-test 诚实、jobs unknown 不重试、预算/账本、mock MiniMax provider）。
- 客户端：1120×860、1000、900 宽 harness 验证空态、模板、参数作用域、原图下载、ZIP、Host 历史、A/B、夜版。
- DSH 内：路由 `/image-workbench/{health,storage,history,assets}` 均返回插件的 401 JSON，说明 Host 已加载；带页面会话的真实点击仍需刷新页面验收。

## 已知限制

- 真实 DSH 页面视觉/下载落盘尚未在本 shell 验收（桌面端 auth token 拿不到）。
- P3 已接云端 UI（2K/1K/4K、预估费用、预算/隐私确认、partial failure、unknown 不重试）；没有在这个 shell 里用真实 Key 做 live 调用（需要你在设置里填入 Key 后点生成验证）。
- 云端 job 在内存，重启丢失状态；账本只记成功；没有取消/清理路由。
- 结果只接受 JPEG；原图 JPEG/PNG/WebP ≤20 MB；ZIP ≤80 MB。
