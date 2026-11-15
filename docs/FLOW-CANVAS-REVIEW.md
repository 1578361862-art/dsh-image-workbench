# 固定工作流画布 · 网页设计检查

检查对象：`plugin/client.js` 的 `#flowCanvas`（0.37.7）。
指南：Vercel Web Interface Guidelines（2026-11-15 拉取）。

## 布局

- 去掉页头标题和画布外框：点阵画布直接成为页面主体，不再有「固定工作流 / Fixed Node Graph」区；只保留右上角浮动控制。
- 单行固定拓扑，Obsidian Canvas 式浮层节点：
  `输入 → 模型 → 提示词 → 分辨率 → 输出`
- 画布自动 fit 到可用宽高；缩放控件浮动在右上角，画布本身 `overflow:hidden`，没有内层滚动条。
- 节点统一使用同一张纸面卡片：同一边线、同一 header、同一字号体系。

## 已修复

- **夜版**：画布/节点/节点头/连线/按钮全部改用 `--p-*` 令牌，移除硬编码浅色。
- **无障碍**：
  - 画布 `role="group"` + aria-label
  - 节点 article aria-label
  - 提示词 textarea aria-label
  - 状态 `role="status" aria-live="polite"`
  - 缩放百分比 aria-live
  - 上传/模型选择 `aria-pressed`
  - 分辨率按钮显式 `type="button"`
- **内容溢出**：提示词、结果、摘要、节点正文都有 overflow 处理；画布不再产生横向/纵向滚动条。
- **图片**：结果/源图写入实际宽高。
- **深色原生控件**：`color-scheme: dark` 根令牌已开启，select/textarea/button 均使用主题背景与文字。
- **焦点**：保留全局 `:focus-visible`；提示词输入框按用户偏好 `outline:none`，以光标提示。

## 接受/仍存在

- 自动 fit 下节点正文使用 8–9px 小字号；可用右上角 `+` 放大。
- 提示词 textarea 自身可滚动；节点内部结果/摘要过长时局部滚动。
- 固定拓扑，不支持拖动、框选、节点删除。
- 窄屏不重排，使用画布缩放而不是横向滚动。

## 结论

- 浅色/夜版均可读，无浅色画布残留。
- 画布无外层滚动条，节点与连线在一屏内。
- 43 个 Host tests 通过；无 pageerror；本轮未实际调用 H3/Seedream。
