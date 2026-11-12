# 图像风格工作台 · 剩余待办

> 2026-11-13 · 当前 0.2.0：P1 + P2 代码完成，P3 Host 基础完成；源码 `~/Code/dsh-image-workbench`。

## 已完成

- P1：入口、空态、上传/粘贴/拖入、6 本机风格、多选、试印、A/B、单张下载、设置、历史、夜版、窄宽（1020/760）。
- P1 修正：`poster` 现在是真正的 HTML 文字层 + Canvas 图像；下载改为每张卡片单张，不再有「下载全部」；去掉「点对比原图」提示。
- P2：模板文字（海报/卡片）、共用/当前风格参数、原图长边导出、ZIP + manifest、Host 持久历史/资产/批次/删除、localStorage 回落。
- P2 Host：`assets / batches / history / batch DELETE / result / export / storage`；`tests/host.test.mjs` 12 pass。
- P3 Host：MiniMax edits provider、jobs、budget、ledger、`cloudEnabled` 默认关；key-test 诚实 501；timeout → unknown 不重试；mock provider 测试通过。
- 仓库归位：`~/Code/dsh-image-workbench`（git，0.2.0）；插件从该路径安装。

## 还没闭环

### P1/P2 真机验收（用户，最高优先）
- [ ] 刷新 DSH Web GUI → 打开「图像风格」；空态、示例图、拖/粘/选文件。
- [ ] 生成 3/4 版；单张「下载」真实落盘；「打包下载」ZIP 能解压。
- [ ] 刷新页面 → 历史从 Host 恢复；删除/清空。
- [ ] 设置存 Key、默认尺寸、隐私；夜版；A/B 键盘；控制台无 slot 报错。
- [ ] 1024/900 宽下检查（harness 已过，真机待看）。

### P3 云端 UI（下一步）
- [ ] 打开 `cloudEnabled`，启用两张 H3 卡；预估费用、隐私确认、进度、部分失败、unknown 文案、revised_prompt、手动重试二次确认。
- [ ] `cloud/key-test` 仍是 501（官方无免费鉴权端点）；用一次真实 edits 验证 Key/账本。
- [ ] 真实 API Key / 按量 vs M Plan / 国内站 vs 国际站 / 2K vs 4K 拍板。
- [ ] job 持久化、取消、90 天清理；账本按 usage 回填实际费用。

### P4 / P5
- [ ] Agent 工具、矩阵批量、风格包导入、Context-IR 预览。
- [ ] 空态/错误态/键盘/读屏、下载被拦截的 Host 落盘兜底、文档与发布。

## 拍板

1. 下一步是否直接做 P3 云端 UI？需要 API Key 与图片上传授权。
2. 按量 API Key 还是 M Plan（扣周额度、不显示金额）？
3. 是否需要我把「打包下载」改成默认 ZIP（现在单张/打包并存）？
