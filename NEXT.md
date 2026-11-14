# 图像风格工作台 · 剩余待办

> 2026-11-14 · 当前 0.17.0：P1–P5 已实现；P3/P4 live 已验证；真实 DSH 页面（侧栏/历史/设置/单张下载/ZIP）已实测。源码 `~/Code/dsh-image-workbench`。

## 已完成

- P1：入口、空态、上传/粘贴/拖入、6 本机风格、多选、试印、A/B、单张下载、设置、历史、夜版、窄宽（harness 1020/760）。
- P1 修正：`poster` 是 HTML 文字层 + Canvas 图像；下载改为每张卡片单张；去掉「点对比原图」提示。
- P2：模板文字（海报/卡片）、共用/当前风格参数、原图长边导出、ZIP + manifest、Host 持久历史/资产/批次/删除、localStorage 回落。
- P2 Host：`assets / batches / history / batch DELETE / result / export / storage`。
- P3：云端 H3 插画/银盐、1K/2K/4K、预估费用、预算/隐私确认、partial failure、unknown 不重试；Host provider/队列/预算/账本；Key 保存后启用；key-test 诚实 501。
- P3 真实：2K H3 成功（1888×2240 / 1,000,034 B），邮件发到 1578361862@qq.com；自动 history、job 持久化、cancel、usage。
- P4：Agent 工具 `image_workbench`（1K live）、本机批量矩阵、preset 风格包、Context-IR 预览（live 200）。
- P5：90 天清理、失败卡重试（非 unknown，二次确认）、4K 促销提示、真实页面历史/设置/单张下载/ZIP 验收；`dsh_verify` 客户端 PASS 14/14。
- 2026-11-14 修复：风格卡再次点击取消；最近记录悬停 × 删除（Host/local）；油墨色块选中环改为 inset 阴影不再被裁切；移除导入风格包的旧 P2 toast。
- 2026-11-14 云端风格扩到 21 个：古典油画、印象派、金箔手抄本、敦煌壁画、工笔重彩、剪纸拼贴、像素海报、电影胶片、概念场景、皮影戏、东方幻想线稿、旧手机快照、闪光胶片、DV 家庭录像、贴纸残胶海报、游戏角色设定、信息图、工程蓝图、超现实时尚；prompt 归纳自 MiniMax-H3-Image 官方 showcase，见 `plugin/docs/CLOUD-STYLES.md`。

## 还需闭环

### 1. 真实页面剩余验收
- [x] 打开「图像风格」、空态、风格墙、历史恢复、设置/用量、单张下载、ZIP。
  - 实测：下载 `cloud-01-h3-illus.jpg` 208,581 B（JPEG）；ZIP 209,441 B，含 `results/01-h3-illus.jpg` + `manifest.json`；无 pageerror。
- [ ] 拖入 / 粘贴 / 文件选择上传（真机）。
- [ ] 本机 3/4 版生成、A/B 键盘、夜版、1024/900 宽真机。
- [ ] 控制台无 slot/React 警告（下载流程已无 pageerror）。

### 2. 数据与费用
- [x] 历史费用回填：2 个既有 cloud job 的 `costYuan` 已从 ledger 写回 index/batch，刷新后历史卡不再显示 `¥—`。
- [ ] 账本按 MiniMax usage 回填“实际费用”；当前 `costYuan` 是按价目表估算。
- [ ] 90 天清理后的 ledger 保留策略确认（当前保留全部账本，只删资产/结果/job）。
- [ ] 清理/重试在真实页面点一次（Host 测试和 harness 已过；真实按钮未点）。

### 3. P4/P5 后续
- [ ] 风格包真实文件夹导入一次（Host 测试 + harness 加载已过，真实 `webkitdirectory` 未点）。
- [ ] 矩阵 ZIP 在真实页面打一次（矩阵 harness 已过；Host `/export` 已被实际 ZIP 验证）。
- [ ] 矩阵/设置 drawer 的焦点陷阱、Esc、读屏标签。
- [ ] 下载被 Electron/WebView 拦截时的 Host 落盘兜底（当前真实 Chromium 下载正常）。
- [ ] 云端矩阵（多图 × H3）；成本按张累加，需要你拍板。
- [ ] 任意 HTML/JS 风格包（当前只支持 preset：base + params + preview，安全但能力有限）。

### 4. 需要拍板
- [ ] 4K 促销 2026-11-18 结束；之后是否保留 4K（¥0.4809/张）。
- [ ] 云端矩阵是否开。
- [ ] 任意 HTML/JS 风格包是否做（需要信任模型）。

## 验证基线

- `node --test plugin/tests/`：15 pass / 0 fail。
- `dsh_verify`：`specs/workbench.json` PASS 14/14；报告 `dsh-verify-out/report.html`。
- 真实页面截图：`shots/plugin-real-open.png`、`plugin-real-history.png`、`plugin-real-settings.png`、`plugin-retry.png`。
