# Style preview thumbnails

These are static 16:10 thumbnails used by the style library cards.

- The 19 official style thumbnails are cropped/contained from MiniMax-H3-Image's official showcase assets:
  https://github.com/MiniMax-AI/MiniMax-H3-Image/tree/main/assets/showcase
- `h3-illus` and `h3-silver` are actual H3 outputs of the workbench's built-in `assets/sample.jpg`.
- Card thumbnails are local 640×400 JPEGs served at `/image-workbench/style-preview/<id>.jpg`; full images live in `full/<id>.jpg` (original/high resolution) and are served at `/image-workbench/style-preview/<id>-full.jpg` for the lightbox.
- The generated images on a user's own photo are still produced live; these are only style examples.

- The 7 inspiration thumbnails (`h3-sacred`, `h3-mystic`, `h3-observer`, `h3-west1960`, `h3-blackgold`, `h3-ramayana`, `h3-cosmic`) are cropped from the user-provided Douyin reference posts and are kept only as local visual style references. Rights remain with their creators: 诺皮克NovaPix, 真, After, 热带没有巧克力. Replace them with your own generated examples before redistributing the plugin.

- `h3-seal` (`金石印谱`) is a **layout schematic** built from the workbench sample and drawn in PIL to show the requested 3:4 top/bottom split, seal impression and rubbing; it is not an H3 output. The live style uses the user-provided 金石印谱 prompt. Replace it with a real H3 preview when available.
