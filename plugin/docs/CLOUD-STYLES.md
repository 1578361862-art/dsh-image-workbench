# 云端 H3 风格 · 官方示例归纳

这 11 个云端风格来自 MiniMax-H3-Image 官方仓库的 showcase 与提示词指南，不是第三方风格名。官方示例是完整创作 prompt；工作台把它们**归纳成图生图改写指令**：以图 1 为唯一主体/构图参考，保留人物/物体身份、姿态、文字与画面关系，只改变可见材质、光线、颜色与笔触。

| id | 名称 | 官方来源 | 归纳要点 |
| --- | --- | --- | --- |
| `h3-illus` | H3 插画化 | 工作台自有 | 暖色插画、细颗粒、轻光晕 |
| `h3-silver` | H3 银盐 | 工作台自有 | 黑白银盐、深黑/银灰/柔高光 |
| `h3-oil` | 古典油画 | Artistic Worlds · Old Master / Caravaggio | 明暗对照、单侧暖光、厚涂高光、亚麻画布、陈年清漆 |
| `h3-impression` | 印象派 | Artistic Worlds · French Impressionist | 湿画法、短笔触、纯色并置、晨雾柔光、形体在光中溶解 |
| `h3-manuscript` | 金箔手抄本 | Artistic Worlds · illuminated manuscript | 平涂蛋彩、深墨线、平透视、朱红/群青/金箔、卷草边框、羊皮纸磨损 |
| `h3-dunhuang` | 敦煌壁画 | Artistic Worlds · Dunhuang mural | 矿物颜料（朱砂/石青/石绿/赭石）、土壁颗粒、细线人物、飘带云纹 |
| `h3-gongbi` | 工笔重彩 | Artistic Worlds · gongbi | 绢本细线、矿物色分层罩染、绢丝纹理、留白 |
| `h3-collage` | 剪纸拼贴 | Surreal Worlds · cut-paper collage | 分层色纸、刀口纸边、轻微投影、有限色板 |
| `h3-pixel` | 像素海报 | Surreal Worlds · pixel cat poster | 有限调色板、像素格、有序抖动、8/16-bit |
| `h3-film` | 电影胶片 | Real World · documentary / film photo | 35mm、自然光、浅景深、细颗粒、halation、真实肤色 |
| `h3-concept` | 概念场景 | Game Worlds · matte painting | 大气透视、层次光、手绘笔触 + 照片纹理 |

## 设计约束

- 所有 prompt 先写“以图 1 为唯一主体与构图参考”，再写风格；避免模型重画主体。
- 风格只通过可见材质/光线/笔触描述，不用“高级”“氛围感”这类空词。
- 金箔、边框、壁画颗粒等装饰不得遮挡主体与文字。
- 官方示例里的具体场景（鸭子、鹈鹕、太空站）不进入 prompt；只保留风格语言，这样任意用户图都能用。
- 这套是 **image editing** 的 style transfer；官方完整 T2I 示例的构图/故事不适用。

## 来源

- [MiniMax-H3-Image](https://github.com/MiniMax-AI/MiniMax-H3-Image)
- [Artistic Worlds](https://github.com/MiniMax-AI/MiniMax-H3-Image/blob/main/showcase/artistic-worlds.md)
- [Surreal Worlds](https://github.com/MiniMax-AI/MiniMax-H3-Image/blob/main/showcase/surreal-worlds.md)
- [Real World](https://github.com/MiniMax-AI/MiniMax-H3-Image/blob/main/showcase/real-world.md)
- [Game Worlds](https://github.com/MiniMax-AI/MiniMax-H3-Image/blob/main/showcase/game-worlds.md)
- [Prompting Tips](https://github.com/MiniMax-AI/MiniMax-H3-Image#prompting-tips)
- [Image generation API](https://platform.minimax.cn/docs/guides/image-generation)
