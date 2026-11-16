# Seedream 5.5 图层拆分真实调用

授权：一次真实图层拆分调用。  
发起时间：2026-11-16  
请求：`POST /image-workbench/seedream/decompose`，`maxImages: 4`，输入为 Seedream 二次编辑结果 `ver_mwjg7wet0ccb3fb4`（1024×1024 PNG）。

## 结果

- HTTP 200
- 返回图层组：`layer_mwjgh7bt539734`
- 实际返回：**3 张**（1 张底图 + 2 个透明图层）
- 请求上限 4，实际 3；未再发起其他调用

| 序号 | 名称 | 尺寸 | 类型 | 文件 |
|---|---|---|---|---|
| 0 | 图层 1（底图，背景） | 1024×1024 | PNG | `layer-0.png` |
| 1 | 坐姿橘色虎斑短毛猫，面朝画面左侧 | 961×1091 | PNG | `layer-1.png` |
| 2 | 盛有半杯清水的透明直身玻璃杯 | 827×1267 | PNG | `layer-2.png` |

证据图片：

- `shots/real-layer-0.png`
- `shots/real-layer-1.png`
- `shots/real-layer-2.png`

## 官方参数对照

- `layer_decomposition: true` — 已生效
- `image` 单张输入 — 已生效
- `layer_decomposition_options.max_images: 4` — 实际返回 3
- `output_format: png` — 底图和图层均 PNG
- `background` — 未传（图层模式不允许）
- `z_index/name/description` — name/description 已返回；旧 wrapper 只保存了 name/description，未展开 bounding_box

## 成本

应用当前不把 Seedream 调用写入 `usage/ledger`，因此本次没有本地人民币成本记录。  
火山引擎官方计费页说明按实际生成图片张数计费；官方页面没有给出每层固定人民币单价，不能编造精确金额。

## 已知限制

- 该调用走经典 `/seedream/decompose` 路由，尚未接入 v2 七节点工作流。
- 本次没有做图层合成/重排 UI 的浏览器验收。
- 图层 `bounding_box` 未在旧 wrapper 中保留，后续 v2 接入必须补。


## 图层版本 DAG 回写（2026-11-17）

- 使用已产生的图层组 `layer_mwjgh7bt539734`，未再发起付费调用
- `POST /v2/artworks/art_mwjfu60s9395bca4/versions/ver_mwjg7wet0ccb3fb4/layers`
- 结果：
  - 新版本：`ver_mwjgmikwcbe6ef43`（v003）
  - 父版本：`ver_mwjg7wet0ccb3fb4`（v002）
  - layer manifest：2 层，画布 1024×1024
  - layers.zip：HTTP 200，2,270,332 bytes，ZIP 头 `504b0304`
- 真实浏览器历史：`acceptance-seedream · 3 版`，v001/v002/v003；打开 v003 可见相纸和「下载分层 ZIP」按钮，无 pageerror。
- 截图：`shots/v2-real-layer-dag.png`
