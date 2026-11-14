# 云端 H3 风格 · 官方示例归纳

这 29 个云端风格 = 21 个来自 MiniMax-H3-Image 官方仓库的 showcase 与提示词指南 + 8 个从用户提供的图文参考/提示词中提炼的风格；不是第三方现成风格名。风格库缩略图：21 个官方风格用官方 showcase（h3-illus / h3-silver 使用内置 sample 的实际 H3 输出），7 个灵感风格用用户参考图并标注来源，见 `assets/style-previews/`；卡片图统一 640×400，灯箱用 `full/<id>.jpg` 高分辨率原图；生成结果可在试印卡片上点「放大」查看原尺寸。官方示例是完整创作 prompt；工作台把它们**归纳成图生图改写指令**：

1. 先声明“图 1 是唯一参考图 / 构图来源”；
2. 保留主体身份、姿态、构图、文字与现场关系；
3. 只改变可见材质、光线、颜色、笔触和平面语言；
4. 官方示例里的具体场景（鸭子、鹈鹕、太空站、红熊猫）不进入 prompt，避免模型重画用户照片；
5. 风格用可见描述写，不用“高级”“氛围感”这类空词。

## 21 个官方风格

| id | 名称 | 官方参考 | 归纳要点 |
| --- | --- | --- | --- |
| `h3-illus` | H3 插画化 | 工作台自有 | 暖色插画、细颗粒、轻光晕 |
| `h3-silver` | H3 银盐 | 工作台自有 | 黑白银盐、深黑/银灰/柔高光 |
| `h3-oil` | 古典油画 | Artistic Worlds · Old Master / Caravaggio | 明暗对照、单侧暖光、厚涂高光、亚麻画布、陈年清漆 |
| `h3-impression` | 印象派 | Artistic Worlds · French Impressionist | 湿画法、猪鬃短笔触、纯色并置、晨雾海光、阴影不用黑 |
| `h3-manuscript` | 金箔手抄本 | Artistic Worlds · illuminated manuscript | 平涂蛋彩、深墨线、平透视、朱红/群青/金箔、卷草边框、羊皮纸磨损 |
| `h3-dunhuang` | 敦煌壁画 | Artistic Worlds · Dunhuang mural | 矿物颜料（朱砂/石青/石绿/赭石）、土壁颗粒、细线人物、飘带云纹 |
| `h3-gongbi` | 工笔重彩 | Artistic Worlds · gongbi | 绢本细线、矿物色分层罩染、绢丝纹理、留白 |
| `h3-collage` | 剪纸拼贴 | Surreal Worlds · cut-paper collage | 分层色纸、刀口纸边、错位剪影、撕裂边、半调网点 |
| `h3-pixel` | 像素海报 | Surreal Worlds · pixel cat poster | 硬边像素、混合像素尺度、有限调色板、套色偏移、屏幕纹理 |
| `h3-film` | 电影胶片 | Real World · documentary / film photo | 35mm、自然光、浅景深、细颗粒、halation、真实肤色 |
| `h3-concept` | 概念场景 | Game Worlds · matte painting / key art | 前中后景、大气透视、层次光、手绘 + 照片纹理 |
| `h3-shadow` | 皮影戏 | Artistic Worlds · shadow puppet | 油灯背光、米色布幕、半透明皮革关节偶、镂空纹样、竹签手影 |
| `h3-eastern` | 东方幻想线稿 | Artistic Worlds · Eastern fantasy line art | 细长流动线、朱砂/金箔/墨绿、云火纹与飘带、平面装饰 |
| `h3-oldphone` | 旧手机快照 | Real World · old phone snapshot | iPhone 7 直出、28mm、自然偏暖、动态范围有限、随手拍 |
| `h3-flashfilm` | 闪光胶片 | Real World · flash film portrait | 正面硬闪、面部高光、背景压暗、35mm 颗粒、真实皮肤 |
| `h3-dv` | DV 家庭录像 | Real World · home video | 2001 MiniDV/4:3、CCD 低清、色噪、压缩块、自动白平衡偏色 |
| `h3-sticker` | 贴纸残胶海报 | Surreal Worlds · sticker-residue type poster | 磨损金属门、胶带/撕纸/银膜、材料构成的字形、留白 |
| `h3-sheet` | 游戏角色设定 | Game Worlds · character sheet | 正面/背面/三分之四三视图、比例一致、中性棚拍、材质特写 |
| `h3-infographic` | 信息图 | Instruction Following · infographic | 扁平矢量、清晰分区、细箭头/短标签、有限色板、可读 |
| `h3-cad` | 工程蓝图 | Instruction Following · blueprint / CAD | 蓝底白线、正交三视图、尺寸线、剖面线、短标签 |
| `h3-surreal` | 超现实时尚 | Surreal Worlds · surreal fashion | 实景大道具、鲜艳撞色、直闪、胶片颗粒、低角度广角 |
| `h3-sacred` | 圣光暗童话 | 用户参考 · 诺皮克 NovaPix（神圣光影） | 白石/石膏雕塑、纯黑虚空、细光环、冷银单色、硬质雕刻 |
| `h3-mystic` | 玄黄奇境 | 用户参考 · 诺皮克 NovaPix（Sref 玄幻） | 2D 丝网/木刻、黄青平涂、硬边剪影、巨日/龙形云、同心圆 |
| `h3-observer` | 旁观者视角 | 用户参考 · 诺皮克 NovaPix（旁观者构图） | 宽景、背影、粉彩超现实地形、巨型云柱 |
| `h3-west1960` | 1960 西部动画 | 用户参考 · 诺皮克 NovaPix（《蛮山野侠》） | 16:9 宽银幕、正午硬光、尘土、日系手绘动画 |
| `h3-blackgold` | 暗金圣骑 | 用户参考 · 真（抖音） | 黑金甲胄、巴洛克金线、纯黑虚空/无苔藓、角色海报 |
| `h3-ramayana` | 罗摩衍那 | 用户参考 · After（抖音转载） | 红金史诗、战车黑马、动态对角线、古典插画 |
| `h3-cosmic` | 星河神性 | 用户参考 · 热带没有巧克力（抖音） | 黑洞星云、云海、古典衣褶、金色神光 |
| `h3-seal` | 金石印谱 | 用户提供提示词 · 2026-11-14 | 3:4 上下 1:1、上方原片、下方肖形印蜕与边款墨拓、朱砂/墨/纸白、70% 纸白 |


## 提示词 v2：按官方提示词方法加强

2026-11-14 起，29 个云端风格统一改为「参考契约 + 官方材质锚点 + 禁止项」三段式：

- **参考契约**：先声明图 1 是唯一参考图与构图来源，锁定主体数量、身份、姿态、朝向、手部动作、服装轮廓、关键配饰、前中后景、镜头高度、裁切与原文字位置；明确不新增、不删除、不替换主体。
- **官方材质锚点**：从 MiniMax 官方 showcase 提示词中提炼可见的介质、光线、色板、笔触/颗粒/纹理、完成度与版式，而不是复制官方场景中的鸭子、鹈鹕、太空站等具体内容。
- **禁止项**：过滤「原图加滤镜」、平滑数字渐变、3D 塑料感、HDR/重度磨皮、水印和无关文字；版式类风格（角色设定、信息图、工程蓝图）单独使用 `LAYOUT_HEAD/TAIL`，允许重排为正式图纸/图解，但保持主体结构和身份。
- 官方提示词技巧（任务先于风格、参考图角色、可见材质、明确不要文字）见 [Prompting Tips](https://github.com/MiniMax-AI/MiniMax-H3-Image#prompting-tips)。
- 当前 prompt 由 `client.js` 与 `index.js` 中的 `cloudPrompt()` 共同生成；两处保持同一份 29 条文本，Agent 工具和页面生成使用相同风格锚点。


### 7 个参考风格：示例图作为图2

从用户提供的图文参考新增的 7 个风格（圣光暗童话、玄黄奇境、旁观者视角、1960 西部动画、暗金圣骑、罗摩衍那、星河神性）现在会在 Host 端自动把 `full/<id>.jpg` 作为**第二张参考图**随作业发送。Prompt 明确：

- 图1 = 用户照片，是唯一主体/身份来源；
- 图2 = 仅作风格、材质、光线、色彩、笔触/场景语言参考，不复制其中的人物、物体、文字、构图或背景；
- 图1 的身份、姿态、主体关系必须保留；场景型风格才允许重设服装/环境/镜头。

这样比只靠文字更接近示例图的视觉语言。`h3-seal` 的示意预览不是 H3 输出，因此不作为图2参考。

### 参考型新增风格的契约

新增 7 个风格中，只有「圣光暗童话」沿用原构图契约；「玄黄奇境 / 旁观者视角 / 1960 西部动画 / 暗金圣骑 / 罗摩衍那 / 星河神性」使用 `cloudScenePrompt()`：保留主体身份、面部特征、体型、姿态与主体间关系，允许重设服装、时代、环境、景别、镜头和空间尺度，但不新增/删除主体；环境必须与主体有真实接触、遮挡、透视和光影。这样既保留“把用户照片变成该风格”的可用性，也允许这些参考风格真正改变场景，而不是只叠一层滤镜。

## 和“官方示例效果”的关系

- 官方 prompt 很长、针对具体场景；工作台不能把“鸭子/鹈鹕/太空站”带进用户照片，所以只抽取**风格语言**。
- 这次把 prompt 从一句摘要扩成“参考规则 + 风格材质/光线 + 构图保留 + 禁止项”，更接近官方示例的写法。
- 参考图角色：官方提示词指南要求给每张参考图一个角色并说明变/不变；这里固定写“图 1 是唯一参考图与构图来源”。
- 文字：保留原图文字位置；官方示例里的标题/标签不进入用户图。

## 来源

- [MiniMax-H3-Image](https://github.com/MiniMax-AI/MiniMax-H3-Image)
- [Artistic Worlds](https://github.com/MiniMax-AI/MiniMax-H3-Image/blob/main/showcase/artistic-worlds.md)
- [Surreal Worlds](https://github.com/MiniMax-AI/MiniMax-H3-Image/blob/main/showcase/surreal-worlds.md)
- [Real World](https://github.com/MiniMax-AI/MiniMax-H3-Image/blob/main/showcase/real-world.md)
- [Game Worlds](https://github.com/MiniMax-AI/MiniMax-H3-Image/blob/main/showcase/game-worlds.md)
- [Instruction Following](https://github.com/MiniMax-AI/MiniMax-H3-Image/blob/main/showcase/instruction-following.md)
- [Prompting Tips](https://github.com/MiniMax-AI/MiniMax-H3-Image#prompting-tips)
- [Image generation API](https://platform.minimax.cn/docs/guides/image-generation)
