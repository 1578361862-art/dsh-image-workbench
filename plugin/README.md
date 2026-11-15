# dsh-image-workbench · P1–P5

DSH 面板插件：左栏「图像风格」打开 1120 宽工作台。P1 做本机风格与工作流，P2 加模板文字、单版参数、原图导出、ZIP 打包与持久历史；P3 云端 H3 已验证；P4 增加 Agent 工具、批量矩阵、现有风格库展示/移除/恢复、Context-IR 预览；P5 增加 90 天清理、云端失败重试、真实页面验收与 4K 价格提示；顶部「最近生成」菜单展示全部历史，点击直接看大图，不恢复工作台；工作台整合图片编辑/文生图：先选风格，再决定是否上传图片；不传图走文生图，图片编辑后可在结果大图里多轮编辑；模型 H3 / Seedream 5.5 可在生成时切换。设置精简为「模型与密钥 / 输出与隐私 / 风格库管理」，只保留 Key；Seedream 固定 5.5；预算与显式费用确认弹窗已移除，价格只在生成按钮旁显示一次。批量矩阵入口已移除；图片上传支持多张，可选「每张轮询」或「场景组合」（场景组合会先把多张图合成为一张参考板再生成）。工作台模板文字面板已移除。多选云端风格时提示词面板显示可点击的风格标签；提示词修改直接用于生成，不再需要保存；每个风格/模型在本次页面内独立，刷新恢复默认；H3 与 Seedream 5.5 使用不同的提示词模板，见 docs/PROMPT-SPECS.md。Seedream 5.5 增加图层拆分选项、区域描述和多轮编辑；MiniMax/Seedream 使用不同的提示词规范，见 docs/PROMPT-SPECS.md。云端风格扩到 29 个：21 个归纳自 MiniMax-H3-Image 官方 showcase，7 个从用户提供的图文参考提炼（生成时把示例图作为图2风格参考），1 个来自用户提供的金石印谱提示词（固定 3:4 输出），见 `docs/CLOUD-STYLES.md` 与 `docs/PROMPT-INSPIRATIONS.md`。

源码：`~/Code/dsh-image-workbench`（git）。安装：`plugin_manager install_bundle` 指向本目录；已安装时对 `include:image-workbench` 禁用再启用可重载 Host。

## 结构

- `index.js`：Host 路由与设置；P2 资产/批次/历史/导出；P3 云端路由（`config.cloudEnabled` 才开启）。
- `lib/storage.js`：`~/Data/dsh-image-workbench/{library,outputs,styles,jobs}`、sha256 去重、`index.jsonl`、历史/删除/90 天清理。
- `lib/zip.js`：无依赖 store-mode ZIP；`lib/minimax.js` / `jobs.js` / `budget.js` / `ledger.js` / `cloud.js`：P3 provider/队列/预算/账本。
- `client.js`：React 外壳 + 单页控制器；6 个本机风格 + 11 个云端 H3 风格，印刷海报支持「海报 / 卡片」两种模板版式；参数支持「共用 / 当前风格」；原图导出；ZIP；历史。
- `assets/sample.jpg`：示例静物；`assets/style-previews/`：风格库官方示例缩略图（h3-illus/h3-silver 为实际 H3 输出）；`docs/DETAIL.md`：插件详情；`tests/`：Host 测试。

## Host 路由（全部经过 `connection.requestRejection`）

- P1：`GET/POST /settings`、`GET /sample`、`POST /test`、`GET /health`
- P2：`POST /assets`、`GET /asset/:id`、`POST /batches`、`GET /history?limit=20`、`DELETE /batch/:id`、`GET /result/:batch/:style.jpg`、`POST /export`、`GET /storage`、`POST /cleanup`
- P4：`GET/POST /styles`；P4.4：`POST /cloud/context-ir`
- P3（保存 Key 后启用）：`POST /cloud/jobs`、`GET /cloud/jobs/:id`、`POST /cloud/jobs/:id/cancel`、`POST /cloud/key-test`（如实 501，不伪造）、`GET /usage`
- 云端风格：`h3-illus / h3-silver / h3-oil / h3-impression / h3-manuscript / h3-dunhuang / h3-gongbi / h3-collage / h3-pixel / h3-film / h3-concept / h3-shadow / h3-eastern / h3-oldphone / h3-flashfilm / h3-dv / h3-sticker / h3-sheet / h3-infographic / h3-cad / h3-surreal`；prompt 摘要见 `docs/CLOUD-STYLES.md`
- P5：`POST /cleanup`（90 天）、失败重试走客户端重发 cloud job

## 数据与隐私

- 配置：`~/Data/dsh-image-workbench/config.json`（0600）：尺寸、预算、隐私、P3 云端参数。
- 原图/结果：`~/Data/dsh-image-workbench/library/<sha16>/`、`outputs/<batchId>/`；`index.jsonl` 追加索引。
- API Key：DSH credentials 记录 `dsh-image-workbench/minimax`，只显示尾号；保存 Key 后 Host 自动打开云端（按量 · 国内站）。
- 历史：Host 优先；Host 不可用时回落浏览器 `localStorage`（最多 3 批）。

## 验证

- `node --test tests/`：16 pass / 0 fail（设置与 401、资产去重/路径穿越、批次 text 对象 + frame、历史/删除/损坏索引、ZIP + unzip、P3 开关、key-test 诚实、jobs unknown 不重试、预算/账本、mock MiniMax provider）。
- 客户端：1120×860、1000、900 宽 harness 验证空态、模板、参数作用域、原图下载、ZIP、Host 历史、A/B、夜版。
- DSH 内：带页面会话的真实侧栏/历史/设置/单张下载/ZIP 已验收；真实页面无 pageerror。

## P4 限制

- 矩阵只做本机风格（最多 4 图），云端矩阵未开，避免一次误扣多张。
- 风格包只支持 `renderer=preset`（复用内置本机 renderer + params），不支持任意 HTML/JS 渲染器。
- Agent 工具只支持云端 H3；本机 Canvas 风格需在页面工作台操作。

## 已知限制

- 真实 DSH 页面（侧栏/历史/设置/单张下载/ZIP）已用登录态 Playwright 实测；拖/粘、本机 3/4、A/B、夜版、1024/900 真机仍待验。
- P3 真实 Key 已验证：2026-11-13 H3 插画化 2K 成功（1888×2240），结果已发邮件。P4：Agent 工具 `image_workbench`（cloud estimate/start/status）、批量矩阵（本机，最多 4 图）、preset 风格包导入、Context-IR 预览。
- 云端 job 快照持久化（重启时 running/queued 转 unknown/failed，不自动重试）；成功结果自动写 host index；有 cancel 路由；账本只记成功；90 天清理已做。
- 结果只接受 JPEG；原图 JPEG/PNG/WebP ≤20 MB；ZIP ≤80 MB。


## 最近生成与存储

- 正常 H3 / Seedream 出图会保存到本机 `~/Data/dsh-image-workbench/outputs/<job-id>/`，并写入 `index.jsonl`；最近页面使用 `/image-workbench/result/...` 本地地址。
- Seedream 图层拆分的返回结果是远端 PNG URL，当前不落盘，可能过期。
- 最近卡片的图标操作包括：赞、踩、收藏、多轮编辑、下载、归档。
- 归档是本机 UI 归档（localStorage），只从最近列表隐藏，不复制、不删除文件；继续受 90 天清理规则影响。


## Seedream 官方示例风格

风格库新增 4 个 Seedream 官方示例风格（官方示例图作预览）：时尚墨镜、动物绘本、亚克力立牌、贴纸拼版。预览图来自火山方舟 Seedream 5.5 文档示例，提示词按工作台的云端编辑流程重写。


## 0.36.9 能力补全

- 场景组合改为原生多参考图：H3 传多个 assetId，Seedream 传 imageDataUrls 数组；不再拼参考板。
- Seedream 图层拆分结果落盘到 `outputs/<layer-id>/`，可在弹窗直接打包 ZIP；max_images 可调，OCR 文本作为图层提示。
- 区域框选：在编辑图上拖出红框，生成时把红框烧进输入并明确要求只改框内、去掉红框。
- 归档改为 Host 历史行 `archived` 标记，跨刷新保留；清理任务跳过已归档历史。
- Seedream 费用写入同一 ledger，最近记录带 costYuan。


## 0.36.10

- 原生多参考图：H3 多 assetId / Seedream 多 imageDataUrls，场景组合不再拼图。
- Seedream 图层落盘 + 可调 max_images + ZIP + OCR 提示。
- 编辑区域红框：把框烧进输入图，并要求只改框内、去掉红框。
- 归档迁到 Host 历史行，刷新/重启保持，清理跳过归档。
- Seedream 费用写入 ledger，最近记录带 costYuan。
- 移除遗留的矩阵批量代码。
