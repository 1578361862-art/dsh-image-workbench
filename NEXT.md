# 图像风格工作台 · 剩余待办

> 2026-11-13 · 当前 0.3.0：P1 + P2 + P3 UI 代码完成，真实 Key live 验收待做；源码 `~/Code/dsh-image-workbench`。

## 已完成

- P1：入口、空态、上传/粘贴/拖入、6 本机风格、多选、试印、A/B、单张下载、设置、历史、夜版、窄宽（1020/760）。
- P1 修正：`poster` 现在是真正的 HTML 文字层 + Canvas 图像；下载改为每张卡片单张，不再有「下载全部」；去掉「点对比原图」提示。
- P2：模板文字（海报/卡片）、共用/当前风格参数、原图长边导出、ZIP + manifest、Host 持久历史/资产/批次/删除、localStorage 回落。
- P2 Host：`assets / batches / history / batch DELETE / result / export / storage`；`tests/host.test.mjs` 12 pass。
- P3：云端 UI（H3 插画/银盐）、1K/2K/4K、预估费用、预算/隐私确认、partial failure、unknown 不重试；Host provider/队列/预算/账本；保存 Key 后自动启用云端；key-test 诚实 501。
- 仓库归位：`~/Code/dsh-image-workbench`（git，0.3.0）；插件从该路径安装。

## 还没闭环

### P1/P2 真机验收（用户，最高优先）
- [ ] 刷新 DSH Web GUI → 打开「图像风格」；空态、示例图、拖/粘/选文件。
- [ ] 生成 3/4 版；单张「下载」真实落盘；「打包下载」ZIP 能解压。
- [ ] 刷新页面 → 历史从 Host 恢复；删除/清空。
- [ ] 设置存 Key、默认尺寸、隐私；夜版；A/B 键盘；控制台无 slot 报错。
- [ ] 1024/900 宽下检查（harness 已过，真机待看）。

### P3 真实 Key 验收（下一步）
- [x] 真实 Key 已保存（尾号 J9GQ，cloud=true，按量/国内站，预算 ¥10）。
- [x] 2026-11-13 07:43 真实跑 H3 插画化 2K：上传示例图 → 建作业 job_mwe723gv_bfb5253c → MiniMax 返回 **402 insufficient_balance (1008)**；Key 鉴权通过，但开放平台按量余额不足；没有结果/批次，未自动重试。
- [ ] 充值开放平台按量余额，或换有余额的按量 Key / M Plan Key；然后重跑同一张 2K。
- [ ] 通过后确认结果落盘、费用/usage 记录、错误卡可读；预算 402 手动放行。
- [ ] job 持久化、取消、90 天清理；云端结果写 index（当前 cloud 结果只进本地历史）；账本按 usage 回填实际费用。

### P4 / P5
- [ ] Agent 工具、矩阵批量、风格包导入、Context-IR 预览。
- [ ] 空态/错误态/键盘/读屏、下载被拦截的 Host 落盘兜底、文档与发布。

## 拍板

1. 请把 MiniMax API Key 填进设置（按量 · 国内站已固定），然后点一次 H3 插画化 2K，把结果/报错发我。
2. 4K 促销到 2026-11-18；之后如果继续用 4K，单价约翻倍，是否保留 4K 选项？
3. 云端结果目前只进本地历史，是否要写进 Host index（重装/换浏览器也能恢复）？
