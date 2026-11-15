# 固定工作流画布 · 网页设计检查

检查对象：`plugin/client.js` 的 `#flowPage` 节点画布（0.37.5）。

指南：Vercel Web Interface Guidelines（2026-11-15 拉取）。

## 已修复

- **夜版**：画布/节点/节点头/连接线全部改用 `--p-*` 令牌，移除 `#faf5ec`、`rgba(251,247,239,...)` 等硬编码浅色；`--p-sunken` / `--p-paper` 在暗色下正确反色。
- **画布溢出**：节点画布默认按可用宽度/高度自动 `fit`，并加 55%–135% 缩放控件；窄屏可横向滚动。
- **节点排布**：从单列 stepper 改为两行固定拓扑：
  - 输入 ↘ 模型
  - 提示词（居中）
  - 分辨率 ↘ 输出
  - 端口与贝塞尔线固定，不提供拖动，避免误操作。
- **语义/读屏**：
  - 画布 `role="group"` + aria-label
  - 每个节点 article aria-label
  - 提示词 textarea 有 aria-label
  - 状态 `role="status" aria-live="polite"`
  - 缩放百分比 aria-live
  - 上传/模型选择同步 `aria-pressed`
  - 分辨率按钮显式 `type="button"`
- **内容处理**：提示词 textarea、结果图、节点摘要均有 overflow 处理；长提示不撑破节点。
- **图片**：节点结果和源图写入实际 `width/height`，避免布局抖动。
- **深色原生控件**：`color-scheme: dark` 已在根令牌层开启，select/textarea/button 使用令牌背景和文字。
- **焦点**：保留全局 `:focus-visible`；提示词输入框按用户明确偏好 `outline: none`，以光标作为提示（这是对指南的有意例外）。

## 仍存在/接受

- 自动 fit 在 1440 宽下约 88%，部分 8–9px 元数据在低缩放下偏小；可用画布 `+` 放大。
- 画布是固定拓扑，不支持拖动、框选、节点删除；这是产品约束，不是缺陷。
- 窄屏依赖横向滚动，不是移动端优先布局。
- 未加入 `prefers-reduced-motion` 分支：当前没有节点动画，缩放是即时 transform。
- 未做 skip link：工作流位于应用内面板，宿主已有导航结构。

## 检查结论

- 暗色/浅色均可读，无硬编码浅色画布。
- 节点、连线、端口、缩放控件层次清楚。
- 无 pageerror；43 个 Host tests 通过。
- 真实 H3/Seedream 出图仍未在本轮执行。
