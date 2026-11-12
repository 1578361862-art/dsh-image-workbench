# 图像风格工作台 · 设计方案 v1

> 状态：P1 + P2 + P3 UI 已实现（`dsh-image-workbench` 0.3.0） · 2026-11-13
> 交付形态：DSH 插件 bundle（host + client），左栏入口 → 中央整页
> 方案与边界见本文；P1/P2 实现在 [plugin/](plugin/)，P3 云端 UI/provider/队列/预算已落地，保存 Key 后启用
> 详细剩余工作与验收清单：[NEXT.md](NEXT.md)

---

## 0. 结论先行

1. **「风格」不是提示词，是可插拔的渲染器。** 每个风格是一份 `style.json` 清单，声明自己用哪种方式出图：浏览器滤镜、HTML 模板、H3-Image 模型、还是交给 Agent。这样「skill 里的配方」「现成脚本」「直接调大模型」才能进同一个货架。
2. **四种渲染器，不是一个。** 本机 Canvas（毫秒级、免费）、HTML 模板（1–3 秒、可排版文字）、H3-Image（10–60 秒、按张计费）、Agent（分钟级、开放创作）。UI 上必须分组并标价，否则用户会一次勾 6 个风格然后被扣费/等待吓到。
3. **多风格并出是核心功能，不是批处理附属。** 一次上传 → 勾 N 个风格 → 一张对比网格。批次、并发、部分失败、逐张重试、整包导出都要按「N 个独立作业」设计。
4. **付费必须可见、可预算、不自动重试。** H3-Image 接口非幂等，超时也可能已扣费；重试就是二次扣费。这条直接决定作业状态机。
5. **默认本机，云端显式。** 图片默认不出机器；勾选云端风格时才上传，并在卡片上标「云端」。不做「为了效果更好自动上传」。
6. **生图走 API 直连，不走 CLI / Agent。** API 在进程内、可控超时与计费、支持图生图；CLI 是个人自动化，Agent 是另一类产品。详见 §5.0。

---

## 1. 需求拆解

你描述的三条来源，其实是三种完全不同的执行模型：

| 来源 | 本质 | 延迟 | 单张成本 | 可控性 | 适合 |
|---|---|---|---|---|---|
| 之前的 skills | 一套视觉配方（配色、网点、版式、文案结构） | 1–3 s（模板） | 0 | 高（确定性） | 海报、卡片、封面、排版类 |
| 图像处理脚本 | 像素/滤镜运算（LUT、双色、半调、颗粒） | 50–500 ms | 0 | 最高（参数化） | 快速试稿、批量套色 |
| 直接调大模型 | H3-Image 图像编辑/生成 | 10–60 s | ≈¥0.17–0.48/张（4K 促销 ¥0.24） | 中（语义理解强，像素不保证） | 写实重绘、插画化、换材质/背景 |

**关键判断：不要把 skill 当运行时依赖。** skill 是写给 Agent 的说明书，每次执行都要模型现读现写，慢、贵、结果漂移。工作台要的是**把 skill 的视觉配方固化成模板/参数**，一次固化、次次可复现。模型只在「开放描述」和「语义重绘」时出场。

**推论：一个风格可以有两个版本。** 例如「胶片」既可以是本机 LUT + 颗粒（免费、即时），也可以是 H3 重绘（真实质感、收费）。同一张卡片上提供「本机 / 云端」两个按钮，比让用户去理解两套系统要好。

---

## 2. 产品形态

### 2.1 入口与位置

- 左栏 `sidebar.panellist` 增加一个图标「图像风格」（order 35，和「稍后阅读」并列）。
- 点击后在 `main` 区打开中央整页（`main` keyed by panel id），不是窄侧栏。理由：要放风格墙 + 画布 + 结果网格，侧栏宽度不够；而且这是跨会话的全局工具，不属于某个 Session。
- 不放进对话流，也不做成右栏卡片。对话侧只保留一个 Agent 工具入口（二期）。

技术落点（已核对当前 DSH）：

- `ctx.slots.inject('sidebar.panellist', …)` 注册入口；
- `ctx.slots.inject('main', …)` 注册 `key = <panelId>` 的整页；
- 二进制走 `ctx.webServer.register(route)`，状态走 `ctx.remote` / HTTP JSON。

### 2.2 页面结构

```
┌ 图像风格工作台 ──────────────────────────────────────────────────┐
│  [全部] [本机] [云端] [智能体]      ⌕ 搜索        ⚙ 设置   ⏱ 历史  │
├────────────────┬─────────────────────────────────┬──────────────┤
│ 风格库  12     │                                 │ 参数          │
│ ┌────────────┐ │        ┌─────────────────┐      │ 强度 ───●─── │
│ │ 半调网点 ✓ │ │        │                 │      │ 油墨 [红/蓝] │
│ ├────────────┤ │        │   原图 / 结果    │      │ 颗粒 ──●──── │
│ │ Riso 错版 ✓│ │        │                 │      │ 纸纹 [细/粗] │
│ ├────────────┤ │        └─────────────────┘      │              │
│ │ 蓝染     ○ │ │                                 │ 输出 2K  ▾   │
│ ├────────────┤ │   拖入图片 / ⌘V 粘贴 / 点击上传   │ 保留原图比例 │
│ │ 印刷海报 ○ │ │                                 │              │
│ ├────────────┤ │   已选 3 种 · 预计 8s · ¥0.00    │ [生成 3 版]  │
│ │ H3 胶片  ○ │ │                                 │              │
│ └────────────┘ │                                 │              │
├────────────────┴─────────────────────────────────┴──────────────┤
│ 结果 3/3    [并排对比] [全部下载] [重掷]                          │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐                          │
│ │ 半调网点  │ │ Riso     │ │ 蓝染     │   ← 悬停按住看原图        │
│ └──────────┘ └──────────┘ └──────────┘                          │
└─────────────────────────────────────────────────────────────────┘
```

> 可交互设计稿：[mockup/index.html](mockup/index.html)。本机风格是真实 Canvas 渲染，云端风格为本地模拟；截图在 `mockup/shots/`。
> P1 实现按本机能力把输出改为长边 640/960/1200 px；1K/2K/4K 保留为 P3 H3 的面积档。

要点：

- **风格卡**：缩略图用内置样图预渲染，带渲染器徽标 + 预计耗时 + 价格（云端才有价）。勾选即加入本批。
- **画布**：显示原图或当前选中的结果；支持 A/B 按住对比。
- **参数面板**：只显示已选风格暴露的参数；多风格共有参数（强度、输出尺寸）提到顶部。
- **批量矩阵**（二期）：多图拖入后，结果区变成 `图 × 风格` 的矩阵，行是图、列是风格。
- **历史**：最近 50 个批次，缩略图 + 参数 + 重新运行；结果落盘后可再打开。

### 2.3 设置抽屉

页面右上角「设置」打开右侧抽屉（372px），不改 DSH 全局设置：

- **生图服务**：API Key（只显示尾号）、接口地址（国内站 / 国际站）、模型（H3 标准 / 极速）、计费（按量 / M Plan）、试连一次。
- **输出与预算**：默认尺寸 1K/2K/4K、每日预算、并发生成 1–4。
- **隐私**：云端生成前确认费用；本机风格不离开浏览器。
- **风格包**：已安装数量、导入文件夹、清空历史。
- **用量**：本月张数与花费、账单入口。

设计基准：**1120 × 860**（1440×900 窗口下 DSH 主区），页面 max-width 1120、左右 24px；1020 以下右栏落到下方，760 以下单栏。

### 2.4 四条主流程

**A. 单图多风格（主场景）**
上传/粘贴 → 勾 3 个风格 → 看预估（时间/费用）→ 生成 → 网格 → 对比 → 下载/存库。

**B. 单风格批图（二期）**
拖入 20 张 → 勾 1 个本机风格 → 全部生成 → 打包下载。本机渲染在浏览器内串行/并行完成，不产生费用。

**C. 从对话触发（二期）**
在聊天里拖图 + 说「用 riso 和半调各来一版」→ Agent 调 `image_style` 工具 → 返回文件路径 + 一张对比图。

**D. 自由描述（二期，但接口现在就要留）**
输入「做成 90 年代港片海报的感觉」→ 先调 `H3-Image-Context-IR` 拿到 `revised_prompt` 和 `aspect_ratio` 给用户看/改 → 确认后再生成。**先看提示词再花钱**，这是这个接口最大的价值。

---

## 3. 风格系统

### 3.1 四种渲染器

| renderer | 运行位置 | 实现 | 延迟 | 成本 | 产物 | 典型风格 |
|---|---|---|---|---|---|---|
| `canvas` | 浏览器 | Canvas 2D / WebGL，像素级滤镜 | 50–500 ms | 0 | PNG/WebP，原图分辨率 | 半调、双色、Riso、蓝染、颗粒、纸纹 |
| `html` | Host | HTML/CSS/SVG 模板 + Playwright `headless_shell` 截图 | 1–3 s | 0 | PNG，固定版式尺寸 | 印刷海报、社交卡片、封面、杂志跨页 |
| `model` | Host | MiniMax H3-Image `images/edits` 或 `generations` | 10–60 s | ¥0.14–0.48/张 | JPEG/PNG，1K/2K/4K | 胶片写实、插画化、线稿、赛璐璐、换背景 |
| `agent` | Host | 起一个子会话，按 skill 多步执行 | 1–5 min | 模型 token | 任意 | 需要文案+版式+多轮调整的定制稿 |

**为什么 canvas 放浏览器**：零依赖、预览=成品（同一段代码同一分辨率）、不传图。代价是标签页关掉就中断，所以只用于「秒级」作业；超过 20 张的批量走 Host（三期补 `script` 渲染器）。

**为什么 html 放 Host**：DSH 桌面端已经带 Playwright 的 `chromium_headless_shell`，截图链路现成；模板里可以放字体、SVG 滤镜、精确版式，这是 Canvas 做不好的。

**为什么 model 必须放 Host**：600 秒超时、密钥、计费、重试语义都只能在 Host 管；而且关掉页面不能丢作业。

### 3.2 Style Pack 规范

一个风格 = 一个目录：

```
styles/h3-film/
  style.json
  preview.png          # 可选，风格墙缩略图；没有就现场用样图渲一张
```

`style.json`（模型风格示例）：

```json
{
  "schema": 1,
  "id": "h3-film",
  "name": { "zh": "H3 胶片写实", "en": "H3 Film" },
  "renderer": "model",
  "source": { "kind": "builtin", "skill": "print-poster", "version": "1.3.0" },
  "tags": ["写实", "胶片", "人像"],
  "input": { "images": { "min": 1, "max": 1 }, "text": [] },
  "params": [
    { "key": "strength", "type": "range", "min": 0, "max": 1, "default": 0.7 },
    { "key": "grain", "type": "range", "min": 0, "max": 1, "default": 0.35 },
    { "key": "size", "type": "enum", "options": ["1K", "2K", "4K"], "default": "2K" }
  ],
  "model": {
    "provider": "minimax",
    "name": "MiniMax-H3-Image",
    "endpoint": "edits",
    "prompt": "将图1转为 35mm 胶片写真风格：暖调、细颗粒、轻微光晕，保留人物五官、姿态、构图与背景关系。{extra}",
    "preserve": ["identity", "composition", "text"],
    "maxReferences": 2
  },
  "estimate": { "ms": 25000, "costYuan": 0.19 },
  "privacy": "cloud"
}
```

`canvas` 风格的 `params` 直接映射到滤镜参数，可选再加 `render.js`；`html` 风格额外声明 `canvasSize`、`textFields` 和 `template.html`；`model` 风格额外声明 `endpoint`、`prompt`、`preserve`、`maxReferences`。

**版本**：pack 内容哈希即版本。结果 sidecar 里记录 `styleId@hash`，保证「同一风格同参数」可追溯；skill 更新不会悄悄改变历史结果。

### 3.3 从 skill / 脚本导入

- 来源一：skill 目录里放 `style.json` + `preview.png`（或 `template.html`），工作台扫描到就列为「可导入」。
- 来源二：任意目录，用 DSH 的 `directoryPicker` 选一个文件夹导入；校验 `style.json`、entry 文件存在、id 不与已有冲突。
- 导入 = **复制**进 `styles/<id>/`，不是引用原目录；原目录后续改动不影响工作台。
- `html` / `agent` 包在导入时明确提示「该风格包含模板/脚本」；`html` 截图时拦截外部网络请求，只允许本地资源。
- 一期只允许内置 + 手动导入，不允许任意 URL 安装。

**从 skill 到 pack 的转换是人工的、一次性的**：把 skill 里的配色、字体、网点参数、版式抽成模板，而不是把 SKILL.md 塞给模型现场发挥。这正是「确定性」的来源。

### 3.4 首批风格清单（建议）

| # | 风格 | renderer | 来源 | 说明 |
|---|---|---|---|---|
| 1 | 半调网点 | canvas | print-poster | 单色/双色网点，可调网角、网点大小 |
| 2 | 双色限墨 | canvas | print-poster | 两色油墨 + 叠印，适合人像 |
| 3 | Riso 错版 | canvas | print-poster | 套印偏移 + 纸纹 + 颗粒 |
| 4 | 蓝染 / 氰版 | canvas | print-poster | 普鲁士蓝单色 + 高光溢出 |
| 5 | 胶片褪色 | canvas | 自建 LUT | 提黑、褪色、轻颗粒 |
| 6 | 扫描纸纹 | canvas | 自建纹理 | 纸纹叠加 + 轻微模糊 |
| 7 | 印刷海报 | html | print-poster | 标题/副标题 + 网点图 + 版式 |
| 8 | 社交卡片 3:4 | html | guizang-social-card | 图 + 标题 + 留白 |
| 9 | 杂志跨页 | html | guizang-page | 图文混排 |
| 10 | H3 胶片写实 | model | H3-Image | 语义重绘，保人物 |
| 11 | H3 插画化 | model | H3-Image | 插画/绘本质感 |
| 12 | H3 线稿 | model | H3-Image | 素描/线稿，适合做底稿 |

一期建议先做 1–6 + 10（7 个），7/8/9 二期，11/12 二期。

---

## 4. 执行架构

### 4.1 Host / Client 分工

**Client（单文件 ESM，无构建）**
- 注册左栏入口 + 中央页；
- 上传、粘贴、拖拽；本地预览；
- `canvas` 渲染器：在浏览器内出图，结果 blob POST 回 Host 存档；
- 结果网格、A/B 对比、下载、历史浏览。

**Host（bundle 的 index.js）**
- 风格注册表：内置 pack + 导入 pack + 校验；
- 作业队列：`html` / `model` / `agent` 的实际执行；
- HTTP 路由：资产上传/读取、批次创建/轮询、历史；
- `model` 调用：H3-Image、超时、计费记录、错误归类；
- 凭据：MiniMax API Key 走 `ctx.credentials`，不落配置文件明文；
- Agent 工具：`image_style`（二期）；
- 存储：原图、结果、索引、缩略图。

### 4.2 作业状态机

```
queued → preparing → running → succeeded
                            ↘ failed
                            ↘ canceled
                            ↘ unknown   ← 云端超时/断连，可能已计费
```

- `unknown` 是独立状态，不能并进 `failed`；UI 文案：「请求已发出，可能已生成并计费，暂未收到结果」。提供「去 MiniMax 控制台核对」，**不提供一键重试**。
- 云端作业在发请求**之前**先落一条 `requestSentAt` + 参数哈希（写在 `running` 记录里，不新增 UI 状态）；崩溃后能对账。
- 本机作业失败可自动重试 1 次；云端只允许手动「重掷」，并二次确认费用。

### 4.3 并发与队列

- 全局并发：`canvas` 4、`html` 2、`model` 3（可配置）。
- 批次内按风格顺序排队，先出本机结果（秒级），云端结果陆续补进网格——**不要让用户等最慢的那个才看到东西**。
- 429 退避重试（仅限未发出的请求）；已发出的请求不重试。

### 4.4 存储布局

```
~/Data/dsh-image-workbench/
  library/<sha256-16>/original.<ext>
  library/<sha256-16>/meta.json        # 尺寸、色彩、EXIF 摘要、导入时间
  outputs/<batchId>/<jobId>.<ext>
  outputs/<batchId>/batch.json         # 参数、风格版本、模型、revised_prompt、usage、费用
  styles/<styleId>/                    # 导入的 pack 副本
  thumbs/<sha256-16>.webp
  index.jsonl                          # 追加写，启动时建内存索引
  config.json                          # 非敏感设置：默认尺寸、预算、并发
```

- 原图按内容哈希去重：同一张图重复上传不重复存。
- 结果文件名：`<原名>_<风格名>_<参数短哈希>.png`，导出 zip 时带 `manifest.json`。
- 清理策略：默认保留 90 天；「清空历史」要二次确认，不删 `styles/`。

### 4.5 与 DSH 的接口

| 能力 | 用法 |
|---|---|
| 入口/页面 | `ctx.slots`（已核对 `sidebar.panellist` / `main`） |
| 二进制路由 | `ctx.webServer.register(route)` |
| 类型化调用 | `ctx.remote`（typert）或同源 JSON 路由 |
| 凭据 | `ctx.credentials.set/resolve`，key 命名 `minimax.apiKey` |
| Agent 工具 | `ctx.tools.register`（二期） |
| 目录选择 | `ctx.directoryPicker`（导入风格包） |
| 子进程 | `ctx.subprocess.spawn`（Playwright 截图） |
| 会话 | 仅 `agent` 渲染器需要，二期再定 |

**不做**：不改 DSH 的 `main` 布局、不占用对话流、不替换任何内置 UI。

---

## 5. MiniMax H3-Image 接入

### 5.0 接入方式：API 直连、CLI、还是 Agent

三条路都能出图，但性质和代价完全不同：

| 方式 | 形态 | 支持图生图 | 速度 | 计费 | 运维成本 | 适合 |
|---|---|---|---|---|---|---|
| **REST API 直连** | 插件 Host 内 `fetch` | 是（`/images/edits`，1–16 张参考） | 10–60 s | 按量，可精确记账 | 无额外安装 | 产品功能 |
| **`mmx` CLI** | 子进程 + 全局 npm 包 | 是（`--image`） | 10–60 s + 进程开销 | 走 M Plan 配额或 API Key | 需全局安装、终端登录、PATH 可用 | 个人脚本 / Agent 调用 |
| **`mcode` Agent** | 子会话 / headless | 间接（要它自己调工具） | 分钟级 | 文本 token + 生图费用 | 重 | 开放创作，不是出图 |
| **DSH 订阅生图工具** | `ctx.tools.execute` | 否（只有 prompt/size/quality） | 10–60 s | 订阅额度 | 依赖第三方插件 | 无 Key 时的兜底（仅文生图） |

**结论：一期只做 REST API 直连。**

理由不是 CLI 不能用——`mmx image generate` 其实把 H3-Image 的 edits、`--size/--area`、`--no-prompt-enhance`、非幂等不重试都处理好了，是个合格的封装。真正的区别在**运行环境**：

1. **API 在进程内，CLI 在进程外。** 插件能直接拿到 `usage`、`revised_prompt`、逐张错误和 600 s 超时；CLI 只能靠 stderr 和文件名猜，还要处理 cwd、临时文件、退出码。
2. **CLI 需要全局安装 + 终端登录。** 桌面版 DSH 从 Finder 启动时 PATH 往往不含 npm 全局 bin；`mmx auth login` 也必须用户自己在终端做。插件无法替他完成，配置体验会断。
3. **Agent 是错配。** `mcode exec` 是完整的编码 Agent，让它「帮我生成一张图」要多花几十秒和一轮 token，还不保证产物；DSH 的规范也是「确定性能力用工具/服务，开放式任务才用子 Agent」。
4. **但要留一个口子。** 如果用户有 M Plan 但不想按量付费，`mmx` 是合理选择。三期可以加一个 `provider: "mmx-cli"` 的只读探测 + 文生图/图生图调用，作为「配额模式」，默认仍走 API。

> 一句话：**API 是产品接入，CLI 是个人自动化，Agent 是另一个产品。**

### 5.1 三个端点怎么选

| 场景 | 端点 | 说明 |
|---|---|---|
| 保留原图内容的风格迁移 | `POST /v1/images/edits` | 原图作为参考图 #1；支持 1–16 张参考；**总是**做 prompt 增强 |
| 只要同主题、不需要原图构图 | `POST /v1/images/generations` | 纯文生图；可 `disable_prompt_enhanced: true` 精确控制 |
| 先看模型会怎么改写提示词 | `POST /v1/h3_image_context_ir` | 只返回 `revised_prompt` + `aspect_ratio`；只按增强 token 计费，不出图 |

风格迁移一律走 `edits`，因为「保留构图/人物」是工作台的默认预期；只有用户明确选「重画一张」才走 `generations`。

> Base URL 分国内站 `https://api.minimax.cn` 与国际站 `https://api.minimax.io`，做成设置项，不写死；两站的参数与价目基本一致。

### 5.2 参数策略

- **尺寸**：按原图比例算目标像素，落在 `1K/2K/4K` 面积档；`size` 传精确 `WxH`（面积 655,360–20,000,000，比例 1:3–3:1）。超限先等比缩放。
- **默认 2K**：官方价目里 1K 与 2K 的编辑单价几乎一样（¥0.1744 vs ¥0.1747），2K 是白送的清晰度。
- **草稿/成品**：草稿 = Standard 1K/2K；成品 = Standard 4K。Highspeed 更贵（≈1.3–1.7×），只在用户明确选「快」时用。
- **参考图**：默认只传原图 1 张；风格包自带参考图时最多 2 张（每多一张都计 input image token）。
- **返回**：`response_format: "url"`，收到后**立即下载落盘**（官方明确 URL 不保证长期有效）；下载失败再退回 `b64_json`。
- **超时**：客户端 ≥ 600 s；不能沿用默认 30 s。
- **重试**：`max_retries = 0`（OpenAI SDK 默认会重试，必须关掉）。

### 5.3 成本（官方价目，2026-11-12，人民币）

Standard（`MiniMax-H3-Image`）单张参考费用：

| 任务 | 输入 | 输出 | 元/张 |
|---|---|---|---|
| 文生图 | 无 | 1K | 0.1430 |
| 文生图 | 无 | 2K | 0.1531 |
| 文生图 | 无 | 4K | 0.4522（促销 0.2261） |
| 编辑 | 1 张 1K | 1K | 0.1744 |
| 编辑 | 1 张 1K | 2K | 0.1747 |
| 编辑 | 1 张 1K | 4K | 0.4809（促销 0.2404） |
| 编辑 | 3 张 1K | 2K | 0.2746 |
| 编辑 | 3 张 1K | 4K | 0.5211（促销 0.2605） |

> 4K 五折促销到 **2026-11-18 00:00（北京时间）**，之后按原价估算。表内为官方示例值，实际按 `usage` token 结算；UI 预估价用表值 × 张数，跑完回填实际账单口径。

**UI 预估价 = 单价表 × 张数**；跑完用响应里的 `usage` 回填实际值。日预算默认 ¥10，超了要手动放行。

### 5.3.1 免费积分与计费来源

- 开放平台 API 的账单只有两种：**按量余额**（普通 API Key）或 **M Plan 套餐额度**（订阅 Key，按周刷新）。官方没有「每日免费 API 积分」这一项。
- **MiniMax Code 的每日签到积分**（400/天，连续第 4、7 天 1000，一周累计 4000，30 天有效）是 Code 产品内的额度，只能在 Code 里花；没有文档说明它可被开放平台 API Key 使用。
- 想把每日积分用掉，只能驱动 MiniMax Code（`mcode`）——即 Agent 路径：出图不可控、按任务扣积分、无法按张记账，不建议作为工作台后端。
- **有 M Plan 的话**：用订阅 Key 调同一组 `/v1/images/*` 接口，扣套餐周额度；插件在设置里区分 key 类型，云端卡片显示「套餐余量」而不是金额，预算闸门只对按量模式生效。
- 新用户若有一次性的试用额度，走普通按量 Key，可用，但不是每日。

### 5.4 计费陷阱（必须写进代码）

1. 接口**非幂等**：请求发出后服务端会跑完并计费，即使客户端超时/断开；重试会再次生成、再次计费。
2. 所以：请求前先落 `requestSentAt` 与参数哈希 → 发请求 → 超时进 `unknown` → **不自动重试**。
3. 批量里某张失败（内容安全等）不影响其他张；响应里 `data[]` 是逐张结果，可能部分成功。
4. 内容安全失败不计费（文档口径），但网络超时是否计费只能以账单为准——这就是 `unknown` 存在的理由。

### 5.5 保真控制

- `edits` 的 prompt 模板统一带「保留主体身份、姿态、构图、文字、背景关系；只改变材质、光线、色彩、笔触」。
- **「风格强度」不是模型参数**：模型侧用 prompt 措辞 + 结果与原图的本地混合比例（0.3–1.0）实现；混合是确定性的，用户能感知强弱。
- 结果详情展示 `revised_prompt`，让用户知道模型实际执行了什么；也作为复现依据。
- 文字多的图（海报、截图）默认推荐 `html` / `canvas`，并在云端风格卡片上提示「模型可能改写文字」。

---

## 6. 多风格并发生成

### 6.1 批次模型

```ts
Batch {
  id, assetId, createdAt, mode: 'single'|'matrix',
  items: Job[]        // 每个 style 一个 Job
}
Job {
  id, styleId, styleVersion, params,
  renderer, status, attempts,
  output?: { path, width, height, bytes },
  usage?: { tokens, costYuan },
  error?: { code, message, retryable }
}
```

### 6.2 部分失败

- 网格里失败的格子保留位置，显示原因 + 「重试这一张」。
- 云端重试按钮旁必须显示「可能再次计费」。
- 批次整体状态：`全部成功 / 部分成功 / 全部失败`，不因为一张失败把整批标红。

### 6.3 对比与导出

- 网格：同尺寸缩略图，悬停按住看原图；点开是大图 + A/B 滑杆。
- 「并排对比」把 N 张结果按同一裁切对齐。
- 导出：单张原图分辨率；zip 内 `results/` + `manifest.json`（含每张的风格、参数、模型、revised_prompt、费用）。

### 6.4 预算闸门

- 首次云端生成：必须先在设置里填 Key，并勾选「我知道图片会上传到 MiniMax」。
- 单批预估 > ¥2 或日累计 > ¥10：弹确认，显示明细。
- 所有云端调用写 `usage` 日志，历史页可看「本月花费」。

---

## 7. 数据、隐私与安全

- **默认本机**：`canvas` / `html` 不出机器；只有勾选 `model` 风格才上传，卡片上标「云端」。
- **上传内容**：仅原图（缩放后 ≤8192 px、JPEG q90）与必要参考图；不上传 EXIF、不上传历史结果。
- **密钥**：`ctx.credentials`，UI 只显示尾 4 位；日志与错误信息脱敏。
- **脚本信任**：一期只允许内置 pack + 手动导入；`html` 模板在无网络的 headless 上下文里截图；`script` 渲染器（任意代码）放到三期，并加显式「信任此风格包」开关。
- **删除**：单张结果删除、整批删除、清空历史；删除原图时提醒会连带影响引用它的历史。
- **不训练**：不把用户图片用于任何训练/微调；文档里写明。

---

## 8. 风险与取舍

| 风险 | 影响 | 处置 |
|---|---|---|
| H3 改写文字/人脸 | 海报、截图类结果不可用 | 文字类默认本机；云端卡片提示；A/B 对比 |
| 云端计费争议 | 用户不敢点 | 预估价 + `unknown` 状态 + 不自动重试 + 账单对账入口 |
| 浏览器 4K 内存 | 大图批处理崩页 | 预览 1600 px，导出才全分辨率；单批上限 20 张 |
| skill 配方漂移 | 同风格不同结果 | pack 固化 + 内容哈希版本 |
| 本地脚本安全 | 任意代码执行 | 一期不做 script；html 禁网；导入需确认 |
| DSH 插件更新 | API 变动 | 只用已核对的 slot/webServer/credentials 接口；把耦合点收敛到 `host/ports.js` |
| 标签页关闭 | 本机批次中断 | 只跑秒级作业；Host 队列只接云端/html |

**我明确不建议的做法**：

1. 不要把所有风格都做成「调模型」——慢、贵、不可复现，而且文字类一定翻车。
2. 不要用 Agent 现场读 skill 出图作为默认路径——那是定制稿，不是工作台。
3. 不要做「自动选风格」的一键美化——用户要的是控制权，不是抽卡。
4. 不要静默重试云端请求——省不了事，只会多扣钱。

---

## 9. 分期与验收

> 2026-11-13：P1 + P2 + P3 UI 代码完成，Host 12 项测试通过；真实 DSH 页面与真实 MiniMax Key 验收见 [NEXT.md](NEXT.md)。

| 阶段 | 内容 | 估时 | 验收 |
|---|---|---|---|
| P0 | 本方案定稿、风格清单冻结 | 0.5 d | 你确认 |
| P1 | 插件骨架、左栏入口、中央页、上传/粘贴、6 个 canvas 风格、多选生成、网格、下载、本地历史 | 2–3 d | 真浏览器跑通：上传→勾 3 个→出 3 张→下载 |
| P2 | ✅ HTML 文字层 + Canvas 图像、海报/卡片 2 个模板、共用/当前风格参数、原图导出、ZIP、Host 持久历史 | 2 d | 模板截图与设计稿一致；字体/版式不溢出 |
| P3 | ✅ 云端 UI（1K/2K/4K、费用/预算/隐私、partial failure、unknown 不重试）+ Host provider/队列/账本；真实 Key live 待验 | 2–3 d | 1 张原图出 1 张云端结果；断网超时进 `unknown` 且不重试 |
| P4 | Agent 工具、矩阵批量、风格包导入、自由描述 + Context-IR | 2 d | 对话里能触发；导入一个外部 pack 可用 |
| P5 | 打磨、空态/错误态、文档 | 1–2 d | 无阻塞缺陷 |

**MVP 边界（如果只想要最小可用）**：P1 完成即可用——6 个本机风格 + 上传 + 多选 + 网格 + 下载，不含云端、不含账号、不含历史云同步。

**验收方式**：用 `dsh_verify` 跑真实浏览器流程（上传、勾选、生成、下载、刷新后历史仍在），不拿截图冒充。

---

## 10. 需要你拍板

1. **先做哪条**：本机风格优先（推荐，2–3 天可玩）/ 云端 H3 优先 / 两条同时。
2. **云端授权**：现在有 MiniMax 开放平台的 API Key 吗？图片上传到 MiniMax 可以接受吗（每次显式确认）？
3. **默认输出**：2K（推荐）/ 1K / 4K。4K 促销 11/18 00:00 结束，之后单价约翻倍。
4. **首版范围**：单图多风格就够（推荐），还是首版就要「多图 × 多风格」矩阵？
5. **自定义**：一期只读内置风格（推荐），还是首版就要能导入自己的 skill/脚本？
6. **Agent 入口**：要不要让聊天里的 Agent 直接调用（二期，推荐）。
7. **计费来源**：用按量 API Key（推荐），还是有 MiniMax M Plan、用订阅 Key 扣周额度？注意 Code 的每日签到积分不能用于 API。

---

## 11. 与 dsh-media-desk 的复用边界

现状（2026-11-12 核对本机安装）：

- 已装 **dsh-media-desk 2.7.0**，第三方 MIT 包（github.com/woniuniuniu/dsh-media-desk），内容在 `~/.dsh/media-desk/`。
- 当前 `settings.json` 里**没有配生图密钥**（`hasKey=false`），所以它不是「现成能生图」的状态。
- 生图层：`src/images.js`（395 行）+ `src/image-tool.js`（97 行）+ `src/settings.js`。支持 OpenAI 兼容 `/images/generations`、阿里百炼同步、万相异步、以及复用 DSH 订阅生图工具；带 SSRF 校验、图片嗅探、相对 URL 拼接、错误分类、非永久错误重试一次。
- 它的「风格预设」是**写作人设**（语气、开场、结构），不是视觉风格，不能当风格库用。
- 产品形态是「灵感 → 一键成稿（标题/脚本/封面/配图/分镜）」，没有「上传一张图 → 套 N 个视觉风格」的流程，也没有本地滤镜、风格包、批次矩阵。

**能直接用的部分**：只做文生图的话，按它的请求路径可以接 H3-Image——`baseUrl=https://api.minimax.cn/v1`、`model=MiniMax-H3-Image`、`size=2720x1536`、`extra={"response_format":"url"}`，不用改代码（我核对的是代码路径，未实际发请求出图）。

**不能直接用的部分**：风格工作台的核心是 `/images/edits`（把用户照片当参考图），它没有；UI 交互也不是这个形态。

**不建议在它基础上改**：

1. 它是第三方 npm 包，改 `node_modules` 会被下一次更新覆盖；要改就得 fork，等于长期维护一个双产品分叉。
2. 它把 Key 明文存在 `settings.json`（600 权限），新插件可以用 `ctx.credentials`，更符合 DSH 规范。
3. 它的数据模型是「inspiration / production」，没有「asset / style / batch」，硬塞会把两边都弄乱。

**建议的复用方式**（MIT，注明来源）：

1. 独立插件 `image-workbench`，不 fork。
2. 复用 `images.js` 的 provider 结构、错误分类、非永久错误重试、下载与图片嗅探；在其上加 `protocol: "minimax-h3"` 分支（edits / generations），不改它的 openai 分支。
3. 复用 `image-tool.js` 的「探测 DSH 订阅生图工具」思路（只读公共接口、不碰凭证），作为无 Key 时的文生图兜底。
4. 复用 settings 的 `hasKey / keyHint` 展示方式，但 Key 存 `ctx.credentials`。
5. 可选：把 edits 能力回贡给 media-desk，让它的配图也能参考原图；两边各自独立发版。

**如果只想装一个插件**：可以把工作台做成 media-desk 的一个新模式，但那是 fork，成本高于独立插件，且以后上游每次发版都要合并。不推荐。

---

## 附录 A · 接口草案

```
POST /api/image-workbench/assets              multipart → { assetId, width, height, sha256 }
GET  /api/image-workbench/assets/:id          → 原图
POST /api/image-workbench/batches             { assetId, styles:[{id,params}], mode }
GET  /api/image-workbench/batches/:id         → { status, items[] }        # 轮询 800ms
POST /api/image-workbench/batches/:id/cancel
POST /api/image-workbench/results             multipart（浏览器渲染结果回存）
GET  /api/image-workbench/history?cursor=     → 批次摘要
GET  /api/image-workbench/styles              → 风格清单（含预览 URL）
POST /api/image-workbench/styles/import       { dir } → 校验并复制
POST /api/image-workbench/preview-prompt      { prompt, assetId? } → Context-IR 结果
GET  /api/image-workbench/settings            → 脱敏设置
PUT  /api/image-workbench/settings            { defaultSize, dailyBudget, concurrency }
```

Agent 工具（二期）：

```
image_style({ action: "list" })
image_style({ action: "apply", asset: "<path|attachment>", styles: ["riso","halftone"], params: {...} })
image_style({ action: "status", batchId })
```

## 附录 B · 关键文件

```
image-workbench/
  package.json
  cordis.patch.yml
  lib/index.js          # host：路由、队列、H3 客户端、凭据
  lib/client.js         # client：入口、页面、canvas 渲染器
  lib/styles/*          # 内置 pack
  locale/zh-CN.yml
  icon.svg
```

## 参考

- MiniMax H3-Image 发布说明（2026-11-10）：https://www.minimax.cn/blog/minimax-h3-image
- 图像生成指南：https://platform.minimax.io/docs/guides/image-generation
- 文生图 API：https://platform.minimax.io/docs/api-reference/image-generation-h3-generations
- 图像编辑 API：https://platform.minimax.io/docs/api-reference/image-generation-h3-edits
- Context-IR API：https://platform.minimax.io/docs/api-reference/image-generation-h3-context-ir
- 价目（国际站）：https://platform.minimax.io/docs/pricing/overview
- 价目（国内站，人民币）：https://platform.minimax.cn/docs/pricing/overview
