# dsh-image-workbench · P1

DSH 面板插件：左栏「图像风格」打开一个 1120 宽的工作台。P1 只做本机 Canvas 渲染，不联网、不上传图片。

## 结构

- `index.js`：Host 半侧。注册 `/image-workbench/settings`、`/sample`、`/test`、`/health`；配置写 `~/Data/dsh-image-workbench/config.json`（0600），API Key 写 DSH credentials 记录 `dsh-image-workbench/minimax`。
- `client.js`：浏览器半侧。React 外壳 + 单页控制器；本机 6 个风格（半调、双色、Riso、蓝染、胶片、海报排版），多选生成、试印、A/B、下载、最近 3 次历史、设置抽屉。
- `assets/sample.jpg`：首次打开用的示例静物，Host 通过 `/image-workbench/sample` 提供。
- `docs/DETAIL.md`：插件详情页。
- `locale/*.json`：插件管理器里的标题/描述。

## 安装

在 DSH 里用 `plugin_manager` 的 `install_bundle` 指向这个目录；已安装时禁用再启用可重载 Host 半侧。

## 设置与数据

- 预算 / 默认尺寸 / 并发 / 隐私 / 接口地址 / 模型 / 计费：`~/Data/dsh-image-workbench/config.json`。
- API Key：`ctx.credentials` 记录，只显示尾号；P1 不发云端请求。
- 历史：浏览器 `localStorage`，键 `dsh-image-workbench/history/v1`，最多 3 批。

## 验证

- Host：fake ctx + 临时 HOME 跑过 GET/POST settings、sample、test、400 校验、0600 文件。
- Client：用 1120×860 的独立 harness（同一份 client.js + React 18 + mock API）验证了默认态、设置、存 Key、生成、历史恢复、A/B、夜版。
- DSH 内：`sidebar.panellist` 与 `main` 两个槽位均注册为 `image-workbench`；`/image-workbench/health` 在 51012 上返回插件的 401 JSON（路由已生效，未带页面会话的 curl 被拒）。
