# 云端 H3 风格 · 官方示例归纳

这 21 个云端风格来自 MiniMax-H3-Image 官方仓库的 showcase 与提示词指南，不是第三方风格名。官方示例是完整创作 prompt；工作台把它们**归纳成图生图改写指令**：

1. 先声明“图 1 是唯一参考图 / 构图来源”；
2. 保留主体身份、姿态、构图、文字与现场关系；
3. 只改变可见材质、光线、颜色、笔触和平面语言；
4. 官方示例里的具体场景（鸭子、鹈鹕、太空站、红熊猫）不进入 prompt，避免模型重画用户照片；
5. 风格用可见描述写，不用“高级”“氛围感”这类空词。

## 21 个风格

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
