# 图像工作台 V2.1 重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按《图像工作台 V2.1 详细产品与交互技术规范》把 dsh-image-workbench 重构为七节点、能力驱动、单并发队列、可恢复持久化、版本 DAG 与相纸显影的完整产品。

**Architecture:** 保留 DSH Client 单入口插件边界（不引入第二个 React 应用），把能力表、输出规格、草稿协调、队列、作品库、存储根、图层清单拆成可单测的纯 Node 模块；Host 新增 SQLite（node:sqlite）+ 原子文件写入 + 单并发任务服务；Client 只做七节点状态机、OverlayHost、焦点与动画。真实模型能力全部经过 `CapabilityProfile`，未核实的能力标 `unverified`，不静默当作可用。

**Tech Stack:** DSH 0.2.x Client ESM、Node 22 `node:sqlite`（不可用时回退 JSON 索引）、原生 DOM/CSS/Web Animations、Node test、Playwright/dsh_verify。

**基线：** 当前工作树已有未提交的 0.40.0 七节点雏形和 `lib/workflow.js`，44 个测试通过。本计划在该基线上增量实现，不覆盖未提交改动；先提交/冻结基线，再按任务推进。

---


## 进度（2026-11-16）

- 已提交基线 `1c2dd26`：保留工作树中已有的 0.40.0 七节点雏形、workflow service、旧队列/历史/密钥；未覆盖。
- 已实现并单测 Task 1/2：`capabilities.js`、`output-spec.js`、`draft.js`。
- 已实现并单测 Task 3/4 的纯逻辑：`sqlite.js`、`storage-roots.js`、`artworks.js`、`job-queue.js`、`sqlite-job-store.js`、`execution.js`；并接入 `/v2/capabilities`、`/v2/storage`、`/v2/artworks` Host 路由。
- `execution.js` 已把单 job → provider → artwork version 串起来；`providers.js` 已实现 MiniMax/Seedream 适配；`/v2/jobs` 已接真实执行服务。
- Client 七节点已切到 `/v2/jobs`：首轮单任务、二次编辑独立任务、版本文件 URL；节点布局改为宽屏四列 + 侧检查器；输入支持拖拽/替换确认；风格卡两排横滚 + 3D 翻面编辑。
- 已安装 0.41.0 并验证真实 Host `/v2/capabilities`、`/v2/jobs` 可访问；浏览器截图为 `shots/v2-flow-real.png`、`shots/v2-style-deck.png`、`shots/v2-replace.png`。
- 真浏览器验证（mock `/v2/jobs`）：出片、替换确认、翻面卡、历史 chips、v2 队列无 pageerror；新增相纸版导出、v2 队列合并、v2 作品历史入口与版本 chips；PNG 默认、单并发默认；Settings 存储根读取/应用；作品 source/ 原图落盘；Client 格式/档位/比例读取 `/v2/capabilities`；layer manifest + ZIP 路由/仓库方法已实现但能力表仍标记未核验；历史增加缩略图；存储目录增加可写状态。`node --test plugin/tests/` 66 通过。
- 尚未安装到 desktop profile；等 P0 UI + 存储/队列接线并通过浏览器验收后再升级版本。

## 0. 规格对照与关键决策

### 已具备（0.40.0 基线）
- 七节点按钮、检查器、基础风格卡、模型/格式/比例/尺寸控件。
- `/workflows` 首轮 + 二次编辑两阶段服务；首轮失败保留。
- 队列抽屉、历史、MiniMax/Seedream Key、预算、旧输出目录。

### 必须补齐
- 能力表与 `reconcileDraft`；所有参数按模型能力显示/回退。
- 输入替换确认、全画布拖拽、魔数/像素/大小校验、ObjectURL 释放。
- 两排横向风格卡、自由创作置顶、翻面编辑、按 `styleId[modelId][operation]` 的草稿。
- 能力驱动分辨率（比例→档位→实际像素→格式）；透明背景与有损质量。
- 单并发全局队列、不可变快照、幂等键、恢复、取消、失败重试边界。
- 作品目录 + SQLite schema + 原子保存 + 版本 DAG；历史相纸堆叠。
- 二次编辑 full/delta、父版本、旧版本不覆盖。
- 相纸显影动画、原图/相纸导出、图层 manifest/ZIP。
- 目录选择/重定位/权限失效、自动保存设置。
- 弹层 Portal、焦点圈定、Esc/焦点恢复、reduced-motion 等价路径。

### 技术决策
1. **Client 仍是单个 DSH Client ESM**：文档的 React/Radix/Zustand 是推荐技术栈；DSH 插件当前是单入口无构建客户端，优先复用宿主，不引入第二套应用。纯状态/能力/输出逻辑拆到 `plugin/lib/*` 并单测。
2. **SQLite**：Host 用 Node 22 `node:sqlite`；启动时检测，失败回退 JSON 索引并在 UI 标记 `degraded-storage`。数据库只存索引/元数据，图片仍在作品目录。
3. **真实目录**：默认 `~/Pictures/图像工作台`；Host 校验路径/写入权限。目录选择器若 Host 不提供，降级为路径输入 + 试写；不假装已有系统 picker。
4. **模型能力**：`verified: false` 的能力不显示；H3/Seedream 的模型 ID/尺寸/格式按当前源码既有约束，图层拆分、透明背景等标待验证，不做虚假承诺。
5. **队列**：全局单 worker；任务快照写 SQLite/JSON；请求发出前落 `submitting`；unknown 不自动重发。
6. **不覆盖旧历史**：旧 `index.jsonl` 做一次迁移导入，不删除旧文件。

---

## 1. 文件结构

### 新增纯模块
- `plugin/lib/capabilities.js` — 模型能力表、`getCapabilities`、`capabilityWarnings`。
- `plugin/lib/output-spec.js` — `resolveOutputSpec`、比例/档位/格式校验、实际像素。
- `plugin/lib/draft.js` — `reconcileDraft`、`normalizeSnapshot`、`validateSnapshot`。
- `plugin/lib/artworks.js` — 作品目录、`artwork.json`、版本 DAG、原子保存、旧索引迁移。
- `plugin/lib/job-queue.js` — 单并发队列、幂等键、状态机、恢复。
- `plugin/lib/storage-roots.js` — 默认根、试写、离线/重定位、路径净化。
- `plugin/lib/layers.js` — manifest 校验、图层文件、ZIP 组装。
- `plugin/lib/sqlite.js` — schema/migration/查询封装；不可用时 JSON 回退。
- `plugin/tests/capabilities.test.mjs`
- `plugin/tests/output-spec.test.mjs`
- `plugin/tests/draft.test.mjs`
- `plugin/tests/artworks.test.mjs`
- `plugin/tests/job-queue.test.mjs`
- `plugin/tests/storage-roots.test.mjs`
- `plugin/tests/layers.test.mjs`

### 修改
- `plugin/index.js` — 新 Host 服务、路由、迁移、队列 worker、静态结果。
- `plugin/client.js` — 七节点 UI、OverlayHost、状态机、动画、历史、设置。
- `plugin/package.json` — 版本、files、测试脚本。
- `plugin/lib/storage.js` — 复用原子写/资产函数；新增作品根写入。
- `plugin/lib/jobs.js` — 与队列服务对接；保留 unknown 语义。
- `plugin/tests/index.js` — 汇总新测试。
- `plugin/docs/DETAIL.md` — 交付说明、能力表、已知限制。

---

## 2. P0 任务（可运行基础）

### Task 1: 能力表与输出规格

**Files:** `plugin/lib/capabilities.js`, `plugin/lib/output-spec.js`, `plugin/tests/capabilities.test.mjs`, `plugin/tests/output-spec.test.mjs`

- [ ] 写失败测试：MiniMax 1:3 比例、Seedream 16:1、2K 16:9、透明背景必须 PNG、非法格式拒绝。
- [ ] 运行 `node --test plugin/tests/capabilities.test.mjs plugin/tests/output-spec.test.mjs`，确认失败。
- [ ] 实现：
```js
export const CAPABILITIES = {
  minimax: { id: 'MiniMax-H3-Image', verified: true, operations: ['text_to_image','image_to_image','edit'],
    aspectRatios: ['1:1','4:5','3:4','16:9','9:16'], tiers: ['1K','2K','4K'],
    formats: ['jpeg','png','webp'], transparent: false, watermark: false, layerSplit: false, promptEnhancement: true },
  seedream: { id: 'doubao-seedream-5-5-261028', verified: true, operations: ['text_to_image','image_to_image','edit'],
    aspectRatios: ['1:1','4:5','3:4','16:9','9:16'], tiers: ['1K','2K'], formats: ['jpeg','png'],
    transparent: true, watermark: true, layerSplit: false, promptEnhancement: true },
}
export function resolveOutputSpec({ provider, ratio, tier, format, transparent }) { /* 返回 {width,height,format,notes}，非法组合抛错 */ }
```
- [ ] 运行测试通过；提交 `feat: add capability and output spec registry`。

### Task 2: 草稿协调

**Files:** `plugin/lib/draft.js`, `plugin/tests/draft.test.mjs`

- [ ] 测试：H3→Seedream 保留提示词/style，`webp` 回退 `jpeg`，`4K` 回退 `2K`，返回 `changes[]`。
- [ ] 实现 `reconcileDraft(draft, caps)`：只改不兼容字段，不生成、不清提示词；`validateSnapshot` 校验 source/model/operation/size/format。
- [ ] 测试通过；提交 `feat: reconcile draft against provider capabilities`。

### Task 3: 作品库与 SQLite

**Files:** `plugin/lib/sqlite.js`, `plugin/lib/artworks.js`, `plugin/tests/artworks.test.mjs`

- [ ] 测试 schema：`artworks(id, root_id, created_at, favorite, liked, archived)`、`versions(id, artwork_id, parent_version_id, file, sha256, prompt, snapshot_json, status)`、`assets(id, sha256, path, w, h, bytes)`、`jobs(...)`、`storage_roots(...)`、`style_drafts(...)`。
- [ ] 实现默认根、目录安全拼接、`artwork.json` 原子写入、版本 DAG 插入、父版本校验、旧 `index.jsonl` 迁移一次。
- [ ] 测试：断电模拟（写临时文件失败）不落版本；重复 sha 去重；父版本不覆盖。
- [ ] 通过；提交 `feat: persist artworks as version DAG with sqlite index`。

### Task 4: 单并发队列

**Files:** `plugin/lib/job-queue.js`, `plugin/tests/job-queue.test.mjs`

- [ ] 测试：两任务只运行一个、FIFO、取消 queued、运行中不取消远端、unknown 不重发、重启恢复 queued/submitting。
- [ ] 实现状态机 `queued→submitting→generating→fetching_asset→saving→succeeded|failed|unknown|partial_success`，幂等键，worker 锁。
- [ ] 通过；提交 `feat: add durable single-concurrency job queue`。

### Task 5: Host 路由与存储根

**Files:** `plugin/index.js`, `plugin/lib/storage-roots.js`, `plugin/tests/host.test.mjs`

- [ ] 新 route：`GET/POST /storage`, `GET /capabilities`, `GET /artworks`, `GET /artworks/:id`, `POST /artworks/:id/favorite|like|archive`, `POST /jobs`, `GET /jobs`, `POST /jobs/:id/cancel|retry`, `GET /layers/:versionId.zip`。
- [ ] `GET /storage` 返回根、可写、默认路径、旧根/离线；不泄露完整敏感路径到日志。
- [ ] 测试 401、路径穿越、404、写失败、旧索引迁移。
- [ ] 提交 `feat: expose artwork/queue/storage host routes`。

### Task 6: Client 七节点与 OverlayHost

**Files:** `plugin/client.js`, `plugin/styles/wf.css`（若拆出）

- [ ] 七节点 responsive 4/2 折返；SVG 连线路由 `ResizeObserver`。
- [ ] 节点状态：default/hover/focus-visible/configured/running/done/error/disabled；文字+图标，不只颜色。
- [ ] 统一 OverlayHost（插件根内），焦点保存/圈定/Esc/恢复；替换确认默认取消。
- [ ] 输入：拖拽计数器、魔数/MIME/像素/大小/解码、ObjectURL 释放；已有图必须比较确认。
- [ ] 测试用 Playwright/dsh_verify：拖入子元素不闪、取消不改 ID、无效文件不污染。
- [ ] 提交 `feat: implement seven-node client shell and input safety`。

### Task 7: 模型/参数/风格卡/分辨率

**Files:** `plugin/client.js`, `plugin/lib/capabilities.js`, `plugin/lib/output-spec.js`

- [ ] 模型切换调 `reconcileDraft`，提示词保留；不兼容时 toast/内联提示。
- [ ] 调参只显示能力表允许项；图层拆分开关无报价时标注待验证。
- [ ] 两排横向滚动风格卡；自由创作置顶；点击 FLIP 居中、180° 翻面；背面 textarea；草稿按 `styleId[modelId][operation]`。
- [ ] 分辨率比例→档位→像素→格式；透明背景联动 PNG；非法组合不可提交。
- [ ] 减少动态时直接切换。
- [ ] 提交 `feat: capability-driven params and style card deck`。

### Task 8: 生成、相纸与二次编辑

**Files:** `plugin/client.js`, `plugin/lib/artworks.js`

- [ ] 单入口 `执行工作流`；提交快照；重复点击只建一个 job；运行中可改草稿并排队。
- [ ] 结果预解码后显影；网络失败不播完成动画；切后台直接最终态。
- [ ] 相纸 CSS 展示；原图下载不带边框；相纸版离屏合成；结果动作。
- [ ] 二次编辑 full/delta，父版本，失败不覆盖；任意成功版本可继续。
- [ ] 提交 `feat: polaroid result and versioned edit flow`。

### Task 9: 历史、队列、设置与恢复

**Files:** `plugin/client.js`, `plugin/index.js`

- [ ] 历史按作品相纸堆叠，展开版本父子；下载/继续编辑/复用参数/收藏/喜欢/不喜欢/归档。
- [ ] 队列缩略图、阶段、取消（仅 queued）、失败安全重试。
- [ ] 设置存储根（默认/选择/试写/旧根重定位）、自动保存、启动模式、减少动态。
- [ ] 关闭重开恢复队列和当前作品。
- [ ] 提交 `feat: artwork history queue and storage settings`。

### Task 10: 图层与验收

**Files:** `plugin/lib/layers.js`, `plugin/index.js`, `plugin/tests/*`, `plugin/docs/DETAIL.md`

- [ ] 仅在能力表 `layerSplit.verified` 时显示；二次计费确认；失败 `partial_success`。
- [ ] `manifest.json` 校验；透明 PNG；ZIP 流式/后台；无跨目录。
- [ ] Playwright acceptance 按规范 §10 矩阵；reduced-motion、200% 缩放、小窗。
- [ ] 真实 API 联调记录（不伪造）；未核实项列出。
- [ ] 提交 `feat: layer export and v2.1 acceptance`。

---

## 3. P1/P2
- P1：卡片共享布局的 Motion/FLIP 精修、相纸堆叠、目录重定位、异常恢复、性能优化。
- P2：多图融合、批量、局部遮罩、复杂图层编辑、更多模型（默认不做）。

## 4. 优化点
1. **状态单一真相**：草稿/快照/队列分层；任务快照不可变。
2. **能力驱动 UI**：不把模型 ID/参数硬编码到控件；回退有提示。
3. **原子保存**：临时文件 → fsync → rename → 索引事务；失败不覆盖。
4. **单并发 + 幂等**：避免重复计费；unknown 绝不自动重发。
5. **减少解码/内存**：ObjectURL/缩略图/懒加载；大图不 base64 入全局状态。
6. **动画性能**：只动 transform/opacity；大画布不用大面积 backdrop-filter；reduced-motion 等价路径。
7. **可访问性**：插件根 Portal、焦点恢复、aria-live、200% 缩放、键盘。
8. **可恢复**：队列/作品/目录状态持久化；旧目录离线不删记录。

## 5. 开发前必须核实
- MiniMax H3 / Seedream 5.5 的正式 model ID、生成/编辑端点、尺寸/格式/透明/水印/图层能力。
- 一次调用能否同时返回原图与图层；二次计费报价。
- DSH Host 是否提供目录选择/安全书签；否则使用路径 + 试写降级。
- 真实插件宽度、低配 Mac、暗色、DPI 下动画性能。

## 6. 验收命令
```bash
cd /Users/yee/Code/dsh-image-workbench
node --test plugin/tests/
# 浏览器验收（安装后）
# 使用 dsh_verify / webapp-testing，带登录态打开工作台
```
