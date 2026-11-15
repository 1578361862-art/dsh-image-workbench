# MiniMax H3 Image 提示词规则与工作台用法

来源（2026-11-15 阅读）：

- HiAPI model page: https://hiapi.ai/en/models/minimax-h3-image-text-to-image
- Pixel Dojo prompting guide: https://pixeldojo.ai/guides/minimax-h3-image-prompting-guide
- Hugging Face step-by-step: https://huggingface.co/blog/ai-shu/minimax-h3-image-step-by-step

这些页面是第三方资料，不是官方规范；工作台按它们与 MiniMax 文档的共同点实现。

## 一、文生图：五段式

Pixel Dojo 的五段法与 Hugging Face 的六项 brief 可以合并成：

1. **What the image is**  
   照片 / 电影帧 / 版画 / 海报 / 产品图 / 插画；用途（网站 hero、封面、产品页）。
2. **Subject**  
   一个清晰主体，一个动作或姿态；可识别的轮廓、服装、材质。
3. **Everything else**  
   每个辅助物体写颜色和位置；不要只写“丰富细节”。
4. **Place and light**  
   场景、时间、光源方向、软硬、阴影、接触面。
5. **Text**  
   需要文字时逐字加引号，并写位置；最后加 `No other text.` 没有文字就写 `No text.`
6. **Exclusions**  
   用自然语言列出不要出现的东西；H3 没有独立 negative prompt 字段。

Hugging Face 还建议先写一句验收标准，例如：

> The subject must read clearly at mobile size, with usable empty space on the left for a headline.

这句不直接发给模型，用来决定是否接受结果。

## 二、图片编辑：一句话改动 + 保真清单

H3 的图片编辑不是“重画整张图”，而是“以图 1 为源，只改一件事”。

推荐顺序：

1. `Use image 1 as the source.`
2. 说明唯一改动：`Change only ...`
3. 列出必须不变的内容：主体数量、身份、脸、姿态、朝向、服装轮廓、配饰、镜头、裁切、前中后景、原文字位置、光线方向。
4. 说明新元素的接触、阴影、透视。
5. 用自然语言写不要新增/删除/改写。

示例：

```text
Use image 1 as the source. Change only the surface beneath the mug from linen to pale limestone. Preserve the mug shape, handle, camera angle, product position, background color, empty space on the left, and the existing light direction. Adjust only the contact shadow needed for the new surface. Do not add objects, text or logos.
```

## 三、参考图角色

H3 支持多参考图；不要只上传，不说明角色。

- 图 1：主体身份 / 被编辑图 / 构图来源
- 图 2..N：只取指定的颜色、材质、服装、环境或排版
- 每张参考图写一句“只取什么，不取什么”
- 上传顺序必须与提示词中的编号一致；改顺序就改提示词

示例：

```text
Use image 1 as the product reference; preserve its silhouette, handle proportions and ceramic finish.
Use image 2 only for the warm ivory and burgundy palette; do not copy its objects.
Use image 3 only for framing and the empty space on the left.
Create one coherent product photograph. No text, no extra products.
```

## 四、文本与排除项

- 文字必须逐字加引号：`The label reads "AURORA". Place it in the lower-right corner. No other text.`
- 不要写抽象质量词堆叠：`beautiful, professional, masterpiece` 不如写明“soft daylight from camera left, matte glaze, contact shadow”。
- H3 没有独立 negative prompt；把排除项写成完整句子：`Do not add extra cups, logos, lettering or decorative props.`
- 不要依赖“只改某区域”的文字，除非同时有裁切/蒙版；H3 当前没有可靠的像素 mask 入参。

## 五、比例、分辨率与增强

- 先定画幅，再定分辨率；画幅影响构图，后裁切容易切掉主体或文字区。
- API 两种尺寸方式只能二选一：
  - `aspect_ratio` + `area`（如 2K / 4K）
  - 固定 `size`（如 `2720x1536`）
- 固定 `size` 时再传 `aspect_ratio` 或 `area` 会校验失败。
- 文生图可关闭 prompt enhancement；图片编辑会强制增强。
- 检查返回的 `revised_prompt`；意外细节可能来自增强后的提示词。
- 生成非幂等；不要自动重试超时；HTTP 200 也可能有个别图片失败。
- 返回 URL 不保证永久；成功图片应立即保存。

## 六、工作台映射

- **H3 文生图**：`h3TextPrompt` 默认直接使用五段式详细中文模板，不再需要「H3 详细化」按钮。
- **H3 图片编辑**：默认直接使用图1唯一源图 + 保真清单 + 图2角色 + 只改变风格材质的中文模板。
- **区域编辑**：工作台不是把文字当 mask，而是裁切蒙版 bbox → 只编辑裁切 → 羽化合成回原图；因此“只改框内”由合成保证，不靠提示词。
- **多图场景**：图 1 是主构图，图 2..N 只取指定的额外元素/环境。
- **本地提示词修改**：直接用于下一次生成，不保存到 localStorage；恢复默认只清当前模型 + 风格。

## 七、工作台默认详细模板

文生图（中文 UI 直接展示）：

```text
创作一张完整、可直接发布的图片。单一清晰主体，明确构图，不要拼贴或网格。

画面类型与用途：【画面类型/用途】
主体：【主体】——一个可识别的主体，一个动作或姿态；不要重复主体，不要改变身份。
辅助元素：【辅助元素】——只保留这里写到的物体，并给出颜色和画面位置。
构图：【构图】——主体位置、前中后景、机位高度、裁切和留白。
场景与光线：【场景与光线】——地点、时间、光源方向、软硬、阴影和接触面。
风格与材质：<style body>
文字：默认不出现文字；如需文字，逐字加引号并说明位置，画面不要出现其他文字。
避免：额外主体、重复肢体、水印、签名、UI、塑料3D、平滑数字渐变和无关道具。
```

图片编辑：

```text
以图1为唯一源图与构图来源。保持主体数量、身份、面部关键特征、姿态、朝向、服装轮廓、配饰、镜头高度、裁切范围、前中后景关系、原文字位置和光线方向不变。只改变画种、介质、光线、色彩、边缘与表面质感。
若提供图2，只把图2当作风格、材质、光线和色彩参考，不复制图2中的人物、物体、文字或构图。

风格与材质：<style body>

不要新增或删除主体，不改变动作、视线与空间关系，不要水印、签名、UI、塑料3D或平滑数字渐变。
```

## 八、检查清单

- [ ] 主体数量、身份、动作清楚
- [ ] 每个辅助物体有颜色和位置
- [ ] 光源方向、时间、阴影合理
- [ ] 参考图每张都有角色，不复制无关内容
- [ ] 文字逐字引号 + 位置 + No other text
- [ ] 没有堆“beautiful/professional”等空词
- [ ] 编辑只改一项，保真清单完整
- [ ] 比例先定，尺寸方式只选一种
- [ ] 检查 revised_prompt 与实际结果
- [ ] 成功图片及时保存
