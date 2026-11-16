# 供应商能力核验：Seedream 5.5 图层拆分

核验日期：2026-11-16  
来源：火山引擎方舟官方文档（页面抓取，可能在未通知时更新）。

## 官方结论

- Seedream 5.5 支持**图层拆分**：1 张底图 + 最多 **99 个图层**。
- 图层拆分模式要求 `image` 传入，且**仅支持单张参考图**。
- 请求字段：
  - `layer_decomposition: boolean`，默认 `false`
  - `layer_decomposition_options.max_images: integer`，默认 `30`，范围 `[2, 100]`
  - `layer_decomposition_options.text_recognition: boolean`，默认 `false`
- 图层拆分场景下：
  - `output_format` 只控制底图；图层始终是透明 PNG
  - 不支持传 `background`（传了会报错）
  - 每个图层在响应 `data[]` 中返回 `z_index`、`name`、`description`、`bounding_box`
  - `bounding_box.absolute` 是底图坐标；`normalized` 可用于自定义画布
- Seedream 5.0 pro / flash 最多 16 层；不是本项目的默认 5.5。
- 计费：
  - 官方 API 文档说明 `usage.generated_images` 只统计成功生成的图片，按张数计费
  - `max_images` 会预扣 IPM，实际生成不足时释放多扣额度
  - 本次抓取到的官方计费页没有给出 Seedream 5.5 每层的人民币单价；具体单价需以控制台/价格页为准，不能凭第三方文章写死

## 对本项目的影响

- `capabilities.js` 现在把 Seedream 5.5 的 `layerSplit` 标记为 `supported:true, verified:true`
- 同时标记 `workflow:false`：现有客户端还没有把图层拆分接到 v2 七节点工作流；经典编辑抽屉的 `/seedream/decompose` 是已有实现
- `requiresSingleInput`、`maxLayers`、`backgroundUnsupported`、`billing:'actual_generated_images'` 已写入能力表
- 未在本次授权范围内发起图层拆分真实调用；不能声称图层输出已联调

## 参考

- [图片生成 API（图层拆分参数与字段）](https://docs.volcengine.com/docs/ark/image-generation-api?lang=zh)
- [Doubao Seedream 5.5 教程](https://docs.volcengine.com/docs/ark/seedream-5-5?lang=zh)
- [模型列表（图层数量说明）](https://docs.volcengine.com/docs/ark/model-list?lang=zh)
- [模型服务计费说明](https://docs.volcengine.com/docs/ark/model-service-pricing?lang=zh)
