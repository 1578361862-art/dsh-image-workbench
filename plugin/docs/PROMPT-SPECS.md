# MiniMax H3 / Seedream 5.5 prompt rules

## MiniMax H3 image edit

- Put the image roles first: `图1` is the source; `图2` only if a style reference is sent.
- State what must stay: subject count, identity/face, pose, orientation, clothing silhouette, text position, camera/framing.
- State what may change: medium, color, light, edge, surface.
- Use explicit negatives: no new subject, no extra text, no watermark/UI, no plastic 3D.
- Prompt enhancement is forced on image edits; do not stack a second prompt enhancer.

The workbench already wraps style bodies with `cloudPrompt` / `cloudScenePrompt`; Seedream does not use those wrappers.

## Seedream 5.5 image edit

- Prefer short natural-language editing instructions over long H3 preservation boilerplate.
- Name the source as `参考图1`, and additional images as `参考图2`, etc.
- For local edits, say exactly where: `只修改参考图1左上角的招牌；其他区域保持像素不变。`
- For multi-turn edits, each turn starts from the previous result; only describe this turn's change.
- Prompt limit: 5000 characters for text/image; 2000 for layer decomposition.
- Layer decomposition: one reference image, `layer_decomposition: true`, `layer_decomposition_options.max_images` 2–100; output is 1 base + transparent PNG layers.
- Native RGBA: `background: "transparent"` + `output_format: "png"` (not currently enabled in the workbench UI).

## Workbench behavior

- Image present → image edit; no image → text-to-image.
- MiniMax text mode uses `disable_prompt_enhanced: true` and an exact WxH.
- MiniMax image edit extracts the style body from H3 wrappers for text mode.
- Seedream image edit prepends `参考图1是底图。只执行以下编辑，保持主体、构图、文字和画面外区域不变：` to the style body.
- Region field is currently a **semantic location description** (for example, “左上角招牌”); Seedream 5.5 follows it via prompt, not a hard mask.

## Actual workbench templates

### MiniMax H3, text mode (no image)

`以【主体】为主题，创作一张完整作品，不参考上传图片。` + style body, with `disable_prompt_enhanced: true` and exact WxH.

### MiniMax H3, image edit

Uses the H3 `CLOUD_EDIT_HEAD` / `CLOUD_SCENE_HEAD` wrappers: image roles, preservation list, allowed changes, negatives.

### Seedream 5.5, text mode

`创作一张完整作品，不使用任何参考图；主体为【主体】，场景为【场景】。` + style body.

### Seedream 5.5, image edit

`参考图1是底图。保持主体数量、身份、构图和画面外区域不变，只执行下面的风格编辑：` + style body.

Local prompt overrides are namespaced by model and style, e.g. `minimax:h3-illus` / `seedream:h3-illus`; switching models does not reuse the other model's saved prompt.
