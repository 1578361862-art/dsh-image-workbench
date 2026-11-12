# 图像风格工作台 · 剩余待办

> 2026-11-13 · 当前安装：`dsh-image-workbench` 0.1.0（desktop profile，左栏「图像风格」）
> 源码：`plugin/`；设计：[DESIGN.md](DESIGN.md)；真机截图：[shots/](shots/)

## 0. 现在到哪一步

P1 的**功能代码**已完成并在 DSH 里注册：

- 左栏入口 + 1120 宽中央页；空态拖/粘/选文件/示例图。
- 6 个本机风格（长边 640/960/1200），多选、共用参数、试印、A/B、单张下载、最近 3 次历史。
- 设置抽屉：本机尺寸/隐私；P3 云端 Key 可先存（credentials），P3 配置折叠且禁用。
- Host：`/image-workbench/settings`、`/sample`、`/test`、`/health`；config 0600。

**但 P1 还有 3 类没闭环**：真实 DSH 页面验收、窄宽度/下载等真实浏览器行为、代码归位与测试入库。

---

## 1. P1 收尾（建议先做，0.5–1 天）

### 1.1 真浏览器验收（最高优先）
- [ ] 刷新 DSH Web GUI，打开「图像风格」，确认空态、示例图、6 个缩略图正常。
- [ ] 走通：拖图 → 选 3/4 个 → 生成 → 逐张「下载」→ 刷新 → 历史恢复。
- [ ] 粘贴 `⌘V`、页面任意位置拖入、`换一张` 三个入口都试一次。
- [ ] 设置：保存 Key、刷新后尾号还在、保存预算/尺寸、关闭/重开抽屉不丢。
- [ ] A/B：鼠标拖分界 + `←/→` 键；夜版切换；控制台无 slot 报错。
- [ ] 记录窄窗口（1280/1024/900）下的实际主区宽度和溢出点。
- 验收方式：用户手动跑一遍，或提供一个带登录态的页面给 `dsh_verify` 跑 spec；当前 shell 拿不到桌面端 auth token，不能替代。

### 1.2 窄宽度适配
- [ ] 现在 `.work` 固定 `228px / 1fr / 224px`，主区 <1120 时舞台和检查器会挤。
- [ ] 加 `@media (max-width: 1080px)`：228px 风格栏保留，检查器移到舞台下方两列；`@media (max-width: 900px)`：风格栏横向滚动或抽屉。
- [ ] 验收：1024/900 宽下不横向溢出，`生成` 按钮始终可见。

### 1.3 下载与 Electron 行为
- [ ] 在 DSH 桌面 webview 里点单张「下载」，确认真实落盘/弹保存框；如果被拦截，Host 加 `POST /image-workbench/save`（写 `~/Downloads` 或用户选的目录）。
- [ ] 决定是否要 **「打包下载」**：不是现在的「下载全部」，而是明确的 ZIP（`results/` + `manifest.json`）。建议 P2 做。
- [ ] 若浏览器拦截多文件，不再假装成功；当前单张已改成「已发起下载」。

### 1.4 修正一个真相问题
- [ ] `poster` 在 `STYLES` 里写的是 `renderer:'html'`，实际走 Canvas `fxPoster`；P1 应先改成 `renderer:'canvas'`，卡片标签改「本机」，等 P2 真正 HTML 渲染器再改回。
  - 涉及：`client.js` 的 `STYLES`、`filteredStyles()`、卡片 tag、`docs/DETAIL.md`。

### 1.5 代码归位 + 版本
- [ ] 目前源码在 `~/Work/dsh/default-workspace/image-workbench`，按家目录规则应迁到 `~/Code/dsh-image-workbench`（或 `~/Code/image-workbench`），`git init` 并提交。
- [ ] 版本从 0.1.0 升到 0.1.1（本轮下载/对比/文案改动）；迁完后 `plugin_manager` remove 再 install（当前是 link，路径会变）。
- [ ] 设计稿 `mockup/` 可留在 repo 里，但 README 标记「v0.2 设计稿，实际交互以下载单张/无提示为准」。

### 1.6 测试与文档入库
- [ ] 把 `/tmp/iw-host-test.mjs` 收进 `tests/host.test.mjs`，`npm test` 可跑（fake ctx + 临时 HOME）。
- [ ] 不要再把 `client.js` 的 harness 当验收；保留为 `dev/harness` 仅用于看空态/夜版，不作为真机证据。
- [ ] `DESIGN.md` §9 的 P1 验收改成「代码完成，待真机验收」；`NEXT.md` 持续更新。

---

## 2. P2 · 本机生产化（2–3 天）

目标：从「能出图」变成「能交付」——模板、原图分辨率、ZIP、持久历史。

### 2.1 真正的 HTML 模板渲染器
- [ ] 定义 `renderer:'html'` 的 pack：`style.json` + `template.html` + `preview.png`；字段（标题/副题/日期/署名）进 `textFields`。
- [ ] 渲染：客户端用离屏 `iframe` 或 SVG `foreignObject` → canvas → JPEG；字体只用系统字体，禁外链；加 `document.fonts.ready` 等待。
- [ ] 2 个模板：印刷海报（3:2 / 4:5，标题+副题+日期）、社交卡片（3:4 / 1:1，标题+账号+页脚）。
- [ ] 验收：1120 下与设计稿一致；长标题/中英混排不溢出；导出 1200/原图都清晰。

### 2.2 参数与文本面板
- [ ] 现在强度/颗粒/油墨是全局共用；加「本版覆盖」：`state.overrides[styleId]`，检查器切「共用 / 当前风格」。
- [ ] 海报/卡片增加标题、副题、日期、署名输入；空值用默认文案；参数进 batch manifest。
- [ ] 验收：改 A 风格强度不影响 B；切换焦点时面板值跟着切。

### 2.3 原图分辨率导出
- [ ] 预览仍 1600px 内；导出按原图长边（上限 4096），单张渲染后再下载。
- [ ] 大图保护：>4096 先等比缩放；单批最多 20 张；失败格保留「重试这一张」。
- [ ] 验收：4000×3000 原图导出后尺寸不缩水，页面不崩。

### 2.4 ZIP 打包下载
- [ ] Host `POST /image-workbench/export`：接收 batchId，流式生成 ZIP（store 模式即可，JPEG 不压缩）。
- [ ] 内容：`results/01-poster.jpg` … + `manifest.json`（styleId@hash、参数、尺寸、时间、模型/费用字段留空）。
- [ ] 客户端只保留一个「打包下载」入口；单张「下载」保留。
- [ ] 验收：解压后文件数/命名/manifest 正确；浏览器不再触发 N 个下载。

### 2.5 持久历史与资产
- [ ] Host 新增 `lib/storage.js`：`~/Data/dsh-image-workbench/{library,outputs,styles,thumbs}`；原图 sha256 去重、`meta.json`、`batch.json`、`index.jsonl`。
- [ ] 路由：`POST /assets`（上传原图，multipart 或 data URL）、`POST /batches`（结果落盘）、`GET /history`、`DELETE /batches/:id`。
- [ ] 客户端历史从 `localStorage` 迁到 Host；localStorage 只留 UI 偏好；刷新/清缓存后历史还在。
- [ ] 保留 90 天清理；「清空历史」二次确认，不删 `styles/`。
- [ ] 验收：上传同一张图两次只存一份；重启 DSH 后历史可恢复。

---

## 3. P3 · MiniMax H3-Image 云端（3–4 天）

目标：一张原图出一条云端结果；超时进 `unknown` 且绝不自动重试；费用可对账。

### 3.1 先拍板
- [ ] 有开放平台 API Key 吗？图片上传 MiniMax 可以接受吗？
- [ ] 按量 API Key，还是 M Plan 订阅 Key（扣周额度，不显示金额）？
- [ ] 国内站 `api.minimax.cn` / 国际站 `api.minimax.io` 默认哪个？
- [ ] 默认 2K；4K 促销到 2026-11-18，之后单价约翻倍，是否还提供 4K？

### 3.2 Host provider
- [ ] 新 `lib/minimax.js`：`POST /v1/images/edits`（原图参考，`model=MiniMax-H3-Image`，`size=WxH`，`response_format=url`，`n=1`），可选 `/v1/images/generations`、`/v1/h3_image_context_ir`。
- [ ] multipart 上传：原图缩到 ≤8192px、JPEG q90、剥 EXIF；`Authorization: Bearer <key>`；base URL 按设置。
- [ ] 超时 ≥600s；`max_retries=0`；发请求前写 `requestSentAt` + 参数哈希；超时/断连 → `unknown`，不自动重试。
- [ ] URL 返回后立即下载落盘；失败退回 `b64_json`；保存 `revised_prompt`、`usage`、逐张错误。
- [ ] 错误分类：401/403 鉴权、429 退避（仅未发出）、内容安全、5xx、unknown。

### 3.3 队列 / 批次 / 预算
- [ ] 新 `lib/jobs.js`：`queued → preparing → running → succeeded/failed/canceled/unknown`；本机先出，云端后补进同一网格。
- [ ] 新 `lib/budget.js`：单批预估 >¥2 或日累计 >¥10 弹确认；日预算可手动放行；按量模式才显示金额，M Plan 显示套餐余量。
- [ ] 新 `lib/ledger.js`：JSONL 记录 batchId/jobId/usage/cost；历史页看本月花费；实际 usage 回填预估价。
- [ ] 路由：`POST /cloud/jobs`、`GET /cloud/jobs/:id`、`POST /cloud/jobs/:id/retry`（二次确认费用）、`POST /cloud/key-test`（真连通，不再只检查保存）、`GET /usage`。
- [ ] 密钥只走 `ctx.credentials`；日志/错误脱敏；不把 key 回传客户端。

### 3.4 Client 云端 UI
- [ ] 启用 `h3-illus` / `h3-silver` 两张卡；卡片标「云端」，显示预估 ¥ 与 25s 级别。
- [ ] 首次云端生成：隐私/上传确认；费用明细；生成中进度；部分成功格保留；失败格「重试这一张」+「可能再次计费」。
- [ ] `unknown` 独立文案：「请求已发出，可能已生成并计费，暂未收到结果」；只给「去控制台核对」，不给一键重试。
- [ ] 结果显示 `revised_prompt`；A/B 原图；风格强度用本地混合 0.3–1.0，不假装是模型参数。
- [ ] 设置：P3 配置解除禁用（地址/模型/计费/预算/并发）；Key 类型；用量。
- [ ] 验收：1 张原图出 1 张云端结果；断网/超时 → unknown 且无自动重试；日预算拦一次；401 有明确提示；ledger 与响应 usage 对得上。

### 3.5 复用边界
- [ ] 参考 `dsh-media-desk` 的 `src/images.js` 错误分类/下载/嗅探思路（MIT，注明来源），但不要 fork 第三方包；edits 分支自己写。
- [ ] 评估 media-desk 的订阅生图工具兜底（只读公共接口，不碰凭证）——可选，不阻塞 P3。

---

## 4. P4 · Agent / 批量 / 风格包（2–3 天）

- [ ] **Agent 工具**：`ctx.tools.register` 注册 `image_workbench`，入参原图路径/风格/参数/数量/是否云端；返回 jobId 或结果；云端费用必须二次确认；对话里可触发。
- [ ] **矩阵批量**：多图 × 多风格；上传文件夹；队列；网格按图分组；部分失败保留；单批上限。
- [ ] **风格包导入**：`ctx.directoryPicker` 选目录/zip；校验 `style.json`（schema=1、id、renderer、params、model、privacy）；内容哈希即版本；复制到 `~/Data/dsh-image-workbench/styles/`；导入确认信任；`script` 渲染器仍不做。
- [ ] **自由描述 + Context-IR**：用户写一句风格描述 → `/v1/h3_image_context_ir` 返回 `revised_prompt`/`aspect_ratio` 预览 → 确认后生成；只对增强 token 计费。
- [ ] 验收：对话里能触发一次本机+一次云端；导入一个外部 pack 可用；矩阵 2×3 部分失败不整批红。

---

## 5. P5 · 打磨与发布（1–2 天）

- [ ] 空态/错误态/加载态：示例图失败、sample 404、设置服务未连接、生成 0 张、下载被拦截，都有持久可读的提示。
- [ ] 响应式：1120 / 1024 / 900；键盘与读屏：焦点陷阱包含 `<summary>`、卡片重渲染焦点、滑杆 aria、下载按钮 aria。
- [ ] 性能：缩略图缓存、原图分辨率单张渲染、避免重复 buildThumbs；大图内存上限。
- [ ] 文档：README、DETAIL、DESIGN 状态、隐私说明（不上传/不训练）、费用说明、数据目录与清理。
- [ ] 发布：`~/Code/dsh-image-workbench` git tag 0.2.0；`plugin_manager` 安装验证；插件管理器图标/详情；卸载后数据保留说明。
- [ ] 真正的 `dsh_verify` 或用户手动验收记录；不再拿截图/harness 当验收。

---

## 6. 需要你拍板

1. **下一阶段先做哪个**：P2 本机生产化（模板/ZIP/原图）还是 P3 云端 H3？如果云端是核心，建议 P1 收尾后直接 P3；如果要做印刷/交付，先 P2。
2. **云端授权**：现在有 MiniMax 开放平台 API Key 吗？图片上传可以接受吗？按量还是 M Plan？
3. **下载**：单张保留；是否要 P2 的「打包下载 ZIP」？还是永远只单张？
4. **原图分辨率**：导出是否必须原图长边（上限 4096），还是 1200 够用？
5. **代码归位**：是否同意迁到 `~/Code/dsh-image-workbench` 并 git 化？现路径在 DSH workspace 里，按家目录规则不算正式 repo。
6. **真实验收**：你能否在本机刷新页面手动跑一遍？或者提供带登录态的 DSH 页面给 `dsh_verify`。

## 7. 建议顺序

1. P1 收尾（0.5–1d）：真机验收 + 窄宽 + 下载 + poster 标记 + 迁 repo/测试。
2. P3 云端（3–4d）：先做 1 张 edits 的最小闭环，再补预算/unknown/部分失败。
3. P2 本机生产化（2–3d）：HTML 模板、原图导出、ZIP、持久历史。
4. P4（2–3d）：Agent、矩阵、风格包、Context-IR。
5. P5（1–2d）：打磨、文档、发布。
