# 图像风格工作台 · 剩余待办

> 2026-11-13 · 当前 0.6.0：P1–P5 已实现；P3/P4 live 已验证；真实 DSH 页面历史/设置已验收。源码 `~/Code/dsh-image-workbench`。

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
- [x] 充值后重跑成功：2026-11-13 07:50，job_mwe7b3ue_c4dee353，H3 插画化 2K，1888×2240 / 1,000,034 B；结果已落盘，并已发邮件到 1578361862@qq.com（附件）。
- [x] 结果已写入 Host 历史 batch `bmwe7btz2182ec3`（本轮是手动补的 batch；下一步做 cloud job 自动写 index）。
- [x] cloud job 自动写 index/history（成功结果出现于 Host 历史，不再手动补 batch）。
- [x] job 快照持久化：重启后 running → unknown、queued → failed，不自动重试；13 项 host 测试通过。
- [x] cancel 路由与用量面板：设置显示今日/本月云端费用；ledger 成功记录。
- [x] P4.1 Agent 工具 `image_workbench`：云端 estimate/start/status，要求用户确认费用；本机风格提示回页面。真实 1K 测试成功（job_mweu17a1_6da526c6，944×1120）。
- [x] P4.2 批量矩阵：最多 4 图 × 当前本机风格（含预设包），批量下载/ZIP；云端暂单张。harness 2×3 通过。
- [x] P4.3 预设风格包导入：`style.json` + preview，base 内置本机风格 + params；不允许脚本/HTML；Host 14 项测试。
- [x] P4.4 Context-IR 预览：云端风格「预览模型改写」，只返回 revised_prompt/aspect，不出图。真实调用 200，2258 tokens，aspect 3:4。
- [x] P5 90 天清理：Host 自动/手动 `/cleanup`，删旧 batch/原图/job；styles/ledger 保留；15 项测试。
- [x] P5 云端失败重试：失败卡「重试」，二次确认费用；unknown 无重试按钮；harness 已验证失败→成功。
- [x] P5 真实页面：用已登录会话打开「图像风格」，历史恢复、设置/用量、4K 提示均通过；截图在 shots。
- [x] P5 4K 价格提示：检查器显示促销 ¥0.2404 / 11-18 后 ¥0.4809。
- [ ] 剩余：账本按 usage 精确回填实际费用；云端矩阵；任意 HTML/JS 风格包。

### P4 / P5
- [ ] Agent 工具、矩阵批量、风格包导入、Context-IR 预览。
- [ ] 空态/错误态/键盘/读屏、下载被拦截的 Host 落盘兜底、文档与发布。

## 拍板

1. 4K 促销到 2026-11-18；之后是否保留 4K 选项？
2. 云端矩阵（多图 × H3）是否现在开，成本按张累加。
3. 任意 HTML/JS 风格包是否要做；需要信任模型。
