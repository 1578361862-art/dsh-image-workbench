# Prompt inspirations · 2026-11-14

User-provided references were studied and turned into 7 new cloud styles. The official 21 styles remain tied to MiniMax's own showcase; these 7 are marked as inspirations, not official examples.

| # | Reference | What was learned | Style |
| --- | --- | --- | --- |
| 1 | 小红书 `6af531d700000000260258c1` | The direct note URL redirects to a login / security verification wall without an authenticated web session, so its body could not be read. No content was invented. | Not added yet |
| 2 | 诺皮克NovaPix · 神圣光影 | CG digital illustration, dark fairytale, dramatic silhouette, charcoal/silver/ghostly blue, theatrical cinematic light, psychological mystery | `h3-sacred` 圣光暗童话 |
| 3 | 诺皮克NovaPix · Sref 玄幻 | Tiny solitary figure, glowing yellow-orange terrain, slate-blue cliffs, yellow cloud vortex, dark teal starry sky, crescent moon | `h3-mystic` 玄黄奇境 |
| 4 | 诺皮克NovaPix · 旁观者视角 | Wide shot from behind, viewer as observer, pastel surreal ground, giant cloud column, bright sun, blue sky | `h3-observer` 旁观者视角 |
| 5 | 诺皮克NovaPix · 《蛮山野侠》1960 | 1960 western camera language + Japanese hand-drawn animation, hard noon sun, dust, wheat/teal/red, film grain | `h3-west1960` 1960 西部动画 |
| 6 | 真 · 不说狠话，不做软事 | Black-gold high-contrast dark knight, ornate baroque armor, crescent/saint motifs, volumetric light, wallpaper | `h3-blackgold` 暗金圣骑 |
| 7 | After · 罗摩衍那 | Indian epic illustration, red/gold, chariot and black horses, diagonal motion, ornate jewelry, classical paint | `h3-ramayana` 罗摩衍那 |
| 8 | 热带没有巧克力 · 星河是我的脉搏 | Cosmic surreal classical oil, black and gold nebula/accretion disc, cloud sea, robed figure on a cliff, sacred scale | `h3-cosmic` 星河神性 |
| 9 | 用户提供 · 金石印谱提示词 | 3:4 海报上下 1:1；上方原片，下半页肖形印蜕 + 边款墨拓；朱砂/墨/宣纸白，大量留白；真实篆刻材质 | `h3-seal` 金石印谱 |


## MiniMax Context-IR 试验

对 8 个新 prompt 调用过 MiniMax `/v1/h3_image_context_ir`。返回结果把它们统一重写成了「暗黑奇幻女性角色」场景，丢失了原图保留、画格、印谱和具体风格约束，因此**没有采用 Context-IR 文本**。改用更直接的方式：把用户提供的示例图作为 **图2 风格/材质参考** 发送给 H3，并在 prompt 中明确图1/图2角色；这比让 Context-IR 改写成另一张场景更接近示例图。


## How the prompts were adapted

- The MJ `--sref`, `--profile`, `--stylize`, `--chaos` flags are not supported by the H3 image-edit API and are not copied; only visible style language is kept.
- The 6 scene-changing styles use `cloudScenePrompt()` so the subject's identity, face, body, pose and subject relationships survive while clothing, era, environment, shot and scale may be re-authored.
- The exact scene content of the references (specific women, horses, chariots, quotes) is not pasted into the prompts; the user's own image remains the subject.
- The 7 preview images are local visual references only; rights remain with the original creators. Replace them with self-generated previews before redistributing.
