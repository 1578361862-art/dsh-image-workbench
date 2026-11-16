/*
Uiverse reference component notices
Copyright - 2026 njesenberger (Nicolas Jesenberger)
Copyright - 2026 codebykay101 (CodeByKay)
Copyright - 2026 eslam-hany (Eslam Hany)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
/**
 * 图像风格工作台 — 浏览器半侧（P1）。
 * 本机 Canvas 风格、上传/粘贴、多选生成、试印、A/B、历史与设置。
 * 云端 H3 在 P3 接入；这里只保存 Key，不发云端请求。
 */
window.__ModuleLoader__.load({
  id: 'dsh-image-workbench',
  factory: function (require) {
    var module = { exports: {} };
    var exports = module.exports;
    var React = require('react');
    var h = React.createElement;

    var PANEL_ID = 'image-workbench';
    var CSS_ID = 'dsh-image-workbench-css';

    var CSS = `/* @panel-kit:begin · 由 panel-kit/panel-kit.css 生成，勿手改 */
:root {
  /* —— 页面骨架 ——
     这六块面板挂在主面板内容区，容器已经让开窗口顶带；28px 与 Daily Report 同高。
     只有整页铺满、内容真正触到窗口左上角的自定义页面，才用 --pk-page-top-bleed。 */
  --pk-page-top: 28px;
  --pk-page-top-bleed: calc(28px + var(--dsh-frame-top-clearance, 0px));
  --pk-page-x: clamp(24px, 3.6vw, 56px);
  --pk-page-bottom: 64px;
  --pk-maxw: 1280px;

  /* —— 间距尺：只有六档 ——
     行内 2/4/8，结构 12/16/24；区块级另用 --pk-sec-gap。
     业务 CSS 里自创 5 / 7 / 9 / 10 / 14 / 18 一律算漂移。

     例外只有一处：刊头的光学节奏（--pk-eyebrow-gap 9 / --pk-title-gap 6 /
     --pk-head-pad-bottom 10）与 --pk-toolbar-gap 10 是**命名令牌**，
     不是布局间距——它们调的是字与字的视觉关系，不是元素间隙。
     允许存在，不允许在业务 CSS 里再手写这些数。 */
  --pk-space-1: 2px;
  --pk-space-2: 4px;
  --pk-space-3: 8px;
  --pk-space-4: 12px;
  --pk-space-5: 16px;
  --pk-space-6: 24px;

  /* —— 刊头节奏：眉标 → 标题 → 一行说明 → 发丝线 —— */
  --pk-head-gap: 32px;
  --pk-head-pad-bottom: 10px;
  --pk-title-gap: 6px;
  --pk-deck-gap: 4px;
  --pk-eyebrow-gap: 9px;

  /* —— 控制件：一个面板里所有可点的矩形共用一套高度 —— */
  --pk-control-h: 34px;
  --pk-control-h-sm: 28px;
  --pk-control-r: 8px;
  --pk-control-px: 13px;
  --pk-control-px-sm: 10px;
  --pk-control-font: 12.5px;
  --pk-control-font-sm: 11.5px;
  --pk-control-gap: 8px;

  /* —— 语义高度：面板里每个矩形都要能说出自己属于哪一槽 ——
     控件 34 / 小控件 28 / 页签 38 / 行 44 / 徽标 22 / 药丸 26。
     出现 39、35、30 之类的值，先问「这是哪个槽」，答不上来就不许写。 */
  --pk-row-h: 44px;
  --pk-badge-h: 22px;
  --pk-pill-h: 26px;

  /* —— 页签：同一页面切换视图（总览 / 对照 / 持仓…），下划线式 —— */
  --pk-tab-h: 38px;
  --pk-tab-gap: 26px;
  --pk-tab-font: 14px;
  --pk-tab-underline: 2px;

  /* —— 分段控件：同一位置切换取值（今日/本周/本月、卡片/列表） —— */
  --pk-seg-h: 34px;
  --pk-seg-item-h: 28px;
  /* 派生值：外层 8（= --pk-control-r），内层 5（= 8 − pad 3）。不要手填 9 / 6。 */
  --pk-seg-r: var(--pk-control-r);
  --pk-seg-item-r: calc(var(--pk-control-r) - var(--pk-seg-pad));
  --pk-seg-pad: 3px;
  --pk-seg-gap: 2px;

  /* —— 工具条、区块、焦点、动效 —— */
  --pk-toolbar-gap: 10px;
  --pk-toolbar-pt: 16px;
  --pk-toolbar-pb: 12px;
  --pk-sec-gap: 36px;
  --pk-focus-width: 2px;
  --pk-focus-offset: 2px;
  --pk-ease: cubic-bezier(.2, .8, .2, 1);
  --pk-fast: .15s;

  /* —— 图标：16 网格、1.5 描边、随字色 —— */
  --pk-icon: 16px;
  --pk-icon-sm: 14px;
  --pk-icon-stroke: 1.5;

  /* —— 字体：衬线管标题与数字，无衬线管正文与操作，等宽管标签与元信息 —— */
  --pk-serif: "Iowan Old Style", "Songti SC", "Source Han Serif SC", "Noto Serif SC", Georgia, serif;
  --pk-sans: -apple-system, "SF Pro Text", "PingFang SC", "Helvetica Neue", Inter, Arial, sans-serif;
  --pk-mono: "SF Mono", "JetBrains Mono", ui-monospace, Menlo, Consolas, monospace;

  /* —— 字号阶：主打七级；报纸变体另加导语/正文两级，仅 Daily Report —— */
  --pk-fs-title: 44px;
  --pk-fs-title-sm: 36px;   /* 窄容器 ≤760 */
  --pk-fs-title-xs: 32px;   /* 窄容器 ≤520 */
  --pk-fs-h2: 22px;
  --pk-fs-body: 14px;
  --pk-fs-sm: 13px;
  --pk-fs-xs: 11.5px;
  --pk-fs-mono: 10px;

  /* 版面变体：只给报纸/阅读型版面（Daily Report）——导语与正文可以比 UI 大一号 */
  --pk-fs-lead: 16.5px;
  --pk-fs-reading: 16px;

  --pk-lh-title: 1.02;

  /* —— 字距：一负四正，五档 ——
     负值只给大字（标题/区块头/大数字）；正值从 ui 到 wide，越小的字越松。 */
  --pk-ls-title: -0.022em;
  --pk-ls-ui: 0.02em;
  --pk-ls-mono: 0.04em;
  --pk-ls-label: 0.12em;
  --pk-eyebrow-track: 0.18em;

  /* —— 纸：三层，从底到抬升 —— */
  --pk-paper: #faf6ee;
  --pk-paper-2: #fffcf6;
  --pk-sunken: #f1eadc;

  /* —— 墨：四级 —— */
  --pk-ink: #1b1813;
  --pk-ink-2: #4b453a;
  --pk-ink-3: #6f675a;
  --pk-ink-4: #7f7666;

  /* —— 线：发丝线 / 署名线 —— */
  --pk-hair: rgba(27, 24, 19, 0.14);
  --pk-hair-2: rgba(27, 24, 19, 0.07);
  --pk-rule: rgba(27, 24, 19, 0.62);

  /* —— 信号：全站唯一强调色（红铜） —— */
  --pk-signal: #a8452f;
  --pk-signal-2: #c25c44;
  --pk-signal-plate: #f7e2d4;
  --pk-signal-ink: #5d2a1a;

  /* —— 版面材料：AI Daily 的蓝版 / 金版；不是第二个强调色 —— */
  --pk-editorial: #333a8c;
  --pk-gold: #f2cf72;
  --pk-gold-ink: #46340a;

  /* —— 数据语义：A 股红涨绿跌 —— */
  --pk-up: #a8452f;
  --pk-down: #3d6b4f;

  --pk-focus: #333a8c;
  --pk-overlay: rgba(27, 24, 19, 0.42);

  /* —— 圆角：印刷面 0；控件 8；浮层 12；药丸 999 —— */
  --pk-r-print: 0px;
  --pk-r-overlay: 12px;
  --pk-r-pill: 999px;

  --pk-shadow-overlay: 0 24px 64px -24px rgba(27, 24, 19, 0.34);
  --pk-host-bg: var(--dsw-alias-bg-base, #ffffff);
}

/* 宿主夜版：三个属性都在用，统一在这里收口。不要只写 prefers-color-scheme。 */
html[data-ds-dark-theme],
body[data-ds-dark-theme],
html[data-theme="dark"] {
  color-scheme: dark;

  --pk-paper: var(--dsw-alias-bg-base, #151517);
  --pk-paper-2: #232324;
  --pk-sunken: #2c2c2e;

  --pk-ink: #f9fafb;
  --pk-ink-2: #cfd3d6;
  --pk-ink-3: #adb2b8;
  --pk-ink-4: #81858c;

  --pk-hair: rgba(255, 255, 255, 0.06);
  --pk-hair-2: rgba(255, 255, 255, 0.03);
  --pk-rule: rgba(255, 255, 255, 0.12);

  --pk-signal: #ff6363;
  --pk-signal-2: #ff8585;
  --pk-signal-plate: #33191a;
  --pk-signal-ink: #ffb4ae;

  --pk-editorial: #9aa0ff;
  --pk-gold: #e6c368;
  --pk-gold-ink: #241b06;

  --pk-up: #ff7b6e;
  --pk-down: #64c08c;

  --pk-focus: #ff8f8f;
  --pk-overlay: rgba(0, 0, 0, 0.62);

  --pk-shadow-overlay: 0 30px 80px rgba(0, 0, 0, 0.72);
  --pk-host-bg: var(--dsw-alias-bg-base, #151517);
}
/* @panel-kit:end */
.iw-root{
  color-scheme: light;
  --p-paper: var(--pk-paper);
  --p-paper-2: var(--pk-paper-2);
  --p-sunken: var(--pk-sunken);
  --p-ink: var(--pk-ink);
  --p-ink-2: var(--pk-ink-2);
  --p-ink-3: var(--pk-ink-3);
  --p-ink-4: var(--pk-ink-4);
  --p-hair: var(--pk-hair);
  --p-hair-2: var(--pk-hair-2);
  --p-rule: var(--pk-rule);
  --p-signal: var(--pk-signal);
  --p-signal-2: var(--pk-signal-2);
  --p-signal-plate: var(--pk-signal-plate);
  --p-signal-ink: var(--pk-signal-ink);
  --p-focus: var(--pk-focus);
  --p-overlay: var(--pk-overlay);
  --p-serif: var(--pk-serif);
  --p-sans: var(--pk-sans);
  --p-mono: var(--pk-mono);
  --p-r-control: var(--pk-control-r);
  --p-ease: cubic-bezier(0.2, 0, 0, 1);
}
body[data-ds-dark-theme] .iw-root .sw:not(.on), html[data-ds-dark-theme] .iw-root .sw:not(.on), .iw-root[data-theme="dark"] .sw:not(.on){ box-shadow: inset 0 0 0 1px rgba(255,255,255,.07); }
body[data-ds-dark-theme] .iw-root, html[data-ds-dark-theme] .iw-root, .iw-root[data-theme="dark"]{
  color-scheme: dark;
}
.iw-root, .iw-root *{ box-sizing: border-box; }
.iw-root{ margin: 0; padding: 0; }
.iw-root{
  background: var(--p-paper);
  color: var(--p-ink);
  font-family: var(--p-sans);
  font-size: 13px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
.iw-root button, .iw-root input{ font: inherit; color: inherit; }
.iw-root button{ cursor: pointer; }
.iw-root a{ color: inherit; }
.iw-root ::selection{ background: var(--p-signal-plate); color: var(--p-signal-ink); }
.iw-root :focus-visible{ outline: 2px solid var(--p-focus); outline-offset: 2px; }
.iw-root .page{ min-height: 100vh; display: flex; flex-direction: column; }
.iw-root .wrap{ width: 100%; max-width: var(--pk-maxw); margin: 0 auto; padding-left: var(--pk-page-x); padding-right: var(--pk-page-x); }
.iw-root .masthead{
  position: relative;
  display: flex; align-items: flex-end; justify-content: space-between; gap: 24px;
  padding-top: var(--pk-page-top); padding-bottom: var(--pk-head-pad-bottom);
}
.iw-root .masthead::after{
  content: ""; position: absolute; left: var(--pk-page-x); right: var(--pk-page-x); bottom: 0;
  height: 3px; background: var(--pk-rule);
}
.iw-root .eyebrow{
  display: flex; align-items: center; gap: 8px;
  font-family: var(--p-mono); font-size: 10px; font-weight: 500;
  letter-spacing: var(--pk-eyebrow-track); text-transform: uppercase; color: var(--p-ink-3);
}
.iw-root .eyebrow .mark{ width: 5px; height: 5px; flex: none; background: var(--p-signal); transform: rotate(45deg); }
.iw-root .eyebrow .fill{ width: 44px; height: 1px; background: var(--p-hair); flex: none; }
.iw-root .eyebrow .no{ margin-left: 2px; color: var(--p-ink-4); }
.iw-root .title{
  margin: 8px 0 0; font-family: var(--p-serif); font-weight: 600;
  font-size: 44px; line-height: 1.02; letter-spacing: var(--pk-ls-title); color: var(--p-ink);
}
.iw-root .deck{ margin: 6px 0 0; max-width: 64ch; font-size: 13px; line-height: 1.55; color: var(--p-ink-3); }
.iw-root .mast-right{ display: flex; flex-direction: row; align-items: center; gap: var(--pk-space-3); flex: none; }
.iw-root .mast-right .eyebrow{ margin: 0; }
.iw-root .mast-right .deck{ margin: 0; text-align: right; max-width: 34ch; }
.iw-root .mast-tools{ display: flex; align-items: center; gap: 4px; }
.iw-root .icon-btn{
  width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid var(--p-hair); border-radius: var(--p-r-control);
  background: transparent; color: var(--p-ink-3); transition: color .15s, background-color .15s;
}
.iw-root .icon-btn:hover{ color: var(--p-ink); background: var(--p-sunken); }
.iw-root .icon-btn.wide{ width: auto; height: var(--pk-control-h); padding: 0 var(--pk-control-px); gap: var(--pk-space-2); font-size: var(--pk-fs-ui); letter-spacing: var(--pk-ls-ui); }
.iw-root .stamp{
  display: flex; gap: var(--pk-space-3); align-items: baseline;
  font-family: var(--p-mono); font-size: var(--pk-fs-mono); line-height: 1.5; letter-spacing: var(--pk-ls-ui);
  color: var(--p-ink-3); text-align: right; white-space: nowrap;
}
.iw-root .stamp b{ font-weight: 500; color: var(--p-ink-2); }
.iw-root .view-tabs{ display:flex; align-items:center; gap:14px; margin-top:2px; border-bottom:1px solid var(--p-hair); }
.iw-root .view-tabs button{ height:30px; padding:0 2px; border:0; border-bottom:2px solid transparent; background:none; font-family:var(--p-mono); font-size:10px; letter-spacing:var(--pk-ls-label); text-transform:uppercase; color:var(--p-ink-4); cursor:pointer; }
.iw-root .view-tabs button.on{ color:var(--p-ink); border-bottom-color:var(--p-ink); }
.iw-root .view-tabs button span{ margin-left:4px; color:var(--p-ink-4); }
.iw-root .seedream-page[hidden]{ display:none; }
.iw-root .text-templates{ display:flex; align-items:center; gap:8px; margin-top:10px; flex-wrap:wrap; font-family:var(--p-mono); font-size:10px; color:var(--p-ink-3); }
.iw-root .text-templates>span{ flex:none; }
.iw-root .text-templates button{ height:24px; padding:0 7px; border:1px solid var(--p-hair); background:var(--p-paper-2); color:var(--p-ink-3); font-family:var(--p-mono); font-size:9px; cursor:pointer; }
.iw-root .text-templates button:hover{ color:var(--p-ink); border-color:var(--p-ink-3); }
.iw-root .model-seg{ display:flex; align-items:center; gap:6px; margin:8px 0 2px; flex-wrap:wrap; font-family:var(--p-mono); font-size:10px; color:var(--p-ink-3); }
.iw-root .model-seg>span{ margin-right:2px; }
.iw-root .model-seg button{ height:26px; padding:0 8px; border:1px solid var(--p-hair); background:var(--p-paper); color:var(--p-ink-3); font-family:var(--p-mono); font-size:9px; cursor:pointer; }
.iw-root .model-seg button.on{ background:var(--p-ink); border-color:var(--p-ink); color:var(--p-paper); }
.iw-root .text-model{ display:flex; align-items:center; gap:6px; margin-top:8px; }
.iw-root .seedream-mode{ display:flex; gap:6px; margin-bottom:10px; }
.iw-root .seedream-mode button{ height:28px; padding:0 10px; border:1px solid var(--p-hair); background:var(--p-paper); color:var(--p-ink-3); font-family:var(--p-mono); font-size:10px; cursor:pointer; }
.iw-root .seedream-mode button.on{ background:var(--p-ink); border-color:var(--p-ink); color:var(--p-paper); }
.iw-root .seedream-edit{ display:flex; align-items:center; gap:8px; margin-bottom:10px; flex-wrap:wrap; }
.iw-root .seedream-edit img{ width:84px; height:60px; object-fit:cover; border:1px solid var(--p-hair); background:var(--p-sunken); }
.iw-root .seedream-edit img[hidden]{ display:none; }
.iw-root .seedream-page .text-form textarea{ min-height:150px; }
.iw-root .text-page[hidden]{ display:none; }
.iw-root .text-page{ margin-top:16px; padding-bottom:36px; }
.iw-root .text-head{ display:flex; align-items:flex-end; justify-content:space-between; padding-bottom:9px; border-bottom:1px solid var(--p-hair); }
.iw-root .text-head h2{ margin:0; font-family:var(--p-serif); font-size:26px; font-weight:500; letter-spacing:var(--pk-ls-title); }
.iw-root .text-head span{ display:block; margin-top:3px; font-family:var(--p-mono); font-size:10px; color:var(--p-ink-4); }
.iw-root .text-layout{ display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:14px; margin-top:12px; }
.iw-root .text-form{ display:flex; flex-direction:column; min-height:470px; padding:12px; border:1px solid var(--p-hair); background:var(--p-paper-2); }
.iw-root .text-label{ font-family:var(--p-mono); font-size:10px; color:var(--p-ink-3); }
.iw-root .text-form textarea{ width:100%; flex:1; min-height:210px; margin-top:6px; padding:10px; border:1px solid var(--p-hair); background:var(--p-paper); color:var(--p-ink); font-family:var(--p-sans); font-size:12px; line-height:1.7; resize:vertical; }
.iw-root .text-form textarea:focus{ outline:none; border-color:var(--p-hair); box-shadow:none; }
.iw-root .text-options{ display:flex; flex-wrap:wrap; gap:18px; margin-top:10px; }
.iw-root .text-field{ display:flex; flex-direction:column; gap:5px; font-family:var(--p-mono); font-size:10px; color:var(--p-ink-3); }
.iw-root .text-form-foot{ display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:auto; padding-top:12px; }
.iw-root .text-form-foot>span{ font-family:var(--p-mono); font-size:10px; color:var(--p-ink-3); }
.iw-root .text-form-foot .go{ width:auto; min-width:120px; margin:0; padding:0 18px; }
.iw-root .text-result{ position:relative; min-height:470px; display:flex; align-items:center; justify-content:center; border:1px solid var(--p-hair); background:var(--p-sunken); overflow:hidden; }
.iw-root .text-result img[hidden],.iw-root .text-result .text-result-actions[hidden]{ display:none; }
.iw-root .text-result img{ display:block; max-width:100%; max-height:calc(100vh - 230px); object-fit:contain; }
.iw-root .text-empty{ font-family:var(--p-mono); font-size:10px; color:var(--p-ink-4); }
.iw-root .text-result-actions{ position:absolute; right:10px; bottom:10px; display:flex; gap:6px; }
@media (max-width:900px){.iw-root .text-layout{grid-template-columns:1fr;} .iw-root .text-form{min-height:0;} .iw-root .text-result{min-height:320px;}}
.iw-root .work[hidden],.iw-root .recent-page[hidden]{ display:none; }
.iw-root .page[data-wf-view="flow"]>.masthead{width:100%;max-width:none;min-height:56px;margin:0;padding:10px 20px;display:flex;flex-direction:row;align-items:center;gap:12px;border-bottom:1px solid var(--p-hair)}
.iw-root .page[data-wf-view="flow"]>.masthead::after,.iw-root .page[data-wf-view="flow"] .stamp{display:none}
.iw-root .page[data-wf-view="flow"] .title{font:600 17px/1.25 var(--p-sans);letter-spacing:-.02em;margin-right:auto}
.iw-root .mast-tools #workflowRun{width:auto;height:34px;margin:0;padding:0 12px;white-space:nowrap}
.iw-root .page>.masthead button[hidden],.iw-root #viewTabs[hidden],.iw-root .wf[hidden]{display:none}
.iw-root .wf-drop{position:absolute;inset:0;z-index:12;display:grid;place-content:center;justify-items:center;gap:6px;background:#080b12cc;border:2px dashed var(--wf-accent);color:#eef2ff;opacity:0;pointer-events:none;transition:opacity .18s}
.iw-root .wf-drop.on{opacity:1}
.iw-root .wf-drop b{font:600 18px var(--p-sans)}.iw-root .wf-drop span{font:10px var(--p-mono);color:#aeb8d2}
.iw-root .wf-replace{width:min(560px,calc(100% - 32px));max-height:calc(100% - 32px);margin:auto;padding:20px;border:1px solid #3c4252;border-radius:16px;background:#11141b;color:#f0f3fa;font:13px var(--p-sans)}
.iw-root .wf-replace::backdrop{background:#060810cc}
.iw-root .wf-replace h2{margin:0 0 14px;font:650 18px var(--p-sans)}
.iw-root .wf-replace-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.iw-root .wf-replace figure{margin:0;padding:6px;background:#1a1e28;border:1px solid #333a49;border-radius:10px}
.iw-root .wf-replace img{display:block;width:100%;aspect-ratio:4/3;object-fit:contain;background:#07090d;border-radius:6px}
.iw-root .wf-replace figcaption{margin-top:5px;font:10px var(--p-mono);color:#aeb8d2}
.iw-root .wf-replace p{margin:14px 0;font-size:12px;color:#aeb8d2;line-height:1.6}
.iw-root .wf-replace-actions{display:flex;justify-content:flex-end;gap:8px}
.iw-root .wf-replace-ok{height:32px;padding:0 16px;border:0;border-radius:8px;background:#e8edf9;color:#151a24;font:600 12px var(--p-sans);cursor:pointer}
.iw-root .wf{--wf-accent:#3655a2;--wf-on:#fff;--wf-dots:rgba(44,52,65,.25);--wf-surface:var(--p-paper);--wf-rule:var(--p-hair);--wf-muted:var(--p-ink-3);width:100%;flex:1;color:var(--p-ink);background:var(--p-paper);container-type:inline-size;font:14px/1.5 var(--p-sans)}
html[data-ds-dark-theme] .iw-root .wf,body[data-ds-dark-theme] .iw-root .wf,.iw-root[data-theme="dark"] .wf{--wf-accent:#a2b9f5;--wf-on:#131b31;--wf-dots:rgba(182,199,231,.20)}
.iw-root .wf-workspace{display:grid;grid-template-columns:minmax(0,1fr);min-width:0}
.iw-root .wf-graph{position:relative;overflow:hidden;min-height:342px;padding:25px 20px 56px;display:grid;align-items:center;background-image:radial-gradient(circle,var(--wf-dots) .8px,transparent 1px);background-position:center;background-size:18px 18px;cursor:grab;touch-action:pan-y}
.iw-root .wf-graph:active{cursor:grabbing}
.iw-root .wf-nodes{position:relative;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:22px 18px;width:100%;max-width:760px;margin:auto;transform-origin:center;min-width:0}
.iw-root .wf-node{position:relative;z-index:1;min-width:0;min-height:70px;text-align:left;cursor:pointer;border:1px solid var(--wf-rule);border-radius:7px;background:var(--wf-surface);color:inherit;padding:9px 10px;font:inherit;transition:background .18s,border-color .18s}
.iw-root .wf-node:hover,.iw-root .wf-node[aria-pressed="true"]{border-color:var(--wf-accent)}
.iw-root .wf-node[aria-pressed="true"]{background:color-mix(in srgb,var(--wf-accent) 13%,var(--wf-surface))}
.iw-root .wf-node b,.iw-root .wf-node small{display:block}
.iw-root .wf-node b{font-size:13px;font-weight:650}
.iw-root .wf-node small{font-size:11.5px;color:var(--wf-muted);white-space:nowrap;text-overflow:ellipsis;overflow:hidden;margin-top:4px}
.iw-root .wf-node .number{display:inline-block;color:var(--wf-muted);font:11px var(--p-mono);margin-right:6px}

.iw-root .wf-edges{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none}
.iw-root .wf-edges path{fill:none;stroke:var(--wf-muted);stroke-width:1.2}.iw-root .wf-edges path.hot{stroke:var(--wf-accent);stroke-width:1.9}
.iw-root .wf-edges path.handoff{animation:iw-wf-handoff .62s ease-out both}
@keyframes iw-wf-handoff{from{stroke-width:3.6;opacity:.65}to{stroke-width:1.9;opacity:1}}
.iw-root .wf-zoom{position:absolute;left:14px;bottom:12px;display:flex;background:var(--wf-surface);border:1px solid var(--wf-rule);border-radius:6px}
.iw-root .wf-zoom button,.iw-root .wf-quiet{border:0;background:none;color:inherit;font:inherit;cursor:pointer;padding:5px 9px}
.iw-root .wf-quiet{font-size:12px;color:var(--wf-muted)}.iw-root .wf-quiet:hover{color:var(--wf-accent)}
.iw-root .wf-inspect{min-width:0;border-top:1px solid var(--wf-rule);padding:15px 18px 22px}
.iw-root .wf-inspect h2{font:650 15px var(--p-sans);margin:0 0 11px}
.iw-root .wf-row{display:flex;align-items:center;justify-content:space-between;gap:6px}
.iw-root .wf-field{display:grid;gap:5px;font-size:12px;color:var(--wf-muted);margin:0 0 10px}
.iw-root .wf-field :is(select,textarea,input){width:100%;color:var(--p-ink);background:var(--wf-surface);border:1px solid var(--wf-rule);border-radius:6px;padding:7px 8px;font:14px/1.55 var(--p-sans)}
.iw-root .wf-field textarea{resize:vertical}.iw-root .wf-check{display:block;margin:6px 0}
.iw-root .wf-sub{font-size:12px;color:var(--wf-muted);margin:8px 0 0;overflow-wrap:anywhere}
.iw-root .wf-sub:empty{display:none}
.iw-root .wf-prompt-grid{display:grid;grid-template-columns:minmax(140px,.65fr) minmax(0,1fr);gap:16px}
.iw-root .wf-pack{background:none;border:0;cursor:pointer;color:inherit;font:13px var(--p-sans);padding:8px;text-align:center;align-self:start}
.iw-root .wf-stack{position:relative;display:block;width:90px;height:97px;margin:0 auto 6px}
.iw-root .wf-stack img{position:absolute;left:0;top:0;width:72px;height:86px;object-fit:cover;border:4px solid #eee9df;border-bottom-width:11px;border-radius:4px;box-shadow:0 4px 9px #0007;transform:translateX(19px) rotate(13deg);transition:transform .2s}
.iw-root .wf-stack img:nth-last-child(2){transform:translateX(10px) rotate(6deg)}.iw-root .wf-stack img:last-child{transform:none}
.iw-root .wf-pack:hover .wf-stack img:first-child{transform:translateX(24px) rotate(17deg)}
.iw-root .wf-deck{position:fixed;inset:auto;width:100%;height:100%;max-width:none;max-height:none;margin:0;background:radial-gradient(ellipse at 50% 45%,#353f55,#1c212a 68%,#17191e);color:#eef0f5;border:0;padding:24px;overflow:auto;font:14px var(--p-sans)}
.iw-root .wf-deck[open]{display:flex;flex-direction:column;gap:24px;animation:iw-wf-reveal .3s ease both}
.iw-root .wf-deck::backdrop{background:#14161c}
.iw-root .wf-deck h2{font-size:21px;margin:0}
.iw-root .wf-deck .wf-quiet,.iw-root .wf-deck p{color:#c2c9d9}
.iw-root .wf-deck-cards{display:flex;flex-direction:column;gap:14px;width:min(100%,1050px);margin:0 auto;perspective:1100px;overflow:hidden}
.iw-root .wf-deck-row{display:flex;gap:14px;overflow-x:auto;overscroll-behavior-inline:contain;padding:12px 6px;scrollbar-width:thin;scrollbar-color:#5a6378 transparent}
.iw-root .wf-card{position:relative;flex:0 0 150px;width:150px;height:232px;padding:0;border:0;background:transparent;color:#272321;perspective:900px;animation:iw-wf-fan .55s cubic-bezier(.18,.85,.25,1) both;animation-delay:calc(var(--i) * 30ms)}
.iw-root .wf-card-inner{position:absolute;inset:0;transform-style:preserve-3d;transition:transform .5s cubic-bezier(.2,.8,.2,1)}
.iw-root .wf-card.flipped .wf-card-inner{transform:rotateY(180deg)}
.iw-root .wf-card-face{position:absolute;inset:0;backface-visibility:hidden;border-radius:6px;overflow:hidden;background:#eee9df;box-shadow:0 10px 23px #0007}
.iw-root .wf-card-front{display:grid;grid-template-rows:1fr auto;gap:5px;padding:5px 5px 7px;border:0;color:#272321;font:12px var(--p-sans);text-align:left;cursor:pointer}
.iw-root .wf-card-front img{width:100%;height:192px;object-fit:cover;border-radius:3px}
.iw-root .wf-card-front b{display:block;padding:2px 2px 0;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.iw-root .wf-card-back{transform:rotateY(180deg);display:flex;flex-direction:column;gap:5px;padding:8px;color:#e9edf6;background:#171b24;border:1px solid #3a4354}
.iw-root .wf-card-back textarea{flex:1;min-height:0;width:100%;padding:6px;border:1px solid #3a4354;border-radius:4px;background:#0d1017;color:#e9edf6;font:10px/1.5 var(--p-sans);resize:none}
.iw-root .wf-card-actions{display:flex;gap:3px;justify-content:flex-end}
.iw-root .wf-card-actions button{height:22px;padding:0 6px;border:1px solid #3a4354;border-radius:4px;background:#202633;color:#dfe7f8;font:9px var(--p-sans);cursor:pointer}
.iw-root .wf-card-actions button:last-child{background:#e8edf9;color:#151a24;border-color:#e8edf9}

.iw-root .wf-card{display:grid;min-width:0;gap:6px;padding:5px 5px 7px;cursor:pointer;background:#eee9df;color:#272321;border:0;border-radius:5px;font:13px var(--p-sans);box-shadow:0 10px 23px #0007;transition:transform .24s;animation:iw-wf-fan .66s cubic-bezier(.18,.85,.25,1) both;animation-delay:calc(var(--i) * 44ms)}
.iw-root .wf-card[aria-pressed="true"]{outline:2px solid #9cb7ff;outline-offset:2px}
.iw-root .wf-card img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:2px;pointer-events:none}
.iw-root .wf-card.hot{transform:translateY(-9px) scale(1.045) rotateX(var(--rx)) rotateY(var(--ry));z-index:2}
.iw-root .wf-card.chosen{z-index:3;animation:iw-wf-pick .24s ease both}
@keyframes iw-wf-fan{from{opacity:0;translate:0 30px;scale:.83}to{opacity:1;translate:0;scale:1}}
@keyframes iw-wf-pick{to{opacity:0;translate:0 -48px;scale:1.12}}
.iw-root .wf-print{padding:14px 0;display:grid;justify-items:center}
.iw-root .wf-slot{width:min(100%,230px);height:15px;background:#14161a;border:1px solid #696e78;border-radius:4px;z-index:2}
.iw-root .wf-exit{width:100%;overflow:hidden;display:grid;justify-items:center;padding-bottom:12px}
.iw-root .wf-photo{position:relative;color:#292622;background:#f3ede0;box-shadow:0 6px 15px #0005;padding:8px;width:min(190px,90%);margin:0;transform-origin:50% 0;transform:rotate(-2deg)}
.iw-root .wf-photo img{display:block;width:100%;aspect-ratio:1;object-fit:contain;background:#241f20}
.iw-root .wf-photo figcaption,.iw-root .wf-compare figcaption{margin-top:6px;font-size:11.5px}
.iw-root .wf-photo::after{content:"";position:absolute;inset:8px 8px 25px;background:#fbf1d8;pointer-events:none;opacity:0}
.iw-root .wf-ribbon{position:absolute;inset:0;z-index:1;pointer-events:none}
.iw-root .wf-ribbon::before,.iw-root .wf-ribbon::after{content:"";position:absolute;opacity:0;background:linear-gradient(90deg,#82648f,#bd9ac4,#8f6ca0)}
.iw-root .wf-ribbon::before{inset:0 46%}.iw-root .wf-ribbon::after{inset:46% 0}
.iw-root .wf-photo.play{animation:iw-wf-print 1s cubic-bezier(.22,.7,.17,1) both}
.iw-root .wf-photo.play::after{animation:iw-wf-develop 1.7s ease both}
.iw-root .wf-photo.play .wf-ribbon::before{animation:iw-wf-ribbon-v 1.3s ease both}.iw-root .wf-photo.play .wf-ribbon::after{animation:iw-wf-ribbon-h 1.2s ease both}
@keyframes iw-wf-print{from{transform:translateY(-105%);clip-path:inset(100% 0 0)}70%{transform:translateY(-3%);clip-path:inset(3% 0 0)}to{transform:rotate(-2deg);clip-path:inset(0 0 -10px -10px)}}
@keyframes iw-wf-develop{0%,39%{opacity:1}100%{opacity:0}}
@keyframes iw-wf-ribbon-v{0%,52%{opacity:.92;transform:none}100%{opacity:0;transform:translate(25px,-40px) rotate(23deg)}}
@keyframes iw-wf-ribbon-h{0%,55%{opacity:.92;transform:none}100%{opacity:0;transform:translate(-59px,11px) rotate(-14deg)}}
@keyframes iw-wf-reveal{from{opacity:0}to{opacity:1}}
.iw-root .wf-compare{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:12px 0}
.iw-root .wf-compare figure,.iw-root #wfSource figure{margin:0}
.iw-root #wfSource img{display:block;width:min(190px,100%);max-height:200px;object-fit:contain}
.iw-root .wf-compare img,.iw-root .wf-placeholder{display:block;width:100%;aspect-ratio:1;object-fit:contain;background:var(--wf-surface);border:1px solid var(--wf-rule);border-radius:4px}
.iw-root .wf-placeholder{display:grid;place-items:center;text-align:center;color:var(--wf-muted);font-size:11px;padding:5px}
.iw-root #wfHistory:not(:empty){padding:8px 0 12px;border-bottom:1px solid var(--p-hair)}
.iw-root #wfHistory h3{font-size:13px;margin:0 0 5px}
.iw-root #wfHistory button{margin:4px 8px 4px 0}
.iw-root .wf-history-item{display:flex;align-items:center;gap:6px;flex-wrap:wrap;border-bottom:1px solid var(--p-hair-2);padding:2px 0}
.iw-root .wf-history-thumb{width:30px;height:30px;object-fit:cover;border:1px solid var(--p-hair);border-radius:3px;background:var(--p-paper-2);flex:none}
.iw-root .wf-history-item>.ghost-btn{max-width:calc(100% - 8px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.iw-root .wf-history-versions{display:flex;gap:3px;flex-wrap:wrap;margin-left:auto}
.iw-root .wf-history-chip{height:20px;padding:0 5px;border:1px solid var(--p-hair);background:var(--p-paper);color:var(--p-ink-4);font:8px var(--p-mono);cursor:pointer}
.iw-root .wf-history-chip:hover{border-color:var(--p-signal);color:var(--p-ink)}
.iw-root .wf-final{animation:iw-wf-reveal .43s ease both}
.iw-root .wf :is(button,select,input,textarea,a):focus-visible,.iw-root #workflowRun:focus-visible{outline:2px solid var(--wf-accent,#5576c1);outline-offset:2px}
@container (min-width:900px){.iw-root .wf-workspace{grid-template-columns:minmax(0,1fr) minmax(294px,29%);min-height:570px}.iw-root .wf-inspect{border-top:0;border-left:1px solid var(--wf-rule)}.iw-root .wf-prompt-grid{grid-template-columns:1fr}}
@container (max-width:550px){.iw-root .wf-nodes{grid-template-columns:repeat(2,minmax(0,1fr));gap:23px 15px}.iw-root .wf-prompt-grid{grid-template-columns:1fr}.iw-root .wf-node{min-height:61px}}
@media (max-width:680px){.iw-root .page[data-wf-view="flow"]>.masthead{flex-wrap:wrap;padding-inline:12px}.iw-root .wf-deck{padding:16px}.iw-root .wf-deck-cards{grid-template-columns:repeat(auto-fit,minmax(92px,1fr));gap:12px}}
@media (prefers-reduced-motion: reduce){.iw-root .wf *,.iw-root .wf *::before,.iw-root .wf *::after{animation:none!important;transition:none!important}}

.iw-root .wf{position:relative;--wf-surface:#0e0f12;--wf-rule:#393a40;--wf-muted:#afb0ba;--wf-accent:#ff7777;--wf-on:#252629;background:#040506;color:#f6f6f7;--p-ink:#f6f6f7}
.iw-root .page[data-wf-view="flow"]>.masthead{background:#101114;color:#eee;border:1px solid #32333a;border-radius:12px;width:calc(100% - 24px);margin:8px 12px 0;min-height:48px}
.iw-root .page[data-wf-view="flow"] .mast-tools .icon-btn{color:#eee;background:#1b1c20;border-color:#393a40;border-radius:999px}
.iw-root .wf-workspace{display:grid;grid-template-columns:minmax(0,1fr) minmax(300px,30%);min-height:570px;position:relative}
.iw-root .wf-graph{isolation:isolate;min-height:335px;padding-bottom:74px;background-image:radial-gradient(circle,#ffffff20 .7px,transparent .9px)}
.iw-root .wf-node{height:66px;min-height:66px;text-align:center;border-radius:16px;padding:7px;background:#101114ed;box-shadow:inset 0 1px #fff1,inset 0 -1px #0008}
.iw-root .wf-node small:empty{display:none}
.iw-root .wf-runbar{position:absolute;bottom:15px;left:50%;transform:translateX(-50%);text-align:center;z-index:2}
.iw-root .wf-runbar .go{height:34px;width:auto;margin:0;padding:0 15px;background:#e6e6e6;color:#303137;border:0;border-radius:8px;white-space:nowrap}
.iw-root .wf-runbar .wf-sub{margin:5px 0 0;width:max-content;max-width:56vw}
.iw-root .wf-inspect{border:0;border-top:1px solid var(--wf-rule);background:#0b0c0e;padding:14px 20px}
.iw-root .wf-inspect[data-kind=option]{position:absolute;left:var(--wf-popup-x,12px);top:var(--wf-popup-y,64px);z-index:5;width:min(226px,calc(100% - 16px));padding:10px;border:1px solid #44454b;background:#16171aeb;border-radius:15px;backdrop-filter:blur(17px)}
.iw-root .wf-field :is(select,textarea,input){color:#f6f6f7}
.iw-root .wf-field select,.iw-root .wf-field input[type=number]{height:34px}
.iw-root .wf-field select:focus{outline:2px solid #a5a5ab;outline-offset:2px;border-color:#a5a5ab}
.iw-root .wf-prompt-grid{display:block}
.iw-root .wf-prompt-grid .wf-row{margin-bottom:9px;flex-wrap:wrap}
.iw-root .wf-style-chip{display:inline-flex;align-items:center;gap:7px}
.iw-root .wf-style-chip img{width:24px;height:24px;object-fit:cover;border-radius:5px}
.iw-root .wf-prompt-field{position:relative}
.iw-root .wf-prompt-field::before,.iw-root .wf-prompt-field::after{content:"";position:absolute;right:8px;width:0;height:2px;background:#ff6363;transition:width .4s ease;pointer-events:none}
.iw-root .wf-prompt-field::before{top:0}.iw-root .wf-prompt-field::after{bottom:0}
.iw-root .wf-prompt-field:focus-within::before{width:35%}.iw-root .wf-prompt-field:focus-within::after{width:calc(100% - 16px)}
.iw-root .wf-prompt-field textarea{display:block;background:#111214;min-height:155px}
.iw-root .wf-inspect[data-kind=output]{position:absolute;z-index:4;inset:0 0 auto;min-height:335px;display:grid;place-items:center;align-content:center;background:#08090dd9;isolation:isolate;overflow:hidden}
.iw-root .wf-inspect[data-kind=output] h2{margin:0 0 6px}
.iw-root .wf-inspect[data-kind=output] #wfBody{width:min(390px,90%);text-align:center}
.iw-root .wf-return{position:absolute;right:12px;top:12px}
.iw-root .wf-hole{position:absolute;z-index:-1;left:50%;top:53%;width:min(64%,310px);aspect-ratio:1;translate:-50% -50%;border-radius:50%;background:radial-gradient(circle,#07080a 26%,#452324 35%,#db5360 41%,#ffd2d2 45%,transparent 55%);opacity:0}
.iw-root .wf-hole.play{animation:wf-wormhole 1.3s ease-out both}
.iw-root .wf-photo.play{animation:wf-wormphoto 1.1s cubic-bezier(.16,.7,.22,1) both}
.iw-root .wf-print{padding:0}
@keyframes wf-wormhole{0%{scale:.12;opacity:0}35%{opacity:1}100%{scale:1.4;opacity:0}}
@keyframes wf-wormphoto{0%,23%{transform:scale(.25) rotate(-14deg);opacity:0;clip-path:circle(0%)}100%{transform:rotate(-2deg);opacity:1;clip-path:circle(86%)}}
.iw-root .wf-deck{background:#15161ae8;backdrop-filter:blur(17px);border:1px solid #44454b;border-radius:16px;z-index:20}
.iw-root .wf-card{background:linear-gradient(150deg,#ffffff19,#ffffff06),#202126;color:#f2f2f4;border:1px solid #ffffff24;border-radius:12px;box-shadow:inset 0 1px #fff2}
.iw-root .wf-card img{border-radius:7px}.iw-root .wf-card span{padding:4px;border-top:1px solid #ffffff20}
.iw-root .wf-card:not(.hot){transform:translateX(calc(var(--spread,0)*-8px)) rotate(calc(var(--spread,0)*2deg));transition:transform .45s cubic-bezier(.16,1,.3,1)}
.iw-root .wf-deck-cards:is(:hover,:focus-within) .wf-card:not(.hot){transform:none}
.iw-root .wf-deck .wf-card[aria-pressed=true]{outline:1px solid #ff8b8b}
.iw-root .wf-scene[data-paused]::before,.iw-root .wf-scene[data-paused]::after{animation-play-state:paused}
.iw-root .wf[data-motion=off] *,.iw-root .wf[data-motion=off] *::before,.iw-root .wf[data-motion=off] *::after{animation:none!important;transition:none!important}

 .iw-root .wf .wf-scene{position:absolute;z-index:-1;inset:0;overflow:hidden;pointer-events:none;background:radial-gradient(ellipse at 77% -12%,#551c2c 0%,transparent 59%),radial-gradient(ellipse at 6% 111%,#171e3d 0%,transparent 60%)}
 .iw-root .wf .wf-scene::before, .iw-root .wf .wf-scene::after{content:"";position:absolute;inset:-55% -25%;transform:rotate(-27deg) translate3d(0,-4%,0);filter:blur(17px);opacity:.86;animation:iwr-rays 12s ease-in-out infinite alternate}
 .iw-root .wf .wf-scene::before{background:linear-gradient(90deg,transparent 25%,#3e153c 31%,transparent 35%,#a32b48 43%,#de5668 45%,#6a192c 49%,transparent 54%,#732435 62%,transparent 69%);mask-image:radial-gradient(ellipse at 57% 44%,#000 4%,#000c 29%,transparent 69%)}
 .iw-root .wf .wf-scene::after{background:linear-gradient(90deg,transparent 12%,#241f55 29%,transparent 36%,#302653 41%,transparent 49%,#af3947 59%,transparent 66%);opacity:.65;animation-duration:17s;animation-delay:-5s}
 .iw-root .wf .wf-scene[data-paused]::before, .iw-root .wf .wf-scene[data-paused]::after{animation-play-state:paused}
@keyframes iwr-rays{to{transform:rotate(-23deg) translate3d(5%,9%,0)}}
 .iw-root .wf .wf-scene{background:radial-gradient(ellipse at 77% 2%,#492034,transparent 62%),radial-gradient(ellipse at 27% 94%,#143ca380,transparent 65%)}
 .iw-root .wf .wf-scene::before{background:linear-gradient(90deg,transparent 23%,#452324 30%,transparent 34%,#a52d48 40%,#ff6363 44%,#8e2b42 49%,transparent 54%,#9b3145 62%,transparent 68%);filter:blur(25px)}
 .iw-root .wf .wf-scene::after{background:linear-gradient(90deg,transparent 15%,#02193b 27%,#143ca3 33%,#63a1ff 36%,transparent 42%,#143ca3 51%,#6652a5 56%,transparent 64%);filter:blur(31px);opacity:.6}
 .iw-root .wf-remove-source{position:absolute;left:12px;top:6px;z-index:3}
.iw-root .wf #workflowRun{position:relative;overflow:hidden;isolation:isolate}
.iw-root .wf #workflowRun::before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(110deg,transparent 28%,#fff8 48%,transparent 68%);transform:translateX(-110%);pointer-events:none}
.iw-root .wf #workflowRun:is(:hover,:focus-visible):not(:disabled)::before{animation:wf-sweep .48s ease-out both}
@keyframes wf-sweep{to{transform:translateX(110%)}}
.iw-root .wf-switch{position:relative;display:inline-block;width:48px;height:27px;padding:2px;border-radius:7px;background:linear-gradient(#55575a,#28292d)}
.iw-root .wf-switch input{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;z-index:1;cursor:pointer}
.iw-root .wf-switch>span{display:block;position:relative;height:100%;border-radius:5px;background:#36373a;box-shadow:inset 0 2px 4px #0008}
.iw-root .wf-switch i{display:block;position:absolute;top:1px;left:1px;width:21px;height:21px;border-radius:4px;background:radial-gradient(circle,#929497 .8px,transparent 1px) center/3.3px 3.3px,linear-gradient(#f4f4f4,#c5c6c7);transition:transform .28s}
.iw-root .wf-switch input:checked+span{background:#a83944}.iw-root .wf-switch input:checked+span i{transform:translateX(21px)}
.iw-root .wf-switch input:focus-visible+span{outline:2px solid #a5a5ab;outline-offset:3px}
.iw-root .page[data-wf-view="flow"]~#settingsLayer .drawer{background:#17181a;color:#eee}
.iw-root .recent-page{ margin-top:16px; padding-bottom:36px; }
.iw-root .recent-head{ display:flex; align-items:flex-end; justify-content:space-between; gap:12px; padding-bottom:9px; border-bottom:1px solid var(--p-hair); }
.iw-root .recent-head h2{ margin:0; font-family:var(--p-serif); font-size:26px; font-weight:500; letter-spacing:var(--pk-ls-title); }
.iw-root .recent-head span{ display:block; margin-top:3px; font-family:var(--p-mono); font-size:10px; color:var(--p-ink-4); }
.iw-root .recent-grid{ display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; margin-top:12px; }
.iw-root .recent-card{ min-width:0; padding:5px; border:1px solid var(--p-hair); background:var(--p-paper-2); text-align:left; }
.iw-root .recent-open{ display:block; width:100%; padding:0; border:0; background:none; text-align:left; cursor:pointer; }
.iw-root .recent-edit{ margin-top:5px; height:22px; padding:0 7px; border:1px solid var(--p-hair); background:var(--p-paper); color:var(--p-ink-3); font-family:var(--p-mono); font-size:9px; cursor:pointer; }
.iw-root .recent-card:hover .recent-edit{ border-color:var(--p-ink-3); color:var(--p-ink); }
.iw-root .recent-card:hover{ border-color:var(--p-ink-3); }
.iw-root .recent-head-actions{ display:flex; gap:6px; align-items:center; }
.iw-root .recent-archive-btn{ display:inline-flex; align-items:center; gap:5px; }
.iw-root .recent-archive-btn b{ min-width:15px; height:15px; padding:0 4px; display:inline-flex; align-items:center; justify-content:center; background:var(--p-sunken); color:var(--p-ink-3); font-family:var(--p-mono); font-size:9px; font-weight:400; }
.iw-root .recent-archive-btn.on{ color:var(--p-signal); border-color:var(--p-signal); background:var(--p-signal-plate); }
.iw-root .recent-archive-btn.on b{ background:var(--p-signal); color:var(--p-paper); }
.iw-root .recent-actions{ display:flex; gap:3px; margin-top:5px; }
.iw-root .rc-action{ width:24px; height:22px; display:inline-flex; align-items:center; justify-content:center; border:1px solid var(--p-hair); background:var(--p-paper); color:var(--p-ink-4); cursor:pointer; padding:0; }
.iw-root .rc-action:hover{ color:var(--p-ink); border-color:var(--p-ink-3); }
.iw-root .rc-action.on{ color:var(--p-signal); border-color:var(--p-signal); background:var(--p-signal-plate); }
.iw-root .rc-action svg{ width:12px; height:12px; }
.iw-root .recent-card img{ display:block; width:100%; aspect-ratio:4/3; object-fit:cover; background:var(--p-sunken); }
.iw-root .recent-card .rc-style{ display:block; margin-top:5px; font-family:var(--p-serif); font-size:13px; color:var(--p-ink); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.iw-root .recent-card .rc-meta{ display:block; margin-top:2px; font-family:var(--p-mono); font-size:9px; color:var(--p-ink-4); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.iw-root .recent-empty{ grid-column:1 / -1; padding:42px 12px; text-align:center; font-family:var(--p-mono); font-size:10px; color:var(--p-ink-4); }
@media (max-width:1100px){.iw-root .recent-grid{grid-template-columns:repeat(3,minmax(0,1fr));}}
@media (max-width:760px){.iw-root .recent-grid{grid-template-columns:repeat(2,minmax(0,1fr));}}
.iw-root .work{
  flex: 1 0 auto;
  display: grid; grid-template-columns: 228px minmax(0, 1fr) 224px;
  padding-top: 12px; padding-bottom: 4px;
}
.iw-root .rail{ padding-right: 16px; }
.iw-root .stage-col{ min-width: 0; padding: 0 18px; }
.iw-root .inspector{display:flex;flex-direction:column; padding-left: 16px; padding-right: 16px; }
.iw-root .seg{ display: flex; gap: 2px; padding: 2px; background: var(--p-sunken); border-radius: 8px; }
.iw-root .seg button{
  flex: 1; height: 22px; border: 0; border-radius: 5px; background: transparent;
  font-size: 10px; color: var(--p-ink-3); transition: color .15s, background-color .15s;
}
.iw-root .seg button:hover{ color: var(--p-ink); }
.iw-root .seg button.on{ background: var(--p-paper-2); color: var(--p-ink); box-shadow: 0 1px 0 rgba(27,24,19,.05), inset 0 0 0 1px var(--p-hair); }
.iw-root .search{
  display: flex; align-items: center; gap: 8px; height: 28px; margin-top: 8px; padding: 0 8px;
  border: 1px solid var(--p-hair); border-radius: 8px; background: var(--p-paper-2);
  color: var(--p-ink-4);
}
.iw-root .search svg{ flex: none; }
.iw-root .search input{ flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; font-size: 11.5px; color: var(--p-ink); }
.iw-root .search input::placeholder{ color: var(--p-ink-4); }
.iw-root .search kbd{
  font-family: var(--p-mono); font-size: 10px; color: var(--p-ink-4);
  border: 1px solid var(--p-hair); border-radius: 0px; padding: 0 3px;
}
.iw-root .sec-head{ display: flex; align-items: baseline; gap: 8px; margin-top: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--p-hair); }
.iw-root .sec-head h2{ margin: 0; font-family: var(--p-serif); font-size: 22px; font-weight: 600; letter-spacing: var(--pk-ls-title); }
.iw-root .count{ font-family: var(--p-mono); font-size: 10px; letter-spacing: var(--pk-ls-label); color: var(--p-ink-3); }
.iw-root .styles{ display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px; max-height: 56vh; overflow-y: auto; padding-right: 2px; overscroll-behavior: contain; }
.iw-root .card{
  position: relative; display: block; padding: 0; overflow: hidden; text-align: left;
  border: 1px solid var(--p-hair); border-radius: 0; background: var(--p-paper-2);
  transition: border-color .15s var(--p-ease);
}
.iw-root .card-wrap{ position: relative; min-width: 0; }
.iw-root .card-wrap .card{ width: 100%; }
.iw-root .card-zoom{ position: absolute; top: 4px; left: 4px; z-index: 2; width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; padding: 0; border: 1px solid var(--p-hair); background: var(--p-paper-2); color: var(--p-ink-3); opacity: .55; transition: opacity .12s, color .12s, border-color .12s; }
.iw-root .card-wrap:hover .card-zoom,.iw-root .card-wrap:focus-within .card-zoom,.iw-root .card-zoom:focus{ opacity: 1; }
.iw-root .card-zoom:hover{ color: var(--p-signal); border-color: var(--p-signal); }
@media (hover:none){.iw-root .card-zoom{opacity:1;}}
.iw-root .card:hover{ border-color: var(--p-ink-3); }
.iw-root .card.on{ border-color: var(--p-ink); box-shadow: 0 0 0 1px var(--p-ink); }
.iw-root .card img{ display: block; width: 100%; aspect-ratio: 16 / 10; object-fit: cover; background: var(--p-sunken); }
.iw-root .card .cap{ display: block; padding: 4px 4px 4px; }
.iw-root .card .nm{ display: block; font-size: 10px; font-weight: 500; line-height: 1.25; letter-spacing: var(--pk-ls-title); color: var(--p-ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.iw-root .card .mt{
  display: flex; justify-content: space-between; gap: 4px; margin-top: 2px;
  font-family: var(--p-mono); font-size: 10px; letter-spacing: var(--pk-ls-ui); color: var(--p-ink-3);
}
.iw-root .card .mt .price{ color: var(--p-signal); }
.iw-root .card .tick{
  position: absolute; top: 4px; right: 4px; width: 13px; height: 13px;
  display: none; align-items: center; justify-content: center;
  background: var(--p-signal); color: #fff; font-size: 10px; line-height: 1;
}
.iw-root .card.on .tick{ display: flex; }
.iw-root .rail-note{
  margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--p-hair-2);
  font-family: var(--p-mono); font-size: 10px; line-height: 1.65; color: var(--p-ink-4);
}
.iw-root .stage-model{ display:inline-flex; align-items:center; gap:2px; margin-right:6px; }
.iw-root .stage-model button{ height:20px; padding:0 5px; border:1px solid var(--p-hair); background:transparent; color:var(--p-ink-4); font-family:var(--p-mono); font-size:9px; cursor:pointer; }
.iw-root .stage-model button.on{ background:var(--p-ink); border-color:var(--p-ink); color:var(--p-paper); }
.iw-root .stage-bar{
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  height: 22px; margin-bottom: 10px; font-family: var(--p-mono); font-size: 10px; letter-spacing: var(--pk-ls-mono); color: var(--p-ink-3);
}
.iw-root .stage-bar .r{ display: flex; align-items: center; gap: 8px; }
.iw-root .link-btn{
  border: 0; background: transparent; padding: 0; color: var(--p-ink-3);
  font-family: var(--p-mono); font-size: 10px; letter-spacing: var(--pk-ls-mono);
}
.iw-root .link-btn:hover{ color: var(--p-ink); }
.iw-root .stage{
  position: relative; height: 404px; display: flex; align-items: center; justify-content: center;
  border: 1px solid var(--p-hair); background: var(--p-paper-2); overflow: hidden;
}
.iw-root .stage.drag{ border-color: var(--p-signal); }
.iw-root .stage.drag::after{
  content: "松开以载入图片"; position: absolute; inset: 10px;
  display: flex; align-items: center; justify-content: center;
  border: 1px dashed var(--p-signal); background: var(--p-signal-plate);
  color: var(--p-signal-ink); font-family: var(--p-mono); font-size: 10px; letter-spacing: var(--pk-ls-label);
}
.iw-root .print-frame{ display:flex; align-items:center; justify-content:center; max-width:calc(100% - 16px); max-height:calc(100% - 16px); }
.iw-root .print-frame.frame-polaroid{ padding:9px 9px 32px; background:#f6efe1; box-shadow:0 8px 26px rgba(40,30,20,.16); }
.iw-root .print-frame.frame-film{ padding:9px; background:#111; box-shadow:0 8px 26px rgba(0,0,0,.25); }
.iw-root .print-frame.frame-paper{ padding:12px; background:#fff; box-shadow:0 8px 26px rgba(40,30,20,.14); }
.iw-root .print{ position: relative; background: #fff; }
.iw-root .print img[hidden]{ display:none; }
.iw-root .print img{ position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
.iw-root .print .result{ z-index: 1; }
.iw-root .print .base{ z-index: 2; object-position: 50% 62%; }
.iw-root .print .base{ clip-path: inset(0 calc(100% - var(--split, 50%)) 0 0); display: none; }
.iw-root .print.compare .base{ display: block; }
.iw-root .print.original-only .result{ display: none; }
.iw-root .print.original-only .base{ display: block; clip-path: none; z-index: 1; }
.iw-root .split{
  position: absolute; z-index: 3; top: 0; bottom: 0; left: var(--split, 50%); width: 1px;
  background: #fff; box-shadow: 0 0 0 1px rgba(0,0,0,.16); display: none; cursor: ew-resize;
}
.iw-root .print.compare .split{ display: block; }
.iw-root .split::after{
  content: ""; position: absolute; top: 50%; left: 50%; width: 22px; height: 22px;
  transform: translate(-50%, -50%); border-radius: 50%; background: #fff;
  border: 1px solid rgba(0,0,0,.14);
}
.iw-root .cmp-label{
  position: absolute; z-index: 4; top: 8px; display: none; padding: 2px 4px;
  background: rgba(20,16,12,.72); color: #faf6ee;
  font-family: var(--p-mono); font-size: 10px; letter-spacing: var(--pk-ls-label);
}
.iw-root .print.compare .cmp-label{ display: block; }
.iw-root .cmp-label.l{ left: 8px; }
.iw-root .cmp-label.r{ right: 8px; }
.iw-root .crops i{ position: absolute; width: 8px; height: 8px; border: 0 solid var(--p-ink-3); }
.iw-root .crops i:nth-child(1){ top: -7px; left: -7px; border-top-width: 1px; border-left-width: 1px; }
.iw-root .crops i:nth-child(2){ top: -7px; right: -7px; border-top-width: 1px; border-right-width: 1px; }
.iw-root .crops i:nth-child(3){ bottom: -7px; left: -7px; border-bottom-width: 1px; border-left-width: 1px; }
.iw-root .crops i:nth-child(4){ bottom: -7px; right: -7px; border-bottom-width: 1px; border-right-width: 1px; }
.iw-root .stage-cap{
  display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding-top: 4px;
  font-family: var(--p-mono); font-size: 10px; letter-spacing: var(--pk-ls-ui); color: var(--p-ink-3);
}
.iw-root .stage-cap b{ font-weight: 500; color: var(--p-ink-2); }
.iw-root .proof{ margin-top: 8px; }
.iw-root .proof-head{ display: flex; align-items: baseline; gap: 8px; padding-bottom: 4px; border-bottom: 1px solid var(--p-hair); }
.iw-root .proof-head h3{ margin: 0; font-family: var(--p-serif); font-size: 14px; font-weight: 600; letter-spacing: var(--pk-ls-title); }
.iw-root .proof-actions{ display: flex; align-items: center; gap: 2px; margin-left: auto; }
.iw-root .ghost-btn{
  height: 22px; padding: 0 6px; border: 0; background: transparent;
  font-family: var(--p-mono); font-size: 10px; letter-spacing: var(--pk-ls-mono); color: var(--p-ink-3);
}
.iw-root .ghost-btn:hover{ color: var(--p-ink); background: var(--p-sunken); }
.iw-root .ghost-btn[aria-pressed="true"]{ color: var(--p-signal); }
.iw-root .proof-grid{ display: grid; grid-template-columns: repeat(var(--cols, 3), minmax(0, 1fr)); gap: 8px; margin-top: 8px; }
.iw-root .pcard{
  position: relative; padding: 0; text-align: left; border: 1px solid var(--p-hair);
  background: var(--p-paper-2); overflow: hidden;
}
.iw-root .pcard:hover{ border-color: var(--p-ink-3); }
.iw-root .pcard.on{ border-color: var(--p-signal); }
.iw-root .pcard.on::before{ content: ""; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: var(--p-signal); z-index: 1; }
.iw-root .pcard img{ display: block; width: 100%; aspect-ratio: 16 / 10; object-fit: cover; background: var(--p-sunken); }
.iw-root .pcard .pcap{
  display: flex; justify-content: space-between; gap: 4px; padding: 4px 4px 4px;
  font-family: var(--p-mono); font-size: 10px; letter-spacing: var(--pk-ls-ui); color: var(--p-ink-3);
}
.iw-root .pcard .pcap b{ font-weight: 500; color: var(--p-ink-2); }
.iw-root .pcard .pcap .demo{ color: var(--p-signal); }
.iw-root .pcard.loading .ph{
  aspect-ratio: 16 / 10;
  background: linear-gradient(100deg, var(--p-sunken) 30%, var(--p-paper-2) 50%, var(--p-sunken) 70%);
  background-size: 220% 100%; animation: sweep 1.2s infinite linear;
}

@keyframes sweep { to { background-position: -120% 0; } }
.iw-root .proof-empty{
  grid-column: 1 / -1; padding: 16px 12px; border: 1px dashed var(--p-hair);
  color: var(--p-ink-4); font-family: var(--p-mono); font-size: 10px; text-align: center;
}
.iw-root .ins-head{ display: flex; align-items: baseline; justify-content: space-between; padding-bottom: 4px; border-bottom: 1px solid var(--p-hair); }
.iw-root .ins-head h2{ margin: 0; font-family: var(--p-serif); font-size: 22px; font-weight: 600; letter-spacing: var(--pk-ls-title); }
.iw-root .chips{ margin-top: 2px; }
.iw-root .chip{ display: flex; align-items: center; gap: 8px; padding: 5px 0; border-bottom: 1px solid var(--p-hair-2); }
.iw-root .chip img{ width: 24px; height: 22px; object-fit: cover; border: 1px solid var(--p-hair); flex: none; }
.iw-root .chip .cname{ font-size: 11.5px; font-weight: 500; letter-spacing: var(--pk-ls-title); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.iw-root .chip .ctag{ font-family: var(--p-mono); font-size: 10px; letter-spacing: var(--pk-ls-mono); color: var(--p-ink-3); }
.iw-root .chip .x{
  margin-left: auto; width: 18px; height: 18px; border: 0; background: transparent;
  color: var(--p-ink-4); font-size: 11.5px; line-height: 1; flex: none;
}
.iw-root .chip .x:hover{ color: var(--p-signal); }
.iw-root .prompt-textarea{ width:100%; min-height:112px; margin-top:6px; padding:9px 10px; border:1px solid var(--p-hair); background:var(--p-paper); color:var(--p-ink); font-family:var(--p-sans); font-size:12px; line-height:1.65; resize:vertical; }
.iw-root .prompt-textarea:focus, .iw-root .prompt-textarea:focus-visible{ outline:none; border-color:var(--p-hair); box-shadow:none; }
.iw-root .prompt-actions{ display:flex; justify-content:flex-end; gap:4px; margin-top:4px; }
.iw-root .chips-empty{ padding: 10px 0; font-family: var(--p-mono); font-size: 10px; color: var(--p-ink-4); }
.iw-root .ins-group{ margin-top: 10px; border: 1px solid var(--p-hair); background: var(--p-paper-2); }
.iw-root .ins-group>summary{ list-style: none; cursor: pointer; display: flex; align-items: center; gap: 7px; padding: 8px; background: var(--p-sunken); color: var(--p-ink-2); }
.iw-root .ins-group>summary::-webkit-details-marker{ display: none; }
.iw-root .ins-group>summary::before{ content: "▸"; font-size: 10px; color: var(--p-ink-3); }
.iw-root .ins-group[open]>summary::before{ content: "▾"; }
.iw-root .ins-group>summary span:first-of-type{ font-family: var(--p-mono); font-size: 11px; font-weight: 500; letter-spacing: var(--pk-ls-label); color: var(--p-ink-2); }
.iw-root .ins-group-hint{ margin-left: auto; font-family: var(--p-mono); font-size: 9px; color: var(--p-ink-4); }
.iw-root .ins-group>summary:hover{ background: var(--p-signal-plate); }
.iw-root .ins-group[open]>summary{ border-bottom: 1px solid var(--p-hair); }
.iw-root .ins-group[open]{ padding-bottom: 8px; }
.iw-root .ins-group > .scope-row, .iw-root .ins-group > .scope-hint, .iw-root .ins-group > .field, .iw-root .ins-group > .note-link{ margin-left: 8px; margin-right: 8px; }
.iw-root .field{ margin-top: 8px; }
.iw-root .field .lab{
  display: flex; justify-content: space-between; align-items: baseline;
  font-family: var(--p-mono); font-size: 10px; letter-spacing: var(--pk-ls-label); text-transform: uppercase; color: var(--p-ink-3);
}
.iw-root .field .val{ color: var(--p-ink-2); letter-spacing: var(--pk-ls-ui); }
.iw-root input[type="range"]{
  -webkit-appearance: none; appearance: none; width: 100%; height: 14px; margin: 4px 0 0;
  background: transparent; cursor: pointer;
}
.iw-root input[type="range"]::-webkit-slider-runnable-track{ height: 2px; background: var(--p-hair); }
.iw-root input[type="range"]::-webkit-slider-thumb{
  -webkit-appearance: none; width: 10px; height: 10px; margin-top: -4px;
  border-radius: 50%; background: var(--p-ink); border: 0;
}
.iw-root .swatches{ display: flex; gap: 4px; margin-top: 4px; }
.iw-root .sw{ width: 20px; height: 22px; padding: 0; border: 1px solid var(--p-hair); border-radius: 0; position: relative; }
.iw-root .sw.on{ outline: 0; box-shadow: inset 0 0 0 2px var(--p-paper-2), inset 0 0 0 3px var(--p-ink); }
.iw-root .sw.on::after{
  content: "✓"; position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 10px; mix-blend-mode: difference;
}
.iw-root .size{ display: flex; gap: 2px; padding: 2px; margin-top: 4px; background: var(--p-sunken); border-radius: 8px; }
.iw-root .size button{
  flex: 1; height: 22px; border: 0; border-radius: 0px; background: transparent;
  font-family: var(--p-mono); font-size: 10px; color: var(--p-ink-3);
}
.iw-root .size button.on{ background: var(--p-paper-2); color: var(--p-ink); box-shadow: inset 0 0 0 1px var(--p-hair); }
.iw-root .check{ display: none; }
.iw-root .est{ margin-top: 12px; padding-top: 8px; border-top: 1px solid var(--p-rule); }
.iw-root .est-row{
  display: flex; justify-content: space-between; gap: 8px; padding: 1.5px 0;
  font-family: var(--p-mono); font-size: 10px; color: var(--p-ink-3);
}
.iw-root .est-row b{ font-weight: 500; color: var(--p-ink-2); }
.iw-root .est-total{
  display: flex; justify-content: space-between; gap: 8px; margin-top: 4px; padding-top: 4px;
  border-top: 1px solid var(--p-hair); font-family: var(--p-mono); font-size: 10px; color: var(--p-ink-3);
}
.iw-root .est-total b{ font-weight: 500; color: var(--p-ink); }
.iw-root .cloud-note{
  display: flex; align-items: flex-start; gap: 4px; margin-top: 8px; padding: 4px 8px;
  background: var(--p-signal-plate); color: var(--p-signal-ink);
  border-left: 2px solid var(--p-signal); font-size: 10px; line-height: 1.5;
}
.iw-root .cloud-note .dot{ width: 4px; height: 4px; flex: none; margin-top: 4px; background: var(--p-signal); }
.iw-root .cloud-note span#cloudNoteText{ flex: 1; }
.iw-root .note-link{
  border: 0; background: transparent; padding: 0; margin-left: 2px;
  font-family: var(--p-mono); font-size: 10px; color: var(--p-signal-ink);
  text-decoration: underline; text-underline-offset: 2px; flex: none;
}
.iw-root .go{
  width: 100%; height: 34px; margin-top: 8px; border: 1px solid var(--p-ink);
  border-radius: var(--p-r-control); background: var(--p-ink); color: var(--p-paper);
  font-size: 11.5px; font-weight: 500; letter-spacing: var(--pk-ls-ui);
  transition: background-color .15s, border-color .15s;
}
.iw-root .go:hover{ background: var(--p-ink-2); border-color: var(--p-ink-2); }
.iw-root .go:disabled{ opacity: .38; cursor: default; }
.iw-root .ins-note{ margin-top: 4px; font-size: 10px; line-height: 1.55; color: var(--p-ink-4); }
.iw-root .foot{
  display: flex; justify-content: space-between; gap: 16px;
  margin-top: auto; padding-top: 8px; padding-bottom: 16px; border-top: 1px solid var(--p-hair);
  font-family: var(--p-mono); font-size: 10px; letter-spacing: var(--pk-ls-ui); color: var(--p-ink-4);
}
.iw-root .toast{
  position: fixed; left: 50%; bottom: 20px; transform: translateX(-50%) translateY(6px);
  padding: 4px 12px; background: var(--p-ink); color: var(--p-paper);
  font-family: var(--p-mono); font-size: 10px; letter-spacing: var(--pk-ls-ui);
  opacity: 0; pointer-events: none; transition: opacity .18s, transform .18s; z-index: 80;
}
.iw-root .toast.on{ opacity: 1; transform: translateX(-50%) translateY(0); }
.iw-root .preview-layer{ position: fixed; inset: 0; z-index: 78; display: none; }
.iw-root .preview-layer.open{ display: block; }
.iw-root .preview-layer .drawer-backdrop{ position: absolute; inset: 0; background: var(--p-overlay); }
.iw-root .preview-dialog{ position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%); width: min(1080px, calc(100vw - 40px)); max-height: calc(100vh - 40px); display: flex; flex-direction: column; background: var(--p-paper-2); border: 1px solid var(--p-hair); box-shadow: 0 30px 90px rgba(0,0,0,.24); }
.iw-root .preview-head{ display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--p-hair); }
.iw-root .preview-head h2{ margin: 0; font-family: var(--p-serif); font-size: 18px; font-weight: 600; }
.iw-root .preview-stage{ flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; padding: 16px; background: var(--p-sunken); }
.iw-root .preview-stage img{ display: block; max-width: 100%; max-height: calc(100vh - 190px); object-fit: contain; box-shadow: 0 12px 36px rgba(0,0,0,.16); }
.iw-root .preview-foot{ display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 16px; border-top: 1px solid var(--p-hair); font-family: var(--p-mono); font-size: 10px; color: var(--p-ink-3); }
.iw-root .preview-foot .ghost-btn{ height: 24px; min-width: 28px; font-size: 15px; line-height: 1; }
.iw-root .preview-foot .ghost-btn:disabled{ opacity: .3; cursor: default; }
.iw-root .border-options{ display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:4px; margin:6px 8px 0; }
.iw-root .border-options button{ height:24px; padding:0 4px; border:1px solid var(--p-hair); background:var(--p-paper-2); font-family:var(--p-mono); font-size:10px; color:var(--p-ink-3); cursor:pointer; }
.iw-root .border-options button:hover{ color:var(--p-ink); border-color:var(--p-ink-3); }
.iw-root .border-options button.on{ background:var(--p-ink); color:var(--p-paper); border-color:var(--p-ink); }
.iw-root .pcard.frame-polaroid{ aspect-ratio:4/5; display:flex; flex-direction:column; padding:7px 7px 22px; background:#f6efe1; border-color:#d9cbb5; box-shadow:0 3px 10px rgba(40,30,20,.12); }
.iw-root .pcard.frame-polaroid img{ flex:1; min-height:0; width:100%; height:auto; aspect-ratio:auto; object-fit:cover; }
.iw-root .pcard.frame-polaroid img{ border:1px solid rgba(70,50,30,.12); }
.iw-root .pcard.frame-polaroid .pcap{ color:var(--p-ink-2); }
.iw-root .pcard.frame-film{ padding:8px 5px; background:#111; border-color:#333; }
.iw-root .pcard.frame-film img{ border:1px solid #333; }
.iw-root .pcard.frame-film .pcap{ color:#d9cdbd; }
.iw-root .pcard.frame-film::before,.iw-root .pcard.frame-film::after{ content:""; position:absolute; left:3px; right:3px; height:5px; z-index:2; pointer-events:none; background:repeating-linear-gradient(90deg,#111 0 7px,#e7c472 7px 10px); }
.iw-root .pcard.frame-film::before{ top:2px; }
.iw-root .pcard.frame-film::after{ bottom:2px; }
.iw-root .pcard.frame-paper{ padding:9px; background:#fff; border-color:#ddd5c8; }
.iw-root .pcard.frame-paper img{ border:1px solid rgba(70,50,30,.08); }
.iw-root .crop-layer{ position: fixed; inset: 0; z-index: 76; display: none; }
.iw-root .crop-layer.open{ display: block; }
.iw-root .crop-layer .drawer-backdrop{ position: absolute; inset: 0; background: rgba(15,14,12,.8); }
.iw-root .crop-dialog{ position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%); width: min(960px,calc(100vw - 28px)); max-height: calc(100vh - 28px); display: flex; flex-direction: column; background: var(--p-paper-2); border: 1px solid var(--p-hair); box-shadow: 0 30px 100px rgba(0,0,0,.32); }
.iw-root .crop-head{ display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 12px 16px 8px; border-bottom: 1px solid var(--p-hair); }
.iw-root .crop-head h2{ margin: 0; font-family: var(--p-serif); font-size: 20px; font-weight: 600; }
.iw-root .crop-head span{ display: block; margin-top: 2px; font-family: var(--p-mono); font-size: 10px; color: var(--p-ink-3); }
.iw-root .crop-ratios{ display: flex; flex-wrap: wrap; gap: 4px; padding: 8px 16px; border-bottom: 1px solid var(--p-hair); }
.iw-root .crop-ratios button{ height: 24px; padding: 0 8px; border: 1px solid var(--p-hair); background: var(--p-paper-2); font-family: var(--p-mono); font-size: 10px; color: var(--p-ink-3); cursor: pointer; }
.iw-root .crop-ratios button.on{ background: var(--p-ink); color: var(--p-paper); border-color: var(--p-ink); }
.iw-root .crop-stage{ position: relative; flex: 1; min-height: 0; height: min(58vh, 560px); display: flex; align-items: center; justify-content: center; background: #1b1915; overflow: hidden; }
.iw-root .crop-stage img{ display: block; max-width: 100%; max-height: 100%; width: auto; height: auto; user-select: none; pointer-events: none; }
.iw-root .crop-box{ position: absolute; border: 1px solid #fff; box-shadow: 0 0 0 9999px rgba(0,0,0,.56); cursor: move; touch-action: none; }
.iw-root .crop-box::before,.iw-root .crop-box::after{ content:""; position:absolute; pointer-events:none; background:rgba(255,255,255,.55); }
.iw-root .crop-box::before{ left:33.33%; right:33.33%; top:0; bottom:0; border-left:1px solid rgba(255,255,255,.4); border-right:1px solid rgba(255,255,255,.4); background:transparent; }
.iw-root .crop-box::after{ top:33.33%; bottom:33.33%; left:0; right:0; border-top:1px solid rgba(255,255,255,.4); border-bottom:1px solid rgba(255,255,255,.4); background:transparent; }
.iw-root .crop-hint{ position: absolute; left: 50%; bottom: 8px; transform: translateX(-50%); padding: 2px 6px; background: rgba(0,0,0,.55); color: #fff; font-family: var(--p-mono); font-size: 9px; white-space: nowrap; pointer-events: none; }
.iw-root .crop-foot{ display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 16px 12px; border-top: 1px solid var(--p-hair); }
.iw-root .crop-foot>span{ font-family: var(--p-mono); font-size: 10px; color: var(--p-ink-3); }
.iw-root .crop-actions{ display: flex; align-items: center; gap: 6px; }
.iw-root .crop-actions .go{ width: auto; height: 32px; margin: 0; padding: 0 14px; }
@media (max-width: 760px){.iw-root .crop-dialog{width:calc(100vw - 20px);} .iw-root .crop-actions{flex-wrap:wrap;justify-content:flex-end;}}
.iw-root .result-layer{ position: fixed; inset: 0; z-index: 79; display: none; }
.iw-root .result-layer.open{ display: block; }
.iw-root .result-layer .drawer-backdrop{ position: absolute; inset: 0; background: rgba(15,14,12,.82); }







.iw-root .result-layer.frame-polaroid .preview-stage img{ width:auto; height:min(calc(100vh - 190px), 80vh); aspect-ratio:4/5; object-fit:cover; border:12px solid #f6efe1; border-bottom-width:42px; background:#f6efe1; box-shadow:0 16px 40px rgba(0,0,0,.35); box-sizing:border-box; }
.iw-root .result-layer.frame-film .preview-stage img{ border:10px solid #111; background:#111; box-shadow:inset 0 0 0 1px #333; box-sizing:content-box; }
.iw-root .result-layer.frame-paper .preview-stage img{ border:14px solid #fff; background:#fff; box-sizing:content-box; }
.iw-root .pcard-zoom{ position:absolute; top:4px; left:4px; z-index:2; width:34px; height:22px; display:flex; align-items:center; justify-content:center; border:1px solid var(--p-hair); background:var(--p-paper-2); color:var(--p-ink-3); font-family:var(--p-mono); font-size:10px; letter-spacing:var(--pk-ls-ui); line-height:1; padding:0; }
.iw-root .pcard-zoom:hover{ color:var(--p-signal); border-color:var(--p-signal); }
.iw-root .pcard-zoom:focus-visible{ outline:2px solid var(--p-focus); outline-offset:1px; }
.iw-root .result-title-box span{ display:block; margin-top:2px; font-family:var(--p-mono); font-size:10px; color:var(--p-ink-3); }
.iw-root .result-foot{ justify-content:flex-end; }
.iw-root .result-actions{ display:flex; align-items:center; justify-content:flex-end; gap:6px; flex-wrap:wrap; }
.iw-root .result-action{ display:inline-flex; align-items:center; gap:5px; height:30px; padding:0 10px; border:1px solid var(--p-hair); background:var(--p-paper); color:var(--p-ink-2); font-family:var(--p-mono); font-size:10px; line-height:1; cursor:pointer; }
.iw-root .result-action:hover{ border-color:var(--p-ink-3); color:var(--p-ink); }
.iw-root .result-action.on{ color:var(--p-signal); border-color:var(--p-signal); background:var(--p-signal-plate); }
.iw-root .result-action svg{ flex:none; }
.iw-root .multi-layer{ position:fixed; inset:0; z-index:81; display:none; }
.iw-root .multi-layer.open{ display:block; }
.iw-root .multi-layer .drawer-backdrop{ position:absolute; inset:0; background:var(--p-overlay); }
.iw-root .multi-dialog{ position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); width:min(1080px,calc(100vw - 40px)); max-height:calc(100vh - 40px); display:flex; flex-direction:column; background:var(--p-paper-2); border:1px solid var(--p-hair); box-shadow:0 30px 100px rgba(0,0,0,.3); }
.iw-root .multi-body{ flex:1; min-height:220px; overflow:auto; padding:12px 16px; }
.iw-root .multi-mode{ display:flex; gap:6px; margin-bottom:10px; }
.iw-root .multi-mode button{ height:28px; padding:0 10px; border:1px solid var(--p-hair); background:var(--p-paper); color:var(--p-ink-3); font-family:var(--p-mono); font-size:10px; cursor:pointer; }
.iw-root .multi-mode button.on{ background:var(--p-ink); border-color:var(--p-ink); color:var(--p-paper); }
.iw-root .multi-thumbs{ display:flex; gap:6px; flex-wrap:wrap; }
.iw-root .multi-thumbs img{ width:94px; height:70px; object-fit:cover; border:1px solid var(--p-hair); }
.iw-root .multi-results{ display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; margin-top:12px; }
.iw-root .multi-results img{ width:100%; aspect-ratio:1; object-fit:cover; border:1px solid var(--p-hair); cursor:pointer; }
.iw-root .multi-actions{ display:flex; gap:6px; }
.iw-root .multi-actions .go{ width:auto; margin:0; padding:0 16px; }
.iw-root .refine-layer{ position:fixed; inset:0; z-index:80; display:none; }
.iw-root .refine-layer.open{ display:block; }
.iw-root .refine-layer .drawer-backdrop{ position:absolute; inset:0; background:var(--p-overlay); }
.iw-root .refine-thread{ max-height:150px; overflow:auto; padding:8px 16px; border-top:1px solid var(--p-hair); display:flex; flex-direction:column; gap:6px; background:var(--p-paper); }
.iw-root .refine-thread[hidden]{ display:none; }
.iw-root .rturn{ display:flex; gap:8px; align-items:flex-start; font-size:10px; color:var(--p-ink-2); }
.iw-root .rturn.user{ justify-content:flex-end; }
.iw-root .rturn .bubble{ max-width:80%; padding:5px 8px; background:var(--p-paper-2); border:1px solid var(--p-hair); line-height:1.5; }
.iw-root .rturn.user .bubble{ background:var(--p-ink); color:var(--p-paper); border-color:var(--p-ink); }
.iw-root .rturn img{ width:54px; height:54px; object-fit:cover; border:1px solid var(--p-hair); }
.iw-root .refine-dialog{ width:min(1080px,calc(100vw - 40px)); max-height:calc(100vh - 40px); }
.iw-root .refine-body{ flex:1; min-height:0; display:grid; grid-template-columns:minmax(0,1fr) minmax(300px,.8fr); gap:16px; padding:16px; background:var(--p-paper-2); }
.iw-root .refine-preview{ display:flex; align-items:center; justify-content:center; min-height:280px; background:var(--p-sunken); overflow:hidden; position:relative; }
.iw-root .refine-stage{ position:relative; display:inline-block; max-width:100%; max-height:calc(100vh - 250px); line-height:0; }
.iw-root .refine-stage img{ display:block; max-width:100%; max-height:calc(100vh - 250px); object-fit:contain; }
.iw-root #refineMaskCanvas{ position:absolute; inset:0; display:block; width:100%; height:100%; cursor:crosshair; touch-action:none; }
.iw-root .refine-form{ display:flex; flex-direction:column; min-width:0; }
.iw-root .refine-label{ font-family:var(--p-mono); font-size:10px; color:var(--p-ink-3); }
.iw-root .refine-form textarea:focus{ outline:none; border-color:var(--p-hair); box-shadow:none; }
.iw-root .refine-form textarea{ width:100%; min-height:170px; margin-top:6px; padding:10px; border:1px solid var(--p-hair); background:var(--p-paper); color:var(--p-ink); font-family:var(--p-sans); font-size:12px; line-height:1.6; resize:vertical; }
.iw-root .refine-note{ margin:8px 0 0; font-size:10px; line-height:1.5; color:var(--p-ink-4); }
.iw-root .refine-options{ display:flex; flex-direction:column; gap:6px; margin-top:8px; }
.iw-root .refine-options label{ font-size:10px; color:var(--p-ink-3); display:flex; align-items:center; gap:5px; }
.iw-root .refine-options input[type="text"]{ width:100%; height:28px; padding:0 7px; border:1px solid var(--p-hair); background:var(--p-paper); font-family:var(--p-sans); font-size:10px; }
.iw-root .refine-layer-grid{ display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:6px; margin-top:8px; max-height:150px; overflow:auto; }
.iw-root .refine-layer-grid[hidden]{ display:none; }
.iw-root .refine-region-row{ display:flex; gap:4px; }
.iw-root .refine-region-row input{ flex:1; }
.iw-root .refine-region-row button{ flex:none; }
.iw-root .refine-mask-tools{ display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin-top:8px; padding-top:8px; border-top:1px dashed var(--p-hair); font-size:10px; color:var(--p-ink-3); }
.iw-root .refine-mask-title{ font-family:var(--p-mono); font-size:10px; color:var(--p-ink-3); }
.iw-root .refine-mask-tools input[type="range"]{ flex:1; min-width:88px; accent-color:var(--p-ink); }
.iw-root .refine-mask-tools output{ min-width:42px; text-align:right; font-family:var(--p-mono); font-size:10px; }
.iw-root .refine-mask-mode{ display:inline-flex; }
.iw-root .refine-mask-mode button{ height:24px; padding:0 8px; border:1px solid var(--p-hair); background:var(--p-paper); color:var(--p-ink-3); font-family:var(--p-mono); font-size:10px; cursor:pointer; }
.iw-root .refine-mask-mode button + button{ border-left:0; }
.iw-root .refine-mask-mode button.on{ background:var(--p-ink); border-color:var(--p-ink); color:var(--p-paper); }
.iw-root .refine-mask-tools .ghost-btn{ height:24px; padding:0 8px; font-size:10px; }
.iw-root .refine-mask-state{ display:block; margin-top:6px; font-family:var(--p-mono); font-size:10px; line-height:1.5; color:var(--p-ink-4); word-break:break-all; }
.iw-root .refine-options .refine-max{ display:flex; align-items:center; gap:4px; }
.iw-root .refine-options input[type="number"]{ width:52px; height:24px; border:1px solid var(--p-hair); background:var(--p-paper); font-family:var(--p-mono); font-size:10px; padding:0 4px; }
.iw-root #refineLayerZip{ margin-top:6px; }
.iw-root .refine-layer-grid img{ width:100%; aspect-ratio:1; object-fit:contain; background:#fff; border:1px solid var(--p-hair); cursor:pointer; }
.iw-root .refine-cost{ margin-top:auto; padding-top:12px; font-family:var(--p-mono); font-size:10px; color:var(--p-ink-3); }
.iw-root .refine-foot{ gap:12px; }
.iw-root .refine-actions{ display:flex; align-items:center; justify-content:flex-end; gap:6px; flex-wrap:wrap; }
.iw-root .refine-status{ min-height:14px; }
.iw-root .refine-status.error{ color:var(--p-signal); }
@media (max-width:760px){.iw-root .refine-body{grid-template-columns:1fr; overflow:auto;} .iw-root .refine-preview{min-height:180px;} .iw-root .refine-form textarea{min-height:110px;}}

.iw-root .favorites-layer{ position:fixed; inset:0; z-index:77; display:none; }
.iw-root .favorites-layer.open{ display:block; }
.iw-root .favorites-layer .drawer-backdrop{ position:absolute; inset:0; background:var(--p-overlay); }
.iw-root .favorites-dialog{ width:min(1080px,calc(100vw - 40px)); }
.iw-root .favorites-grid{ flex:1; min-height:0; overflow:auto; display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; padding:12px; background:var(--p-paper-2); }
.iw-root .favorite-card{ position:relative; min-width:0; padding:5px; border:1px solid var(--p-hair); background:var(--p-paper-2); cursor:pointer; text-align:left; }
.iw-root .favorite-open{ display:block; width:100%; padding:0; border:0; background:none; cursor:pointer; }
.iw-root .favorite-card img{ display:block; width:100%; aspect-ratio:16/10; object-fit:cover; background:var(--p-sunken); }
.iw-root .favorite-card .f-name{ display:block; margin-top:4px; font-size:10px; color:var(--p-ink-2); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.iw-root .favorite-card .f-meta{ display:block; margin-top:1px; font-family:var(--p-mono); font-size:9px; color:var(--p-ink-4); }
.iw-root .favorite-remove{ position:absolute; top:8px; right:8px; z-index:2; width:18px; height:18px; border:1px solid var(--p-hair); background:var(--p-paper-2); color:var(--p-ink-3); font-family:var(--p-mono); line-height:1; padding:0; }
.iw-root .favorite-remove:hover{ color:var(--p-signal); border-color:var(--p-signal); }
.iw-root .favorites-empty{ grid-column:1 / -1; padding:38px 16px; text-align:center; font-family:var(--p-mono); font-size:10px; color:var(--p-ink-4); }
@media (max-width:760px){.iw-root .favorites-grid{grid-template-columns:repeat(2,minmax(0,1fr));} .iw-root .result-actions{justify-content:flex-start;} .iw-root .result-foot{justify-content:flex-start;}}
.iw-root .drawer-layer{ position: fixed; inset: 0; z-index: 60; pointer-events: none; }
.iw-root .drawer-backdrop{ position: absolute; inset: 0; background: var(--p-overlay); opacity: 0; transition: opacity .18s var(--p-ease); }
.iw-root .drawer{
  position: absolute; top: 0; right: 0; bottom: 0; width: 372px; max-width: 100%;
  display: flex; flex-direction: column;
  background: var(--p-paper-2); border-left: 1px solid var(--p-rule);
  transform: translateX(102%); transition: transform .22s var(--p-ease);
}
.iw-root .drawer-layer.open{ pointer-events: auto; }
.iw-root .drawer-layer.open .drawer-backdrop{ opacity: 1; }
.iw-root .drawer-layer.open .drawer{ transform: none; }
.iw-root .drawer-head{
  display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
  padding: 16px 16px 12px; border-bottom: 1px solid var(--p-rule);
}
.iw-root .drawer-head h2{ margin: 6px 0 0; font-family: var(--p-serif); font-size: 22px; font-weight: 600; letter-spacing: var(--pk-ls-title); }
.iw-root .drawer-body{ flex: 1; overflow: auto; padding: 2px 16px 8px; }
.iw-root .set-sec{ padding: 13px 0; border-bottom: 1px solid var(--p-hair); }
.iw-root .set-sec.last{ border-bottom: 0; }
.iw-root .set-subtitle{ margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--p-hair-2); font-family: var(--p-mono); font-size: 10px; letter-spacing: var(--pk-ls-label); text-transform: uppercase; color: var(--p-ink-3); }
.iw-root .set-title{
  display: flex; align-items: baseline; justify-content: space-between; gap: 8px;
  margin-bottom: 4px; font-size: 13px; font-weight: 500; color: var(--p-ink);
}
.iw-root .set-title .mono{ font-family: var(--p-mono); font-size: 10px; font-weight: 400; letter-spacing: var(--pk-ls-label); color: var(--p-ink-4); }
.iw-root .storage-path{max-width:62%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right;font-family:var(--p-mono);font-size:10px}
.iw-root .settings-note{margin:6px 0 8px;font-size:10px;line-height:1.6;color:var(--p-ink-4)}
.iw-root .storage-roots{display:flex;flex-direction:column;gap:4px}
.iw-root .storage-root{display:flex;align-items:center;gap:6px;padding:4px 6px;border:1px solid var(--p-hair);background:var(--p-paper-2);font-family:var(--p-mono);font-size:9px;color:var(--p-ink-3)}
.iw-root .storage-root.active{border-color:var(--p-signal);color:var(--p-ink)}
.iw-root .storage-root span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.iw-root .storage-root button{height:20px;padding:0 5px;font-size:8px}
.iw-root .set-row{
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 4px 0; font-size: 10px; color: var(--p-ink-3);
}
.iw-root .set-row b{ font-weight: 500; color: var(--p-ink-2); }
.iw-root .set-links{ display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.iw-root .set-action{ height: 28px; padding: 0 10px; border: 1px solid var(--p-ink-4); background: var(--p-paper); color: var(--p-ink-2); font-family: var(--p-mono); font-size: 10px; cursor: pointer; }
.iw-root .set-action:hover{ color: var(--p-ink); border-color: var(--p-ink-3); }
.iw-root .set-layer input:focus, .iw-root .set-layer textarea:focus{ outline: none; border-color: var(--p-hair); }
.iw-root .lib-grid{ display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:4px; margin:6px 0 4px; max-height:220px; overflow-y:auto; }
.iw-root .lib-grid-hidden{ max-height:150px; }
.iw-root .lib-card{ display:flex; align-items:center; gap:5px; min-width:0; padding:4px; border:1px solid var(--p-hair); background:var(--p-paper-2); }
.iw-root .lib-thumb{ width:34px; height:27px; flex:none; padding:0; overflow:hidden; border:1px solid var(--p-hair); background:var(--p-sunken); }
.iw-root .lib-thumb img{ display:block; width:100%; height:100%; object-fit:cover; }
.iw-root .lib-thumb span{ display:flex; align-items:center; justify-content:center; width:100%; height:100%; font-family:var(--p-mono); font-size:8px; color:var(--p-ink-4); }
.iw-root .lib-info{ min-width:0; flex:1; display:flex; flex-direction:column; gap:1px; }
.iw-root .lib-info b{ font-size:10.5px; font-weight:500; color:var(--p-ink-2); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.iw-root .lib-info span{ font-family:var(--p-mono); font-size:8px; color:var(--p-ink-4); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.iw-root .lib-action{ flex:none; height:20px; padding:0 4px; border:1px solid var(--p-hair); background:transparent; font-family:var(--p-mono); font-size:8px; color:var(--p-ink-3); cursor:pointer; }
.iw-root .lib-action:hover{ color:var(--p-signal); border-color:var(--p-signal); }
.iw-root .lib-grid-hidden .lib-card{ opacity:.72; }
.iw-root .lib-empty{ grid-column:1 / -1; padding:7px 0; font-family:var(--p-mono); font-size:9px; color:var(--p-ink-4); }
.iw-root .set-note{ margin: 7px 0 0; font-size: 10px; line-height: 1.55; color: var(--p-ink-4); }
.iw-root .drawer-foot{ padding: 12px 16px 16px; border-top: 1px solid var(--p-rule); }
.iw-root .drawer-foot .go{ margin-top: 0; }
.iw-root .drawer-foot .ins-note{ margin-top: 4px; }
.iw-root .drawer .ghost-btn{ font-size: 10px; }

/* ————— 队列 ————— */
.iw-root .queue-badge{
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 16px; height: 16px; padding: 0 4px; margin-left: -2px;
  background: var(--p-signal); color: var(--p-paper);
  font-family: var(--p-mono); font-size: 9px; font-weight: 500; letter-spacing: 0;
}
.iw-root .queue-badge[hidden]{ display: none; }
.iw-root .queue-head-actions{ display: flex; align-items: center; gap: 2px; flex: none; }
.iw-root .queue-drawer{ width: 408px; }
.iw-root .queue-body{ padding-top: 10px; }
.iw-root .queue-status{ margin: 0 0 9px; font-family: var(--p-mono); font-size: 10px; line-height: 1.6; color: var(--p-ink-4); }
.iw-root .queue-status.err{ color: var(--p-signal); }
.iw-root .queue-list{ display: flex; flex-direction: column; gap: 8px; }
.iw-root .queue-empty{
  padding: 38px 16px; text-align: center;
  border: 1px dashed var(--p-hair); background: var(--p-paper);
  font-family: var(--p-mono); font-size: 10px; line-height: 1.8; color: var(--p-ink-4);
}
.iw-root .queue-item{ padding: 9px 10px 10px; border: 1px solid var(--p-hair); background: var(--p-paper); }
.iw-root .queue-item-head{ display: flex; align-items: center; gap: 6px; }
.iw-root .queue-provider{
  flex: none; display: inline-flex; align-items: center; height: 16px; padding: 0 5px;
  border: 1px solid var(--p-ink-4); color: var(--p-ink-2);
  font-family: var(--p-mono); font-size: 9px; letter-spacing: var(--pk-ls-label);
}
.iw-root .queue-provider.seedream{ border-color: var(--p-signal); color: var(--p-signal); }
.iw-root .queue-state{ font-family: var(--p-mono); font-size: 9px; letter-spacing: var(--pk-ls-label); color: var(--p-ink-3); }
.iw-root .queue-state.active, .iw-root .queue-state.failed{ color: var(--p-signal); }
.iw-root .queue-time{ margin-left: auto; font-family: var(--p-mono); font-size: 9px; color: var(--p-ink-4); white-space: nowrap; }
.iw-root .queue-prompt{
  display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden;
  margin: 6px 0 0; font-size: 11.5px; line-height: 1.55; color: var(--p-ink);
}
.iw-root .queue-prompt.muted{ color: var(--p-ink-4); }
.iw-root .queue-meta{ display: flex; flex-wrap: wrap; gap: 8px; margin-top: 5px; font-family: var(--p-mono); font-size: 9px; color: var(--p-ink-4); }
.iw-root .queue-meta b{ font-weight: 500; color: var(--p-ink-3); }
.iw-root .queue-error{
  display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden;
  margin: 5px 0 0; font-family: var(--p-mono); font-size: 9px; line-height: 1.5; color: var(--p-signal);
}
.iw-root .queue-actions{ display: flex; align-items: center; gap: 6px; margin-top: 8px; }
.iw-root .queue-action{
  height: 22px; padding: 0 8px; border: 1px solid var(--p-hair); background: var(--p-paper-2);
  color: var(--p-ink-3); font-family: var(--p-mono); font-size: 9px; cursor: pointer;
}
.iw-root .queue-action:hover:not(:disabled){ color: var(--p-ink); border-color: var(--p-ink-3); }
.iw-root .queue-action.danger:hover:not(:disabled){ color: var(--p-signal); border-color: var(--p-signal); }
.iw-root .queue-action:disabled{ opacity: .55; cursor: not-allowed; }
.iw-root .queue-blocked{ margin-left: auto; font-family: var(--p-mono); font-size: 9px; color: var(--p-ink-4); }
.iw-root .queue-foot{ display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.iw-root .queue-foot .note{ font-family: var(--p-mono); font-size: 9px; color: var(--p-ink-4); }

.iw-root .eyebrow{ font-size: 10px; }
.iw-root .stamp{ font-size: 10px; }
.iw-root .card .nm{ font-size: 11.5px; }
.iw-root .card .mt{ font-size: 10px; }
.iw-root .rail-note{ font-size: 10px; }
.iw-root .stage-bar, .iw-root .link-btn{ font-size: 10px; }
.iw-root .stage-cap{ font-size: 10px; }
.iw-root .proof-head h3{ font-size: 16px; }
.iw-root .pcard .pcap{ font-size: 10px; }
.iw-root .ins-head h2{ font-size: 22px; }
.iw-root .chip .cname{ font-size: 11.5px; }
.iw-root .chip .ctag{ font-size: 10px; }
.iw-root .field .lab{ font-size: 10px; }
.iw-root .field .val{ font-size: 10px; }
.iw-root .est-row{ font-size: 10px; }
.iw-root .est-total{ font-size: 10px; }
.iw-root .cloud-note{ font-size: 10px; }
.iw-root .note-link{ font-size: 10px; }
.iw-root .go{ font-size: 11.5px; }
.iw-root .ins-note{ font-size: 10px; }
.iw-root .count{ font-size: 10px; }
.iw-root .search input{ font-size: 11.5px; }
.iw-root .seg button{ font-size: 11.5px; }
.iw-root .set-row{ font-size: 11.5px; }
.iw-root .set-title{ font-size: 13px; }
.iw-root .toggle-row{ font-size: 11.5px; }
.iw-root .set-note{ font-size: 10px; }
.iw-root .key-edit[hidden]{ display: none; }
.iw-root .drawer-head{ padding: 12px 16px 8px; }
.iw-root .drawer-body{ padding-bottom: 16px; }
.iw-root .set-sec{ padding: 10px 0; }
.iw-root .set-row{ padding: 3px 0; }
.iw-root .set-field{ margin-top: 8px; }
.iw-root .drawer-foot{ padding: 8px 16px 12px; }

@media (max-width: 1020px) {.iw-root .work{ grid-template-columns: 210px minmax(0, 1fr); }
.iw-root .inspector{
    grid-column: 1 / -1; margin-top: 12px; padding: 14px 0 0;
    border-left: 0; border-top: 1px solid var(--p-hair);
  }
.iw-root .stage{ height: 360px; }
.iw-root .styles{ grid-template-columns: repeat(2, 1fr); max-height: 56vh; overflow-y: auto; padding-right: 2px; overscroll-behavior: contain; }

}

@media (max-width: 760px) {.iw-root .wrap{ padding-left: 16px; padding-right: 16px; }
.iw-root .masthead{ flex-direction: column; align-items: flex-start; }
.iw-root .mast-right{ width: 100%; align-items: center; justify-content: space-between; }
.iw-root .work{ grid-template-columns: 1fr; }
.iw-root .rail{ padding: 0 0 14px; border-right: 0; border-bottom: 1px solid var(--p-hair); }
.iw-root .stage-col{ padding: 14px 0 0; }
.iw-root .styles{ grid-template-columns: repeat(2, 1fr); max-height: 56vh; overflow-y: auto; padding-right: 2px; overscroll-behavior: contain; }
.iw-root .drawer{ width: 100%; }

}



/* ————— 插件外壳（DSH 主区） ————— */
.iw-root{height:100%;overflow:auto;position:relative;}
.iw-root .page{min-height:100%;}
.iw-root .masthead{padding-top:var(--pk-page-top);}
.iw-root .card.disabled{cursor:not-allowed;}
.iw-root .card.disabled img{filter:saturate(.6) brightness(.98);}
.iw-root .card.disabled .tick{display:none;}
.iw-root .card.disabled:hover{border-color:var(--p-hair);}
.iw-root .history{margin-top:8px;padding-top:8px;border-top:1px solid var(--p-hair);}
.iw-root .history[hidden]{display:none;}
.iw-root .history-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px;}
.iw-root .history-head b{font-family:var(--p-mono);font-size:10px;font-weight:500;letter-spacing:var(--pk-ls-label);text-transform:uppercase;color:var(--p-ink-3);}
.iw-root .history-list{display:flex;gap:4px;margin-top:4px;}
.iw-root .history-slot{position:relative;width:60px;flex:none;}
.iw-root .history-item{width:100%;padding:0;border:1px solid var(--p-hair);background:var(--p-paper-2);text-align:left;}
.iw-root .history-item:hover{border-color:var(--p-ink-3);}
.iw-root .history-item img{display:block;width:100%;height:38px;object-fit:cover;background:var(--p-sunken);}
.iw-root .history-item span{display:block;padding:2px 2px;font-family:var(--p-mono);font-size:10px;line-height:1.3;color:var(--p-ink-4);white-space:nowrap;overflow:hidden;}
.iw-root .history-del{position:absolute;top:2px;right:2px;z-index:2;width:16px;height:16px;display:flex;align-items:center;justify-content:center;padding:0;border:1px solid var(--p-hair);background:var(--p-paper-2);color:var(--p-ink-3);font-family:var(--p-mono);font-size:11px;line-height:1;cursor:pointer;opacity:.55;transition:opacity .12s,color .12s,border-color .12s;}
.iw-root .history-slot:hover .history-del,.iw-root .history-slot:focus-within .history-del,.iw-root .history-del:focus{opacity:1;}
.iw-root .history-del:hover{color:var(--p-signal);border-color:var(--p-signal);}
@media (hover:none){.iw-root .history-del{opacity:1;}}
.iw-root .history-head-right{display:flex;align-items:baseline;gap:8px;}
.iw-root .history-more{padding:0;border:0;background:none;font-family:var(--p-mono);font-size:10px;color:var(--p-signal-ink);text-decoration:underline;text-underline-offset:2px;cursor:pointer;}
.iw-root .history-more:hover{color:var(--p-signal);}
.iw-root .history-layer{position:fixed;inset:0;z-index:72;display:none;}
.iw-root .history-layer.open{display:block;}
.iw-root .history-layer .drawer-backdrop{position:absolute;inset:0;background:var(--p-overlay);}
.iw-root .history-dialog{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(860px,calc(100vw - 40px));max-height:calc(100vh - 50px);display:flex;flex-direction:column;background:var(--p-paper-2);border:1px solid var(--p-hair);box-shadow:0 30px 90px rgba(0,0,0,.24);}
.iw-root .history-dialog-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px 10px;border-bottom:1px solid var(--p-hair);}
.iw-root .history-dialog-head h2{margin:0;font-family:var(--p-serif);font-size:22px;font-weight:600;letter-spacing:var(--pk-ls-title);}
.iw-root .history-dialog-head span{margin-left:8px;font-family:var(--p-mono);font-size:10px;color:var(--p-ink-3);}
.iw-root .history-grid{flex:1;min-height:0;overflow:auto;padding:10px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;align-content:start;}
.iw-root .history-card{display:flex;align-items:center;gap:8px;min-width:0;padding:6px;border:1px solid var(--p-hair);background:var(--p-paper-2);}
.iw-root .history-thumb{width:82px;height:62px;flex:none;padding:0;border:1px solid var(--p-hair);background:var(--p-sunken);overflow:hidden;}
.iw-root .history-thumb img{display:block;width:100%;height:100%;object-fit:cover;}
.iw-root .history-thumb .ph{display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-family:var(--p-mono);font-size:9px;color:var(--p-ink-4);}
.iw-root .history-info{min-width:0;flex:1;display:flex;flex-direction:column;gap:2px;}
.iw-root .history-info b{font-family:var(--p-mono);font-size:10px;font-weight:500;color:var(--p-ink-2);}
.iw-root .history-info span{font-size:10px;line-height:1.35;color:var(--p-ink-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.iw-root .history-actions{flex:none;display:flex;flex-direction:column;gap:3px;}
.iw-root .history-actions button{padding:2px 6px;border:1px solid var(--p-hair);background:var(--p-paper-2);font-family:var(--p-mono);font-size:9px;color:var(--p-ink-3);cursor:pointer;}
.iw-root .history-actions button:hover{color:var(--p-ink);border-color:var(--p-ink-3);}
.iw-root .history-actions [data-history-delete]:hover{color:var(--p-signal);border-color:var(--p-signal);}
.iw-root .history-empty{grid-column:1 / -1;padding:26px;text-align:center;font-family:var(--p-mono);font-size:10px;color:var(--p-ink-4);}
.iw-root .history-dialog-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 16px 12px;border-top:1px solid var(--p-hair);font-family:var(--p-mono);font-size:10px;color:var(--p-ink-4);}
@media (max-width:760px){.iw-root .history-grid{grid-template-columns:1fr;}}
.iw-root .empty-alt{ margin-top:2px; font-family:var(--p-mono); font-size:9px; color:var(--p-ink-4); }
.iw-root .empty-stage{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;background:var(--p-paper-2);color:var(--p-ink-3);z-index:5;}
.iw-root .empty-stage[hidden]{display:none;}
.iw-root .empty-stage h3{margin:0;font-family:var(--p-serif);font-size:22px;font-weight:600;letter-spacing:var(--pk-ls-title);color:var(--p-ink);}
.iw-root .empty-stage p{margin:0;font-family:var(--p-mono);font-size:10px;letter-spacing:var(--pk-ls-mono);color:var(--p-ink-4);}
.iw-root .empty-stage .ghost-btn{height:28px;margin-top:4px;padding:0 11px;border:1px solid var(--p-hair);}
.iw-root .key-state.warn{color:var(--p-signal);}
.iw-root .p3{color:var(--p-signal);}

.iw-root .file-meta{display:flex;align-items:center;gap:4px;min-width:0}
.iw-root #sampleTag{font-family:var(--p-mono);font-size:10px;letter-spacing:var(--pk-ls-mono)}
.iw-root .stage-bar .ghost-btn{height:22px;border:1px solid var(--p-hair);padding:0 8px;color:var(--p-ink-3)}
.iw-root .stage-bar .ghost-btn:hover{color:var(--p-ink);background:var(--p-sunken)}
.iw-root .empty-actions{display:flex;align-items:center;gap:4px;margin-top:2px}
.iw-root .params-note{margin-top:4px;font-family:var(--p-mono);font-size:10px;line-height:1.45;color:var(--p-ink-3)}
.iw-root .chip.on{background:var(--p-signal-plate);}
.iw-root .chip.on .ctag{color:var(--p-signal)}
.iw-root .proof-status{font-family:var(--p-mono);font-size:10px;letter-spacing:var(--pk-ls-ui);color:var(--p-ink-3);margin-left:4px}
.iw-root .proof-status.dirty{color:var(--p-signal)}
.iw-root .p3-banner{margin:8px 0 2px;padding:8px 8px;border-left:2px solid var(--p-ink-4);background:var(--p-sunken);font-size:10px;line-height:1.55;color:var(--p-ink-2)}
.iw-root .p3-banner b{font-weight:600;color:var(--p-ink)}
.iw-root .p3-field{opacity:.62}

.iw-root .p3-field .mini-seg,.iw-root .p3-field .num{pointer-events:none}
@media (min-width: 1021px) {
.iw-root .inspector{height:calc(100vh - 150px); max-height:calc(100vh - 150px);overflow:hidden;padding-bottom:8px}
.iw-root .ins-scroll{flex:1;min-height:0;overflow-y:auto;scrollbar-gutter:stable;padding-right:0}
.iw-root .inspector .go{flex:none;margin-top:8px}
}
@media (max-width: 1020px) {
.iw-root .ins-scroll{overflow:visible}
}
.iw-root .p3-details{margin-top:8px;border-top:1px solid var(--p-hair);padding-top:4px}
.iw-root .p3-details summary{list-style:none;cursor:pointer;display:flex;align-items:baseline;gap:4px;font-family:var(--p-mono);font-size:10px;letter-spacing:var(--pk-ls-mono);color:var(--p-ink-3)}
.iw-root .p3-details summary::-webkit-details-marker{display:none}
.iw-root .p3-details summary::before{content:"+";color:var(--p-ink-4)}
.iw-root .p3-details[open] summary::before{content:"−"}
.iw-root .p3-details summary span{font-size:10px;color:var(--p-ink-4)}
.iw-root .field .val{text-transform:none}

.iw-root .scope-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:8px 0 2px}
.iw-root .scope-row>span{flex:none;font-family:var(--p-mono);font-size:10px;letter-spacing:var(--pk-ls-mono);color:var(--p-ink-3)}
.iw-root .mini-seg{ display:inline-flex; border:1px solid var(--p-hair); border-radius:6px; overflow:hidden; }
.iw-root .mini-seg button{ height:26px; padding:0 9px; border:0; border-right:1px solid var(--p-hair); background:var(--p-paper); color:var(--p-ink-3); font-family:var(--p-mono); font-size:10px; cursor:pointer; white-space:nowrap; }
.iw-root .mini-seg button:last-child{ border-right:0; }
.iw-root .mini-seg button.on{ background:var(--p-ink); color:var(--p-paper); }
.iw-root .scope-row .mini-seg{display:flex;flex:none;border:1px solid var(--p-hair);border-radius:0px;overflow:hidden}
.iw-root .scope-row .mini-seg button{height:22px;padding:0 6px;border:0;border-right:1px solid var(--p-hair);background:var(--p-paper-2);font-family:var(--p-mono);font-size:10px;color:var(--p-ink-3);cursor:pointer;white-space:nowrap}
.iw-root .scope-row .mini-seg button:last-child{border-right:0}
.iw-root .scope-row .mini-seg button.on{background:var(--p-ink);color:var(--p-paper)}
.iw-root .scope-row .mini-seg button:focus-visible{outline:2px solid var(--p-focus);outline-offset:1px}
.iw-root .scope-hint{font-family:var(--p-mono);font-size:10px;line-height:1.45;color:var(--p-ink-3);margin-top:4px}
.iw-root #resetOverride{font-family:var(--p-mono);font-size:10px;color:var(--p-signal);margin-top:2px;padding:0;background:none;border:0;cursor:pointer}
.iw-root #resetOverride:hover{text-decoration:underline}
.iw-root .text-field{margin-top:8px;border-top:1px solid var(--p-hair);padding-top:4px}
.iw-root .text-field summary{list-style:none;cursor:pointer;display:flex;align-items:baseline;justify-content:space-between;gap:4px;font-family:var(--p-mono);font-size:10px;letter-spacing:var(--pk-ls-mono);color:var(--p-ink-3)}
.iw-root .text-field summary::-webkit-details-marker{display:none}
.iw-root .text-field summary::before{content:"+";color:var(--p-ink-4);margin-right:2px}
.iw-root .text-field[open] summary::before{content:"−"}
.iw-root .text-field summary span{color:var(--p-ink-4);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.iw-root .text-lab{display:block;margin-top:4px;font-family:var(--p-mono);font-size:10px;letter-spacing:var(--pk-ls-mono);color:var(--p-ink-3)}
.iw-root .text-input{width:100%;margin-top:2px;padding:4px 0;border:0;border-bottom:1px solid var(--p-hair);background:transparent;color:var(--p-ink);font-family:var(--p-serif);font-size:13px;outline:none}
.iw-root .text-input:focus{border-bottom-color:var(--p-signal)}
.iw-root .text-two{display:grid;grid-template-columns:1fr 1fr;gap:8px}

.iw-root .pcard-wrap{position:relative;min-width:0}
.iw-root .pcard{width:100%;display:block}
.iw-root .pcard-dl{position:absolute;top:4px;right:4px;z-index:2;width:34px;height:22px;display:flex;align-items:center;justify-content:center;border:1px solid var(--p-hair);background:var(--p-paper-2);color:var(--p-ink-3);font-family:var(--p-mono);font-size:10px;letter-spacing:var(--pk-ls-ui);line-height:1;padding:0}
.iw-root .pcard.err{display:flex;flex-direction:column;justify-content:flex-end;min-height:120px;background:var(--p-signal-plate);border-color:var(--p-signal)}
.iw-root .pcard-retry{position:absolute;right:4px;bottom:4px;z-index:2;height:22px;padding:0 7px;border:1px solid var(--p-signal);background:var(--p-paper-2);font-family:var(--p-mono);font-size:10px;color:var(--p-signal);cursor:pointer}
.iw-root .pcard.err .err-msg{flex:1;display:flex;align-items:center;padding:8px;font-family:var(--p-mono);font-size:10px;line-height:1.45;color:var(--p-signal);text-align:left;overflow:hidden}
.iw-root .pcard-dl:hover{color:var(--p-signal);border-color:var(--p-signal)}
.iw-root .pcard-dl:focus-visible{outline:2px solid var(--p-focus);outline-offset:1px}

.iw-root .field .lab{font-size:10px}
.iw-root .card .mt{font-size:10px}
.iw-root .pcard .pcap{font-size:10px}
.iw-root .stage-bar{font-size:10px}
.iw-root .rail-note{font-size:10px;color:var(--p-ink-3)}
.iw-root .ins-note,.iw-root .set-note{font-size:10px;color:var(--p-ink-3)}
.iw-root .history-item span{font-size:10px;color:var(--p-ink-3)}
.iw-root .foot{font-size:10px}
.iw-root .est-row{font-size:10px}

`;

    var HTML = `
<div class="page">

  <header class="wrap masthead">
    <h1 class="title">图像风格工作台</h1>
    <div class="mast-right">
      <div class="stamp"><b id="stampMain">今日 0 张 · ¥0.00</b><span id="stampSub">本机 6 · 云端 2 · 队列空闲</span></div>
      <div class="mast-tools">
        <button class="icon-btn wide" id="queueBtn" aria-label="打开队列" aria-haspopup="dialog" aria-expanded="false" title="作业队列"><svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 4.2h11M2.5 8h11M2.5 11.8h7"/><circle cx="12.4" cy="11.8" r="1.1" fill="none"/></svg><span>队列</span><b class="queue-badge" id="queueBadge" hidden>0</b></button>
        <button class="icon-btn wide" id="workflowHistory">历史</button>
        <button class="icon-btn wide" id="settingsBtn" aria-label="打开设置"><svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2.2 4.2h11.6M2.2 8h11.6M2.2 11.8h11.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="5.6" cy="4.2" r="1.5" fill="var(--p-paper)" stroke="currentColor" stroke-width="1.5"/><circle cx="10.4" cy="8" r="1.5" fill="var(--p-paper)" stroke="currentColor" stroke-width="1.5"/><circle cx="6.4" cy="11.8" r="1.5" fill="var(--p-paper)" stroke="currentColor" stroke-width="1.5"/></svg><span>设置</span></button>
      </div>
    </div>
  </header>

  <nav class="wrap view-tabs" id="viewTabs" aria-label="页面切换">
    <button data-view="studio" class="on">工作台</button>
    <button data-view="recent">最近生成 <span id="recentTabCount">0</span></button>
  </nav>

  <main class="wrap work">
    <aside class="rail">
      <div class="seg" role="group" aria-label="按渲染位置筛选">
        <button data-filter="all" class="on">全部</button>
        <button data-filter="local">本机</button>
        <button data-filter="cloud">云端</button>
      </div>
      <label class="search">
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="4.6" stroke="currentColor" stroke-width="1.4"/><path d="M10.6 10.6 14 14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
        <input id="searchInput" type="search" placeholder="搜索风格" aria-label="搜索风格">
        <kbd>⌘K</kbd>
      </label>
      <div class="sec-head"><h2>风格库</h2><span class="count" id="styleCount">08</span></div>
      <div class="styles" id="styleGrid"></div>
    </aside>

    <section class="stage-col">
      <div class="stage-bar">
        <span class="file-meta"><span id="fileMeta">未载入图片</span><span id="sampleTag" class="p3" hidden>示例</span></span>
        <span class="r"><span class="stage-model" id="genModel"><button data-gen-model="minimax" class="on">H3</button><button data-gen-model="seedream">Seedream</button></span><span id="frameHint">原图比例</span><button class="ghost-btn" id="cropBtn" disabled>裁切</button><button class="ghost-btn" id="replaceBtn">换一张</button></span>
      </div>

      <div class="stage" id="stage">
        <div class="print-frame" id="printFrame" hidden>
        <div class="print" id="print" style="--split: 50%">
          <div class="crops"><i></i><i></i><i></i><i></i></div>
          <img id="baseImg" class="base" alt="原图">
          <img id="resultImg" class="result" alt="风格结果">
          <span class="split" id="split" role="slider" tabindex="0" aria-label="对比分界" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50"></span>
          <span class="cmp-label l">原图</span>
          <span class="cmp-label r">结果</span>
        </div>
        </div>
        <div class="empty-stage" id="emptyStage" hidden>
          <h3>把图片放到这里</h3>
          <p>JPG / PNG / WEBP · ⌘V 粘贴</p>
          <p class="empty-alt">不传图片也可以：选风格后直接文生图</p>
          <div class="empty-actions">
            <button class="ghost-btn" id="pickEmpty">选择图片</button>
            <button class="ghost-btn" id="useSample">用示例图试试</button>
          </div>
        </div>
      </div>

      <div class="stage-cap">
        <span id="capLeft"><b>样式预览</b></span>
        <span id="capRight">sRGB · 3:2</span>
      </div>

      <div class="proof">
        <div class="proof-head">
          <h3>试印</h3><span class="count" id="proofCount">0 / 0</span><span class="proof-status" id="proofStatus" aria-live="polite"></span>
          <div class="proof-actions">
            <button class="ghost-btn" id="compareBtn" aria-pressed="false">对比原图</button>
            <button class="ghost-btn" id="favoritesBtn">收藏 <span id="favCount">0</span></button>
            <button class="ghost-btn" id="zipBtn">打包下载</button>
          </div>
        </div>
        <div class="proof-grid" id="proofGrid"></div>
      </div>
    </section>

    <aside class="inspector">
      <div class="ins-scroll">
      <div class="ins-head"><h2>已选风格</h2><span class="count" id="selCount">3 版</span></div>
      <div class="chips" id="chips"></div>
      <details class="ins-group" open id="adjustGroup">
        <summary><span>调整</span><span class="ins-group-hint">强度 · 油墨 · 颗粒</span></summary>
      <div class="scope-row"><span>参数作用</span><div class="mini-seg" id="scopeGroup" role="group" aria-label="参数作用范围"><button data-scope="shared" class="on">共用</button><button data-scope="style">当前风格</button></div></div>
      <div class="scope-hint" id="scopeHint"></div>
      <button class="note-link" id="resetOverride" hidden>重置本版</button>

      <div class="field" id="strengthField">
        <div class="lab"><span>强度（共用）</span><span class="val" id="strengthVal">86%</span></div>
        <input type="range" id="strength" min="0" max="100" value="86" aria-label="强度，全部已选风格共用">
      </div>

      <div class="field" id="inkField">
        <div class="lab"><span>油墨（共用）</span><span class="val" id="inkVal">朱红</span></div>
        <div class="swatches" id="swatches" role="group" aria-label="油墨颜色">
          <button class="sw on" data-ink="vermilion" style="background:#a8452f" aria-label="朱红"></button>
          <button class="sw" data-ink="indigo" style="background:#2b3a67" aria-label="靛蓝"></button>
          <button class="sw" data-ink="ink" style="background:#1b1813" aria-label="墨黑"></button>
        </div>
      </div>

      <div class="field">
        <div class="lab"><span>颗粒（共用）</span><span class="val" id="grainVal">32%</span></div>
        <input type="range" id="grain" min="0" max="100" value="32" aria-label="颗粒，全部已选风格共用">
      </div>
      </details>

      <details class="ins-group" open id="promptGroup" hidden>
        <summary><span>提示词</span><span class="ins-group-hint" id="promptModeHint">云端 H3</span></summary>
        <div class="field">
          <div class="lab"><span id="promptStyleName">云端风格</span><span class="val" id="promptState">默认</span></div>
          <select class="prompt-select" id="cloudPromptSelect" aria-label="选择云端风格" hidden></select>
          <textarea class="prompt-textarea" id="cloudPrompt" rows="5" spellcheck="false" aria-label="云端提示词"></textarea>
          <div class="prompt-actions">
            <button class="ghost-btn" id="cloudPromptReset">恢复默认</button>
          </div>
        </div>
      </details>

      <details class="ins-group" open id="outputGroup">
        <summary><span>输出</span><span class="ins-group-hint">尺寸 · 画幅 · 画质</span></summary>
      <div id="localOutputFields">
      <div class="field">
        <div class="lab"><span>输出长边</span><span class="val" id="sizeVal">960 px</span></div>
        <div class="size" id="sizeGroup" role="group" aria-label="输出长边">
          <button data-size="640">640</button><button data-size="960" class="on">960</button><button data-size="1200">1200</button>
        </div>
      </div>

      <div class="field">
        <div class="lab"><span>画幅</span><span class="val" id="frameVal">原图</span></div>
        <div class="size" id="frameGroup" role="group" aria-label="画幅">
          <button data-frame="原图" class="on">原图</button><button data-frame="3:2">3:2</button><button data-frame="4:5">4:5</button><button data-frame="3:4">3:4</button>
        </div>
      </div>
      </div>

      <div class="field" id="cloudQualityField" hidden>
        <div class="lab"><span>云端画质</span><span class="val" id="cloudQualityVal">2K</span></div>
        <div class="size" id="cloudQualityGroup" role="group" aria-label="云端画质">
          <button data-quality="1K">1K</button><button data-quality="2K" class="on">2K</button><button data-quality="4K">4K</button>
        </div>
      </div>
      </details>

      <details class="ins-group" open id="borderGroup" hidden>
        <summary><span>后处理</span><span class="ins-group-hint">边框</span></summary>
        <div class="border-options" id="borderOptions" role="group" aria-label="边框效果">
          <button data-border="none" class="on">无</button>
          <button data-border="polaroid">宝丽来</button>
          <button data-border="film">胶片</button>
          <button data-border="paper">留白</button>
        </div>
        <div class="scope-hint" id="borderHint">无边框：保留原图边缘。</div>
      </details>


      <div class="est">
        <div class="est-row"><span>本机 <span id="estLocal">2</span> 版</span><b id="estLocalTime">≈ 0.6 s</b></div>
        <div class="est-row" id="estCloudRow"><span>云端 <span id="estCloud">1</span> 版</span><b id="estCloudCost">¥0.17</b></div>
        <div class="est-total"><span>合计</span><span><b id="estEta">≈ 1 s</b> · <b id="estCost">¥0.00</b></span></div>
      </div>


      </div>

      <button class="go" id="go">生成 3 版</button>
    </aside>
  </main>

  <section class="wf" id="flowPage" aria-label="图像工作流" hidden>
    <div class="wf-workspace">
      <div id="wfGraph" class="wf-graph" aria-label="工作流画布">
        <div class="wf-scene" aria-hidden="true"></div>
        <div id="wfNodes" class="wf-nodes">
          <svg id="wfEdges" class="wf-edges" aria-hidden="true"><defs><marker id="iwWfArrow" markerWidth="6" markerHeight="8" refX="5" refY="4" orient="auto"><path d="M1 1 L5 4 L1 7"/></marker></defs><g><path marker-end="url(#iwWfArrow)"/><path marker-end="url(#iwWfArrow)"/><path marker-end="url(#iwWfArrow)"/><path marker-end="url(#iwWfArrow)"/><path marker-end="url(#iwWfArrow)"/><path marker-end="url(#iwWfArrow)"/></g></svg>
        <button class="wf-node" data-wf-node="0"><b><span class="number">01</span>图片输入</b><small></small></button>
        <button class="wf-node" data-wf-node="1"><b><span class="number">02</span>模型选择</b><small></small></button>
        <button class="wf-node" data-wf-node="2"><b><span class="number">03</span>模型调参</b><small></small></button>
        <button class="wf-node" data-wf-node="3"><b><span class="number">04</span>提示词构建</b><small></small></button>
        <button class="wf-node" data-wf-node="4"><b><span class="number">05</span>分辨率</b><small></small></button>
        <button class="wf-node" data-wf-node="5"><b><span class="number">06</span>生成</b><small></small></button>
        <button class="wf-node" data-wf-node="6"><b><span class="number">07</span>二次编辑</b><small></small></button>
        </div>
        <button class="wf-quiet wf-remove-source" data-wf-action="remove" hidden>移除源图</button><div class="wf-runbar"><button class="go" id="workflowRun">执行工作流</button><p class="wf-sub" id="wfStatus" role="status"></p></div>
        <div class="wf-zoom"><button data-wf-action="out" aria-label="缩小">−</button><button id="wfFit" data-wf-action="fit" aria-label="适应画布">100%</button><button data-wf-action="in" aria-label="放大">+</button></div>
      </div>
      <section class="wf-inspect">
        <h2 id="wfTitle" tabindex="-1"></h2><div id="wfBody" role="region"></div>

      </section>
    </div>
    <input type="file" id="wfFile" accept="image/jpeg,image/png,image/webp" hidden>
    <div class="wf-drop" id="wfDrop" aria-hidden="true"><b>拖入一张图片</b><span>JPEG / PNG / WebP · 最大 20 MB</span></div>
    <dialog class="wf-replace" id="wfReplace" aria-labelledby="wfReplaceTitle">
      <h2 id="wfReplaceTitle">替换源图？</h2>
      <div class="wf-replace-grid"><figure><img id="wfOldImg" alt="当前源图"><figcaption>当前源图</figcaption></figure><figure><img id="wfNewImg" alt="新图预览"><figcaption>新图</figcaption></figure></div>
      <p>替换后保留提示词、模型与历史，不会自动生成。取消不改变当前源图。</p>
      <div class="wf-replace-actions"><button type="button" class="wf-quiet" id="wfReplaceCancel">取消</button><button type="button" class="wf-replace-ok" id="wfReplaceOk">替换</button></div>
    </dialog>
    <dialog class="wf-deck" id="wfDeck" aria-labelledby="wfDeckTitle">
      <div class="wf-row"><h2 id="wfDeckTitle">风格卡包</h2><button class="wf-quiet" id="wfDeckClose">关闭</button></div>
      <div class="wf-deck-cards"></div>
      <p>滑过预览，点击或拖过松手选定。</p>
    </dialog>
  </section>

  <section class="wrap recent-page" id="recentPage" hidden>
    <div class="recent-head">
      <div><h2>最近生成</h2><span id="recentMeta"></span></div>
      <div class="recent-head-actions"><button class="ghost-btn recent-archive-btn" id="recentArchiveToggle" aria-pressed="false"><svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 3.5h11v3h-11z"/><path d="M3.5 6.5v6h9v-6M6.5 9.5h3"/></svg><span id="archiveLabel">归档</span><b id="archiveCount">0</b></button><button class="ghost-btn" id="recentRefresh">刷新</button></div>
    </div>
    <div id="wfHistory"></div><div class="recent-grid" id="recentGrid"></div>
  </section>

  <section class="wrap text-page" id="textPage" hidden>
    <div class="text-head">
      <div><h2>纯文生图</h2><span id="textModeHint">Prompt 增强已关闭 · 不读取参考图</span></div>
    </div>
    <div class="text-layout">
      <div class="text-form">
        <label class="text-label" for="textPrompt">提示词</label>
        <textarea id="textPrompt" rows="9" placeholder="描述想要的画面…" spellcheck="false"></textarea>
        <div class="text-templates"><span>示例风格</span><div id="textTemplates"></div></div>
        <div class="text-model" id="textModel"><span>模型</span><button data-model="minimax" class="on">MiniMax H3</button><button data-model="seedream">Seedream 5.5</button></div>
        <div class="text-options">
          <div class="text-field"><span>画幅</span><div class="mini-seg" id="textAspect"><button data-aspect="1:1" class="on">1:1</button><button data-aspect="4:5">4:5</button><button data-aspect="3:4">3:4</button><button data-aspect="16:9">16:9</button><button data-aspect="9:16">9:16</button></div></div>
          <div class="text-field"><span>画质</span><div class="mini-seg" id="textQuality"><button data-quality="1K">1K</button><button data-quality="2K" class="on">2K</button><button data-quality="4K">4K</button></div></div>
        </div>
        <div class="text-form-foot"><span id="textCost"></span><button class="go" id="textGenerate">生成</button></div>
      </div>
      <div class="text-result" id="textResult">
        <div class="text-empty" id="textEmpty">还没有结果</div>
        <img id="textImage" alt="文生图结果" hidden>
        <div class="text-result-actions" id="textActions" hidden>
          <button class="result-action" id="textView">查看大图</button>
          <button class="result-action" id="textDownload">下载</button>
        </div>
      </div>
    </div>
  </section>

  <section class="wrap text-page seedream-page" id="seedreamPage" hidden>
    <div class="text-head">
      <div><h2>Seedream</h2><span id="seedreamKeyHint">火山方舟 · 文生图 / 图片编辑</span></div>
    </div>
    <div class="text-layout">
      <div class="text-form">
        <div class="seedream-mode" id="seedreamMode"><button data-seedream-mode="text" class="on">文生图</button><button data-seedream-mode="edit">图片编辑</button></div>
        <div class="model-seg" id="seedreamModel"><span>模型</span><button data-seedream-model="doubao-seedream-5-5-261028" class="on">5.5</button><button data-seedream-model="doubao-seedream-4-5-251128">4.5</button><button data-seedream-model="doubao-seedream-4-0-250828">4.0</button></div>
        <div class="seedream-edit" id="seedreamEditBox" hidden>
          <button class="set-action" id="seedreamPick">选择图片</button>
          <input id="seedreamFile" type="file" accept="image/*" hidden>
          <img id="seedreamSource" alt="Seedream 图片编辑输入" hidden>
        </div>
        <label class="text-label" for="seedreamPrompt">提示词</label>
        <textarea id="seedreamPrompt" rows="7" placeholder="描述想要的画面或编辑要求…" spellcheck="false"></textarea>
        <div class="text-options">
          <div class="text-field"><span>画幅</span><div class="mini-seg" id="seedreamAspect"><button data-aspect="1:1" class="on">1:1</button><button data-aspect="4:5">4:5</button><button data-aspect="3:4">3:4</button><button data-aspect="16:9">16:9</button><button data-aspect="9:16">9:16</button></div></div>
          <div class="text-field"><span>画质</span><div class="mini-seg" id="seedreamQuality"><button data-quality="1K">1K</button><button data-quality="2K" class="on">2K</button><button data-quality="4K">4K</button></div></div>
        </div>
        <div class="text-form-foot"><span id="seedreamCost"></span><button class="go" id="seedreamGenerate">生成</button></div>
      </div>
      <div class="text-result" id="seedreamResult">
        <div class="text-empty" id="seedreamEmpty">还没有结果</div>
        <img id="seedreamImage" alt="Seedream 结果" hidden>
        <div class="text-result-actions" id="seedreamActions" hidden>
          <button class="result-action" id="seedreamView">查看大图</button>
          <button class="result-action" id="seedreamDownload">下载</button>
        </div>
      </div>
    </div>
  </section>
</div>

<div class="drawer-layer" id="settingsLayer" aria-hidden="true" inert>
  <div class="drawer-backdrop" data-close></div>
  <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="setTitle">
    <header class="drawer-head">
      <div>
        <h2 id="setTitle">设置</h2>
      </div>
      <button class="icon-btn" data-close aria-label="关闭设置"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg></button>
    </header>

    <div class="drawer-body">
      <section class="set-sec">
        <div class="set-title"><span>启动模式</span></div>
        <div class="set-row wf-motion-row"><label for="wfMotion">减少工作流动态效果</label><span class="wf-switch"><input id="wfMotion" type="checkbox" role="switch"><span aria-hidden="true"><i></i></span></span></div>
        <label class="set-field" for="startupMode">打开图像工作台时<select id="startupMode"><option value="flow">工作流</option><option value="studio">经典工作台</option></select></label>
      </section>
      <section class="set-sec">
        <div class="set-title"><span>模型与密钥</span></div>
        <div class="set-row"><span>MiniMax Key</span><b id="keyState" class="key-state warn">未配置 · 云端不可用</b></div>
        <div class="key-edit" id="keyEdit" hidden>
          <input id="keyInput" type="password" placeholder="sk-..." autocomplete="off">
          <button class="set-action" id="keySave">保存</button>
        </div>
        <div class="set-links">
          <button class="set-action" id="keyChange">更换 Key</button>
        </div>
        <div class="set-row"><span>Seedream Key</span><b id="seedreamKeyState" class="key-state warn">未配置</b></div>
        <div class="key-edit" id="seedreamKeyEdit" hidden>
          <input id="seedreamKeyInput" type="password" placeholder="ARK API Key" autocomplete="off">
          <button class="set-action" id="seedreamKeySave">保存</button>
        </div>
        <div class="set-links"><button class="set-action" id="seedreamKeyChange">更换 Key</button></div>

        <div class="set-subtitle"><span>用量</span></div>
        <div class="set-row"><span>今日云端</span><b id="usageToday">—</b></div>
        <div class="set-row"><span>本月云端</span><b id="usageMonth">—</b></div>
        <div class="set-row"><span>本次</span><b id="usageText">0 张 · ¥0.00</b></div>
        <div class="set-links"><button class="set-action" id="billingLink">刷新用量</button></div>
      </section>


      <section class="set-sec">
        <div class="set-title"><span>输出与隐私</span></div>
        <div class="set-field">
          <span class="lab">默认长边</span>
          <div class="mini-seg" data-group="size"><button>640</button><button class="on">960</button><button>1200</button></div>
        </div>
      </section>

      <section class="set-sec">
        <div class="set-title"><span>自动保存与存储位置</span></div>
        <div class="set-row"><span>当前目录</span><b id="storagePath" class="storage-path">—</b></div>
        <div class="key-edit" id="storageEdit"><input id="storageInput" type="text" autocomplete="off" spellcheck="false" placeholder="/Users/…/Pictures/图像工作台"><button class="set-action" id="storageApply">应用</button></div>
        <p class="settings-note" id="storageNote">作品直接写入该目录；更换目录只影响新作品，不自动移动旧作品。</p>
        <div class="storage-roots" id="storageRoots"></div>
      </section>

      <section class="set-sec last">
        <div class="set-title"><span>风格库管理</span></div>
        <div class="set-row"><span>当前显示</span><b id="packCount">—</b></div>
        <div class="lib-grid" id="libList"></div>
        <div class="set-row"><span>已移除</span><b id="hiddenCount">0 个</b></div>
        <div class="lib-grid lib-grid-hidden" id="hiddenList"></div>
        <div class="set-links">
          <button class="set-action" id="restoreAll" hidden>全部恢复</button>
          <button class="set-action" id="clearHistory">清空历史</button>
          <button class="set-action" id="cleanupBtn">清理 90 天前</button>
        </div>
      </section>
    </div>

    <footer class="drawer-foot">
      <button class="go" id="saveSettings">保存设置</button>
    </footer>
  </aside>
</div>

<div class="drawer-layer" id="queueLayer" aria-hidden="true" inert>
  <div class="drawer-backdrop" data-queue-close></div>
  <aside class="drawer queue-drawer" role="dialog" aria-modal="true" aria-labelledby="queueTitle">
    <header class="drawer-head">
      <div>
        <div class="eyebrow">Queue</div>
        <h2 id="queueTitle">队列</h2>
      </div>
      <div class="queue-head-actions">
        <button class="ghost-btn" id="queueRefresh">刷新</button>
        <button class="icon-btn" data-queue-close aria-label="关闭队列"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg></button>
      </div>
    </header>
    <div class="drawer-body queue-body">
      <p class="queue-status" id="queueStatus" role="status" aria-live="polite">打开后每 2 秒刷新，关闭即停。</p>
      <div class="queue-list" id="queueList"></div>
    </div>
    <footer class="drawer-foot queue-foot">
      <span class="note">H3 + Seedream</span>
      <span class="note" id="queueTotal">0 个作业</span>
    </footer>
  </aside>
</div>

<div class="preview-layer" id="previewLayer" aria-hidden="true" inert>
  <div class="drawer-backdrop" data-preview-close></div>
  <figure class="preview-dialog" role="dialog" aria-modal="true" aria-labelledby="previewTitle">
    <header class="preview-head">
      <h2 id="previewTitle">示例</h2>
      <button class="icon-btn" id="previewClose" data-preview-close aria-label="关闭示例"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg></button>
    </header>
    <div class="preview-stage"><img id="previewImg" alt=""></div>
    <footer class="preview-foot">
      <button class="ghost-btn" id="previewPrev" aria-label="上一个示例">‹</button>
      <span id="previewMeta"></span>
      <button class="ghost-btn" id="previewNext" aria-label="下一个示例">›</button>
    </footer>
  </figure>
</div>

<div class="crop-layer" id="cropLayer" aria-hidden="true" inert>
  <div class="drawer-backdrop" data-crop-close></div>
  <section class="crop-dialog" role="dialog" aria-modal="true" aria-labelledby="cropTitle">
    <header class="crop-head">
      <div><h2 id="cropTitle">裁切图片</h2><span id="cropMeta"></span></div>
      <button class="icon-btn" data-crop-close aria-label="关闭裁切"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg></button>
    </header>
    <div class="crop-ratios" id="cropRatios" role="group" aria-label="裁切比例">
      <button data-crop-ratio="原图" class="on">原图</button>
      <button data-crop-ratio="1:1">1:1</button>
      <button data-crop-ratio="4:5">4:5</button>
      <button data-crop-ratio="3:4">3:4</button>
      <button data-crop-ratio="16:9">16:9</button>
      <button data-crop-ratio="3:2">3:2</button>
    </div>
    <div class="crop-stage" id="cropStage">
      <img id="cropImg" alt="待裁切图片">
      <div class="crop-box" id="cropBox"><span class="crop-hint">拖动调整位置</span></div>
    </div>
    <footer class="crop-foot">
      <span id="cropInfo"></span>
      <div class="crop-actions">
        <button class="ghost-btn" id="cropReset">重置</button>
        <button class="ghost-btn" id="cropRestore">恢复原图</button>
        <button class="go" id="cropApply">应用裁切</button>
      </div>
    </footer>
  </section>
</div>

<div class="result-layer" id="resultLayer" aria-hidden="true" inert>
  <div class="drawer-backdrop" data-result-close></div>
  <figure class="preview-dialog" role="dialog" aria-modal="true" aria-labelledby="resultTitle">
    <header class="preview-head">
      <div class="result-title-box"><h2 id="resultTitle">结果</h2><span id="resultMeta"></span></div>
      <button class="icon-btn" data-result-close aria-label="关闭大图"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg></button>
    </header>
    <div class="preview-stage"><img id="resultBig" alt=""></div>
    <footer class="preview-foot result-foot">
      <div class="result-actions">
        <button class="result-action" id="resultLike" aria-pressed="false"><svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.2 7.2 8.4 3c.3-.6 1.3-.7 1.6.1l.8 2.6h2.4c.9 0 1.5.8 1.3 1.6l-1.1 4.1c-.2.6-.7 1-1.3 1H6.2"/><path d="M6.2 7.2H3.8v5.2h2.4z"/></svg><span>赞</span></button>
        <button class="result-action" id="resultDislike" aria-pressed="false"><svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.8 8.8 7.6 13c-.3.6-1.3.7-1.6-.1L5.2 10.3H2.8c-.9 0-1.5-.8-1.3-1.6l1.1-4.1c.2-.6.7-1 1.3-1h7.9"/><path d="M9.8 8.8h2.4V3.6H9.8z"/></svg><span>踩</span></button>
        <button class="result-action" id="resultFavorite" aria-pressed="false"><svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.4 2.5h7.2c.6 0 1 .4 1 1v10l-4.6-2.8L3.4 13.5v-10c0-.6.4-1 1-1Z"/></svg><span>收藏</span></button>
        <button class="result-action" id="resultRefine"><svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m10.8 2.6 2.6 2.6-6.9 6.9-3.2.6.6-3.2 6.9-6.9Z"/><path d="M9.4 4l2.6 2.6"/></svg><span>多轮编辑</span></button>
        <button class="result-action" id="resultArchive"><svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 3.5h11v3h-11z"/><path d="M3.5 6.5v6h9v-6M6.5 9.5h3"/></svg><span>归档</span></button>
        <button class="result-action" id="resultDownload"><svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 2.8v7.1M5.2 7.2 8 10l2.8-2.8M3 12.5v1.2h10v-1.2"/></svg><span>下载</span></button>
      </div>
    </footer>
  </figure>
</div>

<div class="favorites-layer" id="favoritesLayer" aria-hidden="true" inert>
  <div class="drawer-backdrop" data-favorites-close></div>
  <figure class="preview-dialog favorites-dialog" role="dialog" aria-modal="true" aria-labelledby="favoritesTitle">
    <header class="preview-head">
      <div><h2 id="favoritesTitle">收藏</h2><span id="favoritesMeta"></span></div>
      <button class="icon-btn" data-favorites-close aria-label="关闭收藏"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg></button>
    </header>
    <div class="favorites-grid" id="favoritesGrid"></div>
    <footer class="preview-foot">
      <span>收藏的生成图片会保存在本机</span>
      <button class="ghost-btn" data-favorites-close>关闭</button>
    </footer>
  </figure>
</div>

<div class="multi-layer" id="multiLayer" aria-hidden="true" inert>
  <div class="drawer-backdrop" data-multi-close></div>
  <section class="multi-dialog" role="dialog" aria-modal="true" aria-labelledby="multiTitle">
    <header class="preview-head"><div><h2 id="multiTitle">多图生成</h2><span id="multiMeta"></span></div><button class="icon-btn" data-multi-close aria-label="关闭多图"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg></button></header>
    <div class="multi-body">
      <div class="multi-mode" id="multiMode"><button data-multi-mode="loop" class="on">每张轮询</button><button data-multi-mode="scene">场景组合</button></div>
      <div class="multi-thumbs" id="multiThumbs"></div>
      <div class="multi-results" id="multiResults" hidden></div>
    </div>
    <footer class="preview-foot"><span id="multiCost"></span><div class="multi-actions"><button class="set-action" data-multi-close>取消</button><button class="go" id="multiGenerate">生成</button></div></footer>
  </section>
</div>

<div class="refine-layer" id="refineLayer" aria-hidden="true" inert>
  <div class="drawer-backdrop" data-refine-close></div>
  <section class="preview-dialog refine-dialog" role="dialog" aria-modal="true" aria-labelledby="refineTitle">
    <header class="preview-head">
      <div><h2 id="refineTitle">多轮编辑</h2><span id="refineMeta"></span></div>
      <button class="icon-btn" data-refine-close aria-label="关闭再次编辑"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg></button>
    </header>
    <div class="refine-body">
      <div class="refine-preview" id="refinePreview">
        <div class="refine-stage" id="refineStage">
          <img id="refineSource" alt="待二次编辑的图片">
          <canvas id="refineMaskCanvas" aria-label="蒙版画布：在图片上拖动绘制蒙版"></canvas>
        </div>
      </div>
      <div class="refine-form">
        <label class="refine-label" for="refinePrompt">编辑要求</label>
        <textarea id="refinePrompt" rows="7" spellcheck="false" placeholder="输入下一轮编辑要求…"></textarea>
        <p class="refine-note" id="refineNote">MiniMax 图片编辑会强制执行一次 Prompt 增强；这里输入你的原始编辑要求。</p>
        <div class="refine-options">
          <label><input type="checkbox" id="refineLayers"> 图层拆分（Seedream）</label>
          <label class="refine-max">最多 <input type="number" id="refineLayerMax" min="2" max="100" value="30"> 层</label>
          <div class="refine-region-row"><input type="text" id="refineRegion" placeholder="位置说明，如：左上角招牌 / 人物右手"></div>
          <div class="refine-mask-tools">
            <span class="refine-mask-title">蒙版</span>
            <input type="range" id="refineBrushSize" min="4" max="96" step="1" value="32" aria-label="画笔大小">
            <output id="refineBrushSizeValue" for="refineBrushSize">32 px</output>
            <div class="refine-mask-mode" id="refineBrushMode" role="group" aria-label="蒙版画笔模式">
              <button type="button" data-brush-mode="paint" class="on">画笔</button>
              <button type="button" data-brush-mode="erase">擦除</button>
            </div>
            <button type="button" class="ghost-btn" id="refineMaskClear">清空</button>
            <button type="button" class="ghost-btn" id="refineMaskInvert">反选</button>
          </div>
          <span class="refine-mask-state" id="refineMaskState" role="status" aria-live="polite">蒙版：空</span>
        </div>
        <div class="refine-layer-grid" id="refineLayerGrid" hidden></div>
        <button class="ghost-btn" id="refineLayerZip" hidden>下载全部图层 ZIP</button>
        <div class="model-seg" id="refineModel"><span>模型</span><button data-refine-model="minimax" class="on">MiniMax H3</button><button data-refine-model="seedream">Seedream 5.5</button></div>
        <div class="refine-cost" id="refineCost"></div>
      </div>
    </div>
    <div class="refine-thread" id="refineThread" hidden></div>
    <footer class="preview-foot refine-foot">
      <span id="refineStatus" class="refine-status"></span>
      <div class="refine-actions">
        <button class="ghost-btn" data-refine-close>取消</button>
        <button class="ghost-btn" id="refineDownload" hidden>下载</button>
        <button class="ghost-btn" id="refineView" hidden>查看大图</button>
        <button class="ghost-btn" id="refineAgain" hidden style="display:none">继续编辑</button>
        <button class="go" id="refineStart">开始二次优化</button>
      </div>
    </footer>
  </section>
</div>

<input type="file" id="fileInput" accept="image/*" multiple hidden>
<div class="toast" id="toast" role="status" aria-live="polite"></div>

`;

    function mountPage(root) {
  root.innerHTML = HTML;

  var $ = function (s, el) { return (el || root).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || root).querySelectorAll(s)); };
  var API = '/image-workbench';
  var API_FALLBACK = '/api/image-workbench';

  function apiFetch(path, init, kind) {
    kind = kind || 'json';
    function usable(res) {
      if (res.status === 404) return false;
      var type = (res.headers.get('content-type') || '').toLowerCase();
      return kind === 'json' ? type.indexOf('json') >= 0 : type.indexOf(kind) >= 0;
    }
    return fetch(API + path, init).then(function (res) {
      return usable(res) ? res : fetch(API_FALLBACK + path, init);
    });
  }

  var HISTORY_KEY = 'dsh-image-workbench/history/v1';
  var HIDDEN_KEY = 'dsh-image-workbench/hidden-styles/v1';
  var hiddenStyles = readHiddenStyles();
  var FEEDBACK_KEY = 'dsh-image-workbench/feedback/v1';
  var FAVORITES_KEY = 'dsh-image-workbench/favorites/v1';
  var feedbackStore = readJsonStore(FEEDBACK_KEY, {});
  var favorites = readJsonStore(FAVORITES_KEY, []);
  var ARCHIVE_KEY = 'dsh-image-workbench/archived/v1';
  var archived = readJsonStore(ARCHIVE_KEY, []);
  if (!feedbackStore || typeof feedbackStore !== 'object' || Array.isArray(feedbackStore)) feedbackStore = {};
  if (!Array.isArray(favorites)) favorites = [];
  if (!Array.isArray(archived)) archived = [];
  var showArchived = false;
  function readJsonStore(key, fallback) {
    try { var v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; }
  }
  function writeJsonStore(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
  }
  function hashText(text) {
    var h = 2166136261;
    for (var i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
    return (h >>> 0).toString(36);
  }
  function resultKey(r) {
    return (r.cloud ? 'cloud' : 'local') + ':' + (r.id || r.styleId || '') + ':' + hashText(String(r.url || ''));
  }
  var INKS = { vermilion: '#a8452f', indigo: '#2b3a67', ink: '#1b1813' };
  var INK_NAMES = { vermilion: '朱红', indigo: '靛蓝', ink: '墨黑' };
  var SERIF = '"Songti SC","Iowan Old Style","Source Han Serif SC","Noto Serif SC",Georgia,serif';
  var MONO = '"SF Mono",ui-monospace,Menlo,monospace';
  var SRC = new Image();
  var SAMPLE_URL = '';
  var SAMPLE_IMG = null;
  var disposed = false;
  var cleanups = [];
  var toastTimer = null;
  var previewTimer = null;
  var previewToken = 0;
  var hostHistory = [];
  var hostHistoryReady = false;
  var historyTotal = 0;
  var historyReturnFocus = null;
  var recentLoaded = false;
  var recentLoading = false;
  var historyLoadingMore = false;
  var queueUi = {
    open: false,
    timer: null,
    loading: false,
    jobs: [],
    error: '',
    returnFocus: null,
    refreshAgain: false,
  };

  var CLOUD_EDIT_HEAD = '图1是唯一参考图与构图来源。先读图1：锁定主体数量、身份、姿态、朝向、手部动作、服装轮廓、关键配饰、前中后景关系、镜头高度、裁切范围，以及原文字的位置与排版。成图逐项保持这些关系；不新增、删除或替换主体，不改变动作、视线与空间关系。只改变画种、介质、光线、色彩、边缘与表面质感。最终必须像一张真正完成的完整作品，而不是原图加滤镜。';
  var CLOUD_EDIT_TAIL = '保留原图文字的位置和图形轮廓，不生成新的可读句子；全尺寸下仍能看到材质的真实细节；不要水印、签名、UI、网页边框、平滑数字渐变或塑料感。';
  var CLOUD_SCENE_HEAD = '图1是唯一主体参考。锁定主体数量、身份、面部或关键特征、体型、姿态和主体间关系；成图保留这些核心特征。允许重新设计服装、时代、环境、景别、镜头、光线和空间尺度；不新增或删除主体；新服装或环境必须与主体有真实接触、遮挡、透视和光影关系。最终必须像一张完整完成的作品，而不是原图加滤镜。';
  var CLOUD_SCENE_TAIL = '保留原图文字的位置与图形轮廓，不生成新的可读句子；全尺寸下仍能看到材质与光影细节；不要水印、签名、UI、网页边框或无关长文。';
  var CLOUD_REF_HEAD = '图1是用户上传照片与唯一主体/身份来源；图2只是风格、材质、光线、色彩、笔触与场景语言的参考，绝对不能复制图2中的具体人物、物体、文字、构图或背景内容。保留图1的主体数量、身份、面部或关键特征、姿态和主体间关系；只把图2的视觉语言应用到图1。';
  var CLOUD_SCENE_REF_HEAD = '图1是唯一主体与身份来源；图2只是风格、材质、光线、色彩、场景语言参考，不复制图2中的具体人物、物体、文字或构图。保留图1主体身份、面部特征、姿态和主体间关系；允许重设服装、环境、景别、镜头和空间尺度，但新环境必须与主体有真实接触、遮挡、透视和光影关系。';
  var CLOUD_LAYOUT_HEAD = '图1是唯一设计参考与主体来源。先读图1：锁定主体数量、身份、标志性轮廓、姿态、服装或结构、关键配饰、比例与主要部件关系。成图保持主体设计和身份一致，但允许按该风格重新组织版面与视图；不新增、删除或替换主体，不改变核心结构。只改变呈现方式、介质、光线、色彩与标注体系。最终必须像一张正式完成的设计图、图解或图纸，而不是原图加滤镜。';
  var CLOUD_LAYOUT_TAIL = '标签只描述图中可见的结构与特征，用简短、可读、不重叠的文字；不编造数据、来源或结论；不要水印、签名、UI、网页边框或无关长文。';
  function cloudPrompt(body, layout) {
    return (layout ? CLOUD_LAYOUT_HEAD : CLOUD_EDIT_HEAD) + body + (layout ? CLOUD_LAYOUT_TAIL : CLOUD_EDIT_TAIL);
  }

  function cloudScenePrompt(body) {
    return CLOUD_SCENE_HEAD + body + CLOUD_SCENE_TAIL;
  }

  function cloudRefPrompt(body) {
    return CLOUD_REF_HEAD + body + CLOUD_EDIT_TAIL;
  }

  function cloudSceneRefPrompt(body) {
    return CLOUD_SCENE_REF_HEAD + body + CLOUD_SCENE_TAIL;
  }

  function cloudSealPrompt(body) {
    return body;
  }

  var STYLES = [
    { id: 'halftone', name: '半调网点', renderer: 'canvas', eta: '0.2s', desc: '报纸印刷的网点，适合黑白海报' },
    { id: 'duotone', name: '双色限墨', renderer: 'canvas', eta: '0.2s', desc: '两种油墨叠印，控制纸与墨的比例' },
    { id: 'riso', name: 'Riso 错版', renderer: 'canvas', eta: '0.3s', desc: '套印偏移、纸纹和颗粒，孔版印刷的味道' },
    { id: 'cyanotype', name: '蓝染 / 氰版', renderer: 'canvas', eta: '0.3s', desc: '普鲁士蓝单色，晒版与手工冲印的质感' },
    { id: 'film', name: '胶片褪色', renderer: 'canvas', eta: '0.2s', desc: '提黑、褪色、轻颗粒，像旧底片' },
    { id: 'poster', name: '印刷海报', renderer: 'html', eta: '2.4s', desc: '模板排版：图 + 标题 + 版式，一键出海报' },
    { id: 'h3-illus', name: 'H3 插画化', renderer: 'model', eta: '25s', desc: '暖色插画、细颗粒', prompt: cloudPrompt('暖色叙事插画，不是照片滤镜：深棕手绘轮廓、分层平涂与少量厚涂、纸张或画布的细纹；暖琥珀、砖红、奶油白、橄榄绿，低饱和；柔侧光从左上方照到主体，暖反光、轻光晕与细颗粒；头发、织物、远景用不同密度的笔触，边缘有轻微色晕，主体与背景用空气透视分开；像一本艺术书里的完整插画，不是平滑数字渐变、3D或塑料皮肤。') },
    { id: 'h3-silver', name: 'H3 银盐', renderer: 'model', eta: '25s', desc: '黑白银盐、柔高光', prompt: cloudPrompt('实体黑白银盐照片或暗房印相：深黑保留细节、银灰中间调、柔和高光；细颗粒与轻微 halation；侧逆光或柔侧光塑造体积，相纸纤维和轻微暗角；真实皮肤、发丝和织物纹理；像一张冲印出来的银盐作品，不是数码黑白滤镜、HDR、磨皮或残留彩色。') },
    { id: 'h3-oil', name: '古典油画', renderer: 'model', eta: '25s', desc: '明暗对照、厚涂画布', previewBase: 'film', previewParams: { strength: 0.92, grain: 0.22 }, prompt: cloudPrompt('17世纪欧洲布面油画，老大师/卡拉瓦乔—伦勃朗传统：深橄榄绿、琥珀棕的暗部，单侧暖光从左上照到主体面部和手部；厚涂高光与薄透明罩染并用，保留可见的猪鬃笔触，保留亚麻画布纹理、陈年清漆的暖金和细裂纹；暗部有层次和大面积呼吸空间，构图稳定；像博物馆原作，不是照片、3D、统一裂纹滤镜或过厚颜料。') },
    { id: 'h3-impression', name: '印象派', renderer: 'model', eta: '25s', desc: '短笔触、晨雾海光', previewBase: 'film', previewParams: { strength: 0.58, grain: 0.1 }, prompt: cloudPrompt('实体法国印象派布面油画，莫奈晚期方法：湿画法、粗猪鬃短笔触、纯色并置；形体在光雾中溶解但主体仍可辨；高调粉紫、灰蓝、暖金，阴影只用淡紫和蓝，不用黑；每一寸都有可数的笔触，亮部厚涂，暗部干笔，画布纹理可见；空气和雾由笔触构成，不用数字模糊、平滑渐变、水墨或工笔。') },
    { id: 'h3-manuscript', name: '金箔手抄本', renderer: 'model', eta: '25s', desc: '蛋彩、金箔、卷草边框', previewBase: 'riso', previewParams: { ink: 'vermilion' }, prompt: cloudPrompt('中世纪泥金手抄本插画：羊皮纸底、平涂蛋彩、深墨线、平透视；朱红、群青、古董金，宽卷草纹边框，磨损金箔和不规则手绘；主体变成手抄本中的人物或物件，但保留身份、姿态、构图和原文字位置；金饰和边框不遮挡主体与文字；像真实手抄本页面，不是照片、数字贴金或均匀做旧。') },
    { id: 'h3-dunhuang', name: '敦煌壁画', renderer: 'model', eta: '25s', desc: '矿物颜料、土壁颗粒', previewBase: 'duotone', previewParams: { ink: 'ink' }, prompt: cloudPrompt('唐代敦煌土壁壁画，平面壁画而不是电影场景：土黄壁面、矿物朱砂、石青、石绿、赭石，颗粒和局部剥落露出墙体；细线人物轮廓、飘带、卷云，平涂加局部晕染，重叠关系代替精确透视；保留主体数量、姿态和布局；不要体积光、金属反射、3D、照相机景深或均匀裂纹滤镜。') },
    { id: 'h3-gongbi', name: '工笔重彩', renderer: 'model', eta: '25s', desc: '绢本细线、矿物罩染', previewBase: 'cyanotype', previewParams: { strength: 0.8, grain: 0.16 }, prompt: cloudPrompt('中国工笔重彩绢本：细密均匀的线描、矿物色分层罩染、绢丝纹理和留白；衣纹、发丝和结构边缘用细线，色块薄而多层；主体清晰，背景克制；像手绘绢本，不是写意、油画笔触、照片或数字平滑；不要厚涂、强高光和塑料质感。') },
    { id: 'h3-collage', name: '剪纸拼贴', renderer: 'model', eta: '25s', desc: '色纸刀口、错位剪影', previewBase: 'riso', previewParams: { ink: 'indigo' }, prompt: cloudPrompt('手工剪纸与旧杂志拼贴：分层色纸、清晰刀口和纸边、撕裂边、错位剪影，半调网点和印刷颗粒；钴蓝、米白、橙红、银灰有限色板；主体处理成黑白或单色照片剪贴，轮廓外留干净白边；保留主体、姿态、构图和原文字；像平扫的真实纸拼贴，不是数字拼贴、3D或平滑插画。') },
    { id: 'h3-pixel', name: '像素海报', renderer: 'model', eta: '25s', desc: '像素格、有限调色板', previewBase: 'halftone', prompt: cloudPrompt('实验像素艺术海报：硬边像素方块、混合像素尺度、有限调色板、有序抖动、套色偏移和低分辨率屏幕纹理；主体轮廓由方块构成，眼睛和关键细节保留少量照片信息，边缘逐渐像素化；保留构图和原文字，文字用像素字形；不要平滑渐变、抗锯齿、3D卡通或高光塑料感。') },
    { id: 'h3-film', name: '电影胶片', renderer: 'model', eta: '25s', desc: '35mm、自然光、颗粒', previewBase: 'film', previewParams: { strength: 0.98, grain: 0.18 }, prompt: cloudPrompt('真实35mm纪实或电影胶片照片：自然光或现场现有光，不新增棚拍人工光；35—50mm标准镜头、中景深、真实肤色和材质；中低对比、克制色彩、细颗粒、轻微halation和柔和高光；保留现场光线方向和环境气氛，不添加雾、道具或人物；不要插画、绘画、重度美颜、HDR或过度锐化。') },
    { id: 'h3-concept', name: '概念场景', renderer: 'model', eta: '25s', desc: 'AAA matte painting', previewBase: 'film', previewParams: { strength: 0.72, grain: 0.16 }, prompt: cloudPrompt('AAA游戏或电影概念场景matte painting：清晰前景、结构明确的中景和大气透视远景；写实3D材质与手绘笔触、照片纹理结合；层次光、边缘光、空气尘雾；主体和关键设施保持；只扩展环境的尺度和氛围，不新增叙事主体；不要UI、字幕、水印、塑料3D或廉价CG。') },
    { id: 'h3-shadow', name: '皮影戏', renderer: 'model', eta: '25s', desc: '油灯布幕、皮革关节偶', previewBase: 'riso', previewParams: { ink: 'ink' }, prompt: cloudPrompt('传统中国皮影戏：油灯从背后照亮米色布幕，主体变成半透明皮革关节偶，镂空纹样、竹签控制杆和手影；红木框和流苏，暖黄光晕；平面影戏，保留主体数量、姿态和构图；不要3D、写实照片、现代灯光或塑料质感。') },
    { id: 'h3-eastern', name: '东方幻想线稿', renderer: 'model', eta: '25s', desc: '细线、朱砂金箔、云火纹', previewBase: 'riso', previewParams: { ink: 'vermilion' }, prompt: cloudPrompt('东方幻想动画或工笔重彩线稿：细长流畅的墨线、朱砂、金箔、墨绿、赭石平面色块，云火纹、飘带、珠串；装饰性平面构图，长线贯穿头发、衣褶和饰物；纸纹和斑驳金箔；主体成为画面中心，保留姿态、构图和原文字位置；不要写实照片、厚涂油画、新增角色或无关文字。') },
    { id: 'h3-oldphone', name: '旧手机快照', renderer: 'model', eta: '25s', desc: 'iPhone 7 直出、轻噪点', previewBase: 'film', previewParams: { strength: 0.9, grain: 0.26 }, prompt: cloudPrompt('2017年iPhone 7后置直出照片：28mm、12MP、无美颜、无滤镜、无编辑；自然偏暖、中等饱和、真实肤色；深景深、无人像模式；动态范围有限，高光轻微溢出、阴影有细噪点；随手拍轻微倾斜和不够完美的构图；保留现场；不要电影感、HDR、专业布光、锐化或磨皮。') },
    { id: 'h3-flashfilm', name: '闪光胶片', renderer: 'model', eta: '25s', desc: '直打硬闪、复古胶片', previewBase: 'film', previewParams: { strength: 0.96, grain: 0.3 }, prompt: cloudPrompt('复古直打闪光35mm胶片时尚人像：单灯正面硬闪、脸部高光、背景压暗、清晰硬阴影；真实皮肤纹理、细颗粒、轻微褪色和柔光晕；中近景、实景；保留人物、姿态、构图和原文字；不要柔光棚拍、重度磨皮、HDR或胶片滤镜叠加。') },
    { id: 'h3-dv', name: 'DV 家庭录像', renderer: 'model', eta: '25s', desc: '2001 MiniDV、CCD 低清', previewBase: 'film', previewParams: { strength: 0.84, grain: 0.4 }, prompt: cloudPrompt('2001年MiniDV家庭录像抽帧：4:3、小CCD低清、软细节、阴影彩色噪点、压缩块、自动白平衡偏色、高光溢出和轻微运动拖影；手持轻微倾斜、现场感构图；保留主体、姿态和构图；不要电影调色、胶片颗粒、VHS线、时间码或高清锐化。') },
    { id: 'h3-sticker', name: '贴纸残胶海报', renderer: 'model', eta: '25s', desc: '金属门、胶带、纸屑字形', previewBase: 'riso', previewParams: { ink: 'vermilion' }, prompt: cloudPrompt('实验字体与贴纸残胶海报：磨损冷灰金属门、透明胶带、乳白撕纸、荧光橙标签、卷曲银膜；主体照片碎片保留轮廓和身份，与材料层叠；原文字由材料真实边缘构成，不换成标准字体；留出干净白场，手工拼贴和扫描质感；不要重3D、无关大字、水印或塑料高光。') },
    { id: 'h3-sheet', name: '游戏角色设定', renderer: 'model', eta: '25s', desc: '三视图、写实材质', previewBase: 'film', previewParams: { strength: 0.9, grain: 0.16 }, prompt: cloudPrompt('AAA游戏角色设定图，一张完整版面：同一主体正面、背面、三分之四全身三视图，比例、姿态、服装和配饰一致；中性灰渐变棚拍，柔和顶侧光；写实金属、皮革、织物磨损和缝线；视图之间放局部材质特写；保留主体身份和关键设计；三视图必须在同一张图里，不是三张独立图；不要分屏网页、UI、文字水印或改变角色设计。', true) },
    { id: 'h3-infographic', name: '信息图', renderer: 'model', eta: '25s', desc: '科普图解、细标签', previewBase: 'poster', prompt: cloudPrompt('编辑级信息图或科普图解，一张完整版面：米白纸底、扁平矢量加少量照片碎片、清晰分区、细箭头、短标签和比例尺；主体作为中心图示，保留识别特征；有限色板：米白、墨绿、陶土橙、灰蓝；标签只描述可见结构，文字简短、可读、不重叠；不要复杂3D、重复卡片、长文、编造数据或来源。', true) },
    { id: 'h3-cad', name: '工程蓝图', renderer: 'model', eta: '25s', desc: '正交视图、尺寸线', previewBase: 'cyanotype', prompt: cloudPrompt('正式工程蓝图或CAD图纸：深蓝底加细网格、白色细线；同一主体正交前视、侧视、俯视和等轴测线稿，比例一致；尺寸线、剖面线、中心线、短标签和标题栏；保留主体结构、比例和关键部件；不要照片、阴影、渐变、3D渲染、UI或无关文字。', true) },
    { id: 'h3-surreal', name: '超现实时尚', renderer: 'model', eta: '25s', desc: '实景道具、直闪撞色', previewBase: 'film', previewParams: { strength: 0.88, grain: 0.24 }, prompt: cloudPrompt('复古超现实时尚摄影：真实布景和大道具，鲜艳撞色，直闪加自然光，胶片颗粒，低角度广角；主体保留身份、姿态、服装和构图；只加入一个超现实但物理可信的道具或空间关系，与主体发生真实接触、遮挡和接触阴影；像实拍的复古时尚大片，不要卡通、CG、塑料感或新增人物。') },
    { id: 'h3-sacred', name: '圣光暗童话', renderer: 'model', eta: '25s', desc: '白石雕塑、黑底光环', previewBase: 'film', previewParams: {'strength': 0.9, 'grain': 0.2}, prompt: cloudRefPrompt('白色大理石/石膏雕塑摄影，暗黑神圣与天光：把图1主体转成纯白大理石或石膏雕塑，保留主体身份、数量、姿态、朝向、服装或外形轮廓和构图；石材表面有凿痕、石粉、细裂纹和柔和冷光，衣褶与结构呈硬质雕刻；主体置于纯黑虚空，背后一圈极细的白色霓虹光环，下方由云团或石台承托；冷银灰单色，几乎没有环境色，最多一点冷蓝边缘光；像博物馆雕塑或高级暗黑童话封面；不要活体毛发、森林、树叶、照片、3D游戏、彩色、复杂背景、可爱化或新增角色。图2只作白石雕像、黑底光环、冷银材质的参考，不复制图2的雕像人物。') },
    { id: 'h3-mystic', name: '玄黄奇境', renderer: 'model', eta: '25s', desc: '黄青版画、硬边剪影', previewBase: 'duotone', previewParams: {'ink': 'indigo'}, prompt: cloudSceneRefPrompt('2D丝网印刷/木刻版画海报，不是3D概念场景：把图1主体压缩成深青色硬边剪影，保留主体身份、数量、姿态、朝向和关键轮廓，不画真实毛发、皮肤或体积；深青、墨蓝、明黄、琥珀四色平涂；巨大黄色日轮或月轮占据上方，云层像木刻龙形卷云，背景加同心圆和细线装饰；纸纹、套色偏移、边缘颗粒、少量旧印刷磨损；强对比、几乎无渐变、无景深；图2只作黄青平涂、硬边剪影、木刻云纹和版画颗粒的参考，不复制其中的人物、龙、建筑、文字或构图；不要写实风景、照片、体积云、3D、景深、霓虹、UI或文字。') },
    { id: 'h3-observer', name: '旁观者视角', renderer: 'model', eta: '25s', desc: '宽景、背影、粉彩', previewBase: 'film', previewParams: {'strength': 0.7, 'grain': 0.12}, prompt: cloudSceneRefPrompt('宽景数字插画，旁观者视角：主体在前景或中景，以背影、侧背朝向镜头，成为观众代入的那个瞬间；远处是超现实粉彩地形、白色道路轨迹、小车辆、巨型粉彩云柱和明亮太阳，蓝天留出白色航迹；前景米色岩石、深灰巨石、低矮荒漠植物形成框架；大色块、清晰地平线、空气透视、电影感静止瞬间；保留主体身份、姿态和服装；不要正面肖像、普通风景或过度细节。') },
    { id: 'h3-west1960', name: '1960 西部动画', renderer: 'model', eta: '25s', desc: '正午硬光、手绘西部', previewBase: 'film', previewParams: {'strength': 0.85, 'grain': 0.3}, fixedRatio: '16:9', prompt: cloudSceneRefPrompt('16:9横向宽银幕，1960西部电影×日系手绘数字动画：中近景，主体在干旱灌木平原、木屋或马匹旁；正午硬光、深阴影、地面暖反光、踢起的尘土薄雾；低饱和青绿、赭黄、暗红，手绘动画线稿、纸纹与胶片颗粒；保留主体身份、姿态、服装轮廓与电影式构图；不要现代摄影、3D、海报字体或UI。') },
    { id: 'h3-blackgold', name: '暗金圣骑', renderer: 'model', eta: '25s', desc: '黑金甲胄、圣光', previewBase: 'riso', previewParams: {'ink': 'ink'}, prompt: cloudSceneRefPrompt('暗黑奇幻/巴洛克圣骑士壁纸：黑金高对比，主体重铸为黑钢与暗金ornate甲胄，披风、月牙或圣徽、细密金线、尖刺与层叠甲片；体积圣光与尘雾，纯黑虚空，不要岩石、苔藓、森林、地面或绿色；主体由黑色石台或虚无承托，金属高光与磨损；保留主体身份、面部关键特征和姿态；像一张完成的角色海报，不要塑料3D、游戏UI、文字或水印。') },
    { id: 'h3-ramayana', name: '罗摩衍那', renderer: 'model', eta: '25s', desc: '红金史诗、战车', previewBase: 'riso', previewParams: {'ink': 'vermilion'}, prompt: cloudSceneRefPrompt('印度史诗《罗摩衍那》油画/古典插画：红金主色，强烈动态对角线，战车、黑马、弓与箭、飘动红披风、金色珠宝与繁复纹样；厚涂油画与古典插画质感，烟尘和夕阳；主体成为史诗英雄或神祇，保留身份、姿态、服装轮廓和关键特征；允许战车与马匹作为环境叙事元素，不替换主体；不要现代照片、3DCG、文字或UI。') },
    { id: 'h3-cosmic', name: '星河神性', renderer: 'model', eta: '25s', desc: '黑洞星云、古典油画', previewBase: 'duotone', previewParams: {'ink': 'ink'}, prompt: cloudSceneRefPrompt('星河神性/超现实古典油画：深黑星空与金色星云、黑洞吸积盘，云海翻涌；主体以古典衣褶坐在悬崖或岩石上，背对或侧对观众，仰望深渊；古典油画厚涂、金色神光、巨大尺度、神圣敬畏；保留主体身份、姿态和服装轮廓；允许宇宙环境替换背景；不要普通星空照片、科幻UI、塑料3D或文字。') },
    { id: 'h3-seal', name: '金石印谱', renderer: 'model', eta: '25s', desc: '3:4 双格 · 肖形印蜕', previewBase: 'poster', fixedRatio: '3:4', prompt: cloudSealPrompt('图1是唯一参考照片。请将这张照片制作成一张独立的高级设计海报，不多图拼接，单张输出。整体采用3:4竖版构图，上下两个区域高度严格1:1，各占画面50%。上下两格在中线处直接、干净地拼接，不加粗分隔条、边框、额外画格或标签；所有风格化处理、纸张肌理与色彩变化都只发生在下半部分。\n\n上半部分保留原始照片，保持主体身份、数量、结构、姿态、朝向、真实质感、自然光影与原有色彩氛围，仅进行轻微高级调色，使其具有艺术摄影与东方展览图像质感。为适配画幅，可自然扩展环境背景，但不得拉伸、扭曲、镜像或改变主体；若上传的图像本身是插画，则上半部分照原样保留。\n\n下半部分是一页印谱：中央偏上是一方用朱砂印泥钤出的肖形印印蜕，印面把上方照片中最具识别性的主体压缩为一个篆刻式的剪影符号，刀痕可见、线条古拙、正负形分明，可以是朱文或白文，方形、圆形或随形边框。\n\n下半部分按题材只保留让主体一眼可辨的最少信息：人物保留数量、姿态、朝向、发型与服装主色，不刻画五官细节；动物保留物种特征、花纹与姿态；建筑保留屋顶走势、主要入口与比例；交通工具保留朝向、车轮或船身弧线；风景保留一条地平线、山脊或岸线。删除密集植被、重复窗格、杂乱背景与广告招牌。\n\n印蜕旁边是这方印侧面边款的墨拓：黑色拓片中隐约可见几行刻字与刀痕，形成一红一黑、一印一拓的呼应关系。\n\n材质强调真实篆刻：印泥的颗粒与压印不均、边框的残破与刀口的崩口、宣纸的纤维与轻微晕染、墨拓的浓淡与纸面凹凸。避免数码印章素材、完美矢量边框和3D渲染。\n\n构图：印蜕只占下半部分宽度约20%–25%，边款拓片更窄更长，两者错落放置，纸白不少于70%。\n\n色彩：朱砂红、墨黑与宣纸白构成全部色彩，只允许从上方照片中提取一种颜色以极小的铅笔注记出现。\n\n文字：边款拓片中的刻字与页面角落一行极小的小字说明（印名、尺寸），不限制语种。\n\n整体呈现肖形印蜕、边款墨拓、刀痕古拙与大量纸白构成的东方金石视觉。核心原则是：把一个瞬间，刻进一方石头，再印下来。避免数码印章素材、满版印章、廉价国潮、过度对称、卡通感和模板化 logo。') },
    { id: 'seedream-fashion', name: 'Seedream 时尚墨镜', renderer: 'model', eta: '25s', desc: '官方示例 · 杂志肖像 / 直闪墨镜', prompt: cloudPrompt('高级时装杂志肖像：人物近景，脸部与肩部占画面主体，戴一副夸张的黑色墨镜；单灯直闪或硬质棚拍光，干净背景，真实皮肤质感与细微高光；保留人物身份、面部特征、发型、服装轮廓和姿态；配饰与妆容克制，画面像一页完整的高级时尚大片，不是塑料3D、过度磨皮或广告大字。') },
    { id: 'seedream-animal', name: 'Seedream 动物绘本', renderer: 'model', eta: '25s', desc: '官方示例 · 透明图层 / 动物群像', prompt: cloudPrompt('儿童绘本式动物群像：多种动物在同一片自然场景中，各自姿态清晰、轮廓完整、颜色明快；平面插画与柔和纸纹，动物之间不遮挡关键特征，背景简洁；像一页可以拆分成独立角色的绘本插画，主体边缘干净，不要写实照片、3D塑料感或复杂UI。') },
    { id: 'seedream-acrylic', name: 'Seedream 亚克力立牌', renderer: 'model', eta: '25s', desc: '官方示例 · 透明基材 / 产品质感', prompt: cloudPrompt('透明亚克力立牌产品图：矩形轮廓，四周一圈白色细描边，中心是【主体】的贴纸式插画；复古红、森林绿、香槟金与米白，手账拼贴风，边缘有亚克力厚度带来的高光折射；像真实产品摄影，不是平面海报、塑料3D或模板化大标题。') },
    { id: 'seedream-sticker', name: 'Seedream 贴纸拼版', renderer: 'model', eta: '25s', desc: '官方示例 · 独立贴纸 / 透明边缘', prompt: cloudPrompt('把【主体】做成一组独立贴纸拼版：每枚贴纸轮廓完整、边缘留白清晰、互不重叠，保留原有文字、颜色和关键细节；排列整齐，像一张可直接裁切的贴纸版；不要复杂背景、水印、UI或把贴纸融进场景。') },
    { id: 'h3-refine', name: '二次编辑', renderer: 'model', hidden: true, eta: '25s', desc: '对已生成图片再次编辑' },
    { id: 'h3-text', name: '纯文生图', renderer: 'model', hidden: true, eta: '25s', desc: '纯提示词生成' },
    { id: 'seedream', name: 'Seedream', renderer: 'model', hidden: true, eta: '20s', desc: '火山方舟 Seedream' },
    { id: 'region', name: '区域编辑', renderer: 'canvas', hidden: true, eta: '0s', desc: '蒙版区域合成结果' },
  ];

  STYLES.forEach(function (s) {
    if (s.renderer === 'model') s.preview = API + '/style-preview/' + s.id + '.jpg';
  });

  var state = {
    filter: 'all',
    query: '',
    selected: [],
    focus: null,
    params: { strength: 0.86, ink: 'vermilion', grain: 0.32, size: '960' },
    overrides: {},
    promptOverrides: {},
    scope: 'shared',
    text: { variant: 'poster', title: '静物研究', subtitle: '光与纸的第二次曝光', date: '2026.11', handle: '@IMAGE STUDIO' },
    assetId: null,
    cloudQuality: '2K',
    genModel: 'minimax',
    frame: '原图',
    border: 'none',
    results: [],
    activeResult: null,
    comparing: false,
    generating: false,
    dirty: false,
    source: { name: '', w: 720, h: 860, url: '' },
    originalSource: null,
    isSample: false,
    thumbs: {},
    settings: null
  }
  try { localStorage.removeItem('dsh-image-workbench/prompt-overrides/v1'); } catch (e) {}

  function make(w, h) {
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    return c;
  }
  function cover(ctx, img, w, h, fx, fy) {
    var s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    var dw = img.naturalWidth * s, dh = img.naturalHeight * s;
    var x = (w - dw) * (fx == null ? 0.5 : fx);
    var y = (h - dh) * (fy == null ? 0.62 : fy);
    ctx.drawImage(img, x, y, dw, dh);
  }
  function hex(h) {
    h = h.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function clamp(v) { return v < 0 ? 0 : v > 255 ? 255 : v; }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  var noiseTile = (function () {
    var c = make(140, 140), ctx = c.getContext('2d');
    var d = ctx.createImageData(140, 140);
    for (var i = 0; i < d.data.length; i += 4) {
      var v = (Math.random() * 255) | 0;
      d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
      d.data[i + 3] = 255;
    }
    ctx.putImageData(d, 0, 0);
    return c;
  })();

  function grain(canvas, amount) {
    if (amount <= 0.02) return canvas;
    var ctx = canvas.getContext('2d');
    ctx.save();
    ctx.globalAlpha = Math.min(0.5, amount * 0.55);
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = ctx.createPattern(noiseTile, 'repeat');
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    return canvas;
  }
  function vignette(canvas, amount) {
    var w = canvas.width, h = canvas.height;
    var ctx = canvas.getContext('2d');
    var g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.38, w / 2, h / 2, Math.max(w, h) * 0.74);
    g.addColorStop(0, 'rgba(30,20,12,0)');
    g.addColorStop(1, 'rgba(30,20,12,' + amount + ')');
    ctx.save();
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    return canvas;
  }
  function blend(base, filtered, strength) {
    if (strength >= 0.995) return filtered;
    var out = make(filtered.width, filtered.height), ctx = out.getContext('2d');
    ctx.drawImage(filtered, 0, 0);
    ctx.globalAlpha = 1 - strength;
    ctx.drawImage(base, 0, 0);
    return out;
  }

  /* ————— 滤镜 ————— */
  function duotoneCanvas(src, inkHex, paperHex, gamma) {
    var w = src.width, h = src.height;
    var out = make(w, h), ctx = out.getContext('2d');
    var img = ctx.createImageData(w, h);
    var sd = src.getContext('2d').getImageData(0, 0, w, h).data;
    var d = img.data;
    var ink = hex(inkHex), paper = hex(paperHex);
    for (var i = 0; i < d.length; i += 4) {
      var l = (sd[i] * 0.299 + sd[i + 1] * 0.587 + sd[i + 2] * 0.114) / 255;
      l = Math.min(1, Math.max(0, (l - 0.035) / 0.93));
      var t = Math.pow(l, gamma);
      d[i] = ink[0] + (paper[0] - ink[0]) * t;
      d[i + 1] = ink[1] + (paper[1] - ink[1]) * t;
      d[i + 2] = ink[2] + (paper[2] - ink[2]) * t;
      d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return out;
  }

  function fxHalftone(src, p) {
    var w = src.width, h = src.height;
    var out = make(w, h), o = out.getContext('2d');
    var data = src.getContext('2d').getImageData(0, 0, w, h).data;
    var paper = '#f5ead6';
    o.fillStyle = paper;
    o.fillRect(0, 0, w, h);
    o.fillStyle = INKS[p.ink] || INKS.ink;
    var cell = Math.max(3.6, Math.round(w / 155));
    for (var y = 0; y < h + cell; y += cell) {
      var row = Math.round(y / cell);
      var off = (row % 2) ? cell / 2 : 0;
      for (var x = -cell; x < w + cell; x += cell) {
        var px = Math.min(w - 1, Math.max(0, Math.round(x + off + cell / 2)));
        var py = Math.min(h - 1, Math.max(0, Math.round(y + cell / 2)));
        var i = (py * w + px) * 4;
        var l = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
        var t = Math.min(1, Math.max(0, (l - 0.05) / 0.9));
        var r = (1 - t) * cell * 0.68;
        if (r > 0.38) {
          o.beginPath();
          o.arc(x + off + cell / 2, y + cell / 2, r, 0, Math.PI * 2);
          o.fill();
        }
      }
    }
    return out;
  }

  function fxDuotone(src, p) {
    return duotoneCanvas(src, INKS[p.ink] || INKS.ink, '#f6ecd8', 1.05);
  }

  function inkLayer(src, color, gamma, alphaGain) {
    var w = src.width, h = src.height;
    var out = make(w, h), ctx = out.getContext('2d');
    var img = ctx.createImageData(w, h), d = img.data;
    var sd = src.getContext('2d').getImageData(0, 0, w, h).data;
    var c = hex(color);
    for (var i = 0; i < d.length; i += 4) {
      var l = (sd[i] * 0.299 + sd[i + 1] * 0.587 + sd[i + 2] * 0.114) / 255;
      l = Math.min(1, Math.max(0, (l - 0.04) / 0.92));
      var t = Math.pow(l, gamma);
      d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2];
      d[i + 3] = Math.round(255 * Math.pow(1 - t, 1.3) * alphaGain);
    }
    ctx.putImageData(img, 0, 0);
    return out;
  }

  function gradientMap(src, stops) {
    var w = src.width, h = src.height;
    var out = make(w, h), ctx = out.getContext('2d');
    var img = ctx.createImageData(w, h), d = img.data;
    var sd = src.getContext('2d').getImageData(0, 0, w, h).data;
    var cs = stops.map(function (s) { return { t: s.t, c: hex(s.c) }; });
    for (var i = 0; i < d.length; i += 4) {
      var l = (sd[i] * 0.299 + sd[i + 1] * 0.587 + sd[i + 2] * 0.114) / 255;
      l = Math.min(1, Math.max(0, (l - 0.03) / 0.94));
      var k = 0;
      while (k < cs.length - 2 && l > cs[k + 1].t) k++;
      var a = cs[k], b = cs[k + 1];
      var f = Math.max(0, Math.min(1, (l - a.t) / Math.max(0.0001, b.t - a.t)));
      d[i] = a.c[0] + (b.c[0] - a.c[0]) * f;
      d[i + 1] = a.c[1] + (b.c[1] - a.c[1]) * f;
      d[i + 2] = a.c[2] + (b.c[2] - a.c[2]) * f;
      d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return out;
  }

  function fxRiso(src, p) {
    var w = src.width, h = src.height;
    var out = gradientMap(src, [
      { t: 0, c: '#10293c' },
      { t: 0.3, c: '#1b4a73' },
      { t: 0.5, c: '#c9432f' },
      { t: 0.74, c: '#e6a184' },
      { t: 1, c: '#f8efdd' }
    ]);
    var o = out.getContext('2d');
    var ghost = inkLayer(src, '#c9432f', 1.0, 0.55);
    o.globalCompositeOperation = 'multiply';
    o.globalAlpha = 0.22;
    o.drawImage(ghost, Math.max(2, w * 0.004), -Math.max(1, h * 0.002));
    o.globalCompositeOperation = 'source-over';
    o.globalAlpha = 1;
    return out;
  }

  function fxCyanotype(src, p) {
    var out = duotoneCanvas(src, '#0b2438', '#dbe7ea', 0.9);
    var o = out.getContext('2d');
    o.save();
    o.globalCompositeOperation = 'multiply';
    o.fillStyle = 'rgba(28,66,96,.16)';
    o.fillRect(0, 0, out.width, out.height);
    o.restore();
    return out;
  }

  function fxFilm(src, p) {
    var w = src.width, h = src.height;
    var out = make(w, h), o = out.getContext('2d');
    o.filter = 'sepia(.18) saturate(.92) contrast(.95)';
    o.drawImage(src, 0, 0);
    o.filter = 'none';
    var img = o.getImageData(0, 0, w, h), d = img.data;
    for (var i = 0; i < d.length; i += 4) {
      d[i] = clamp(18 + d[i] * 0.87 + 7);
      d[i + 1] = clamp(13 + d[i + 1] * 0.87 + 3);
      d[i + 2] = clamp(11 + d[i + 2] * 0.85 - 2);
    }
    o.putImageData(img, 0, 0);
    return out;
  }

  function fxPaper(src, p) {
    var w = src.width, h = src.height;
    var out = make(w, h), o = out.getContext('2d');
    o.filter = 'saturate(.55) contrast(.94) brightness(1.05)';
    o.drawImage(src, 0, 0);
    o.filter = 'none';
    o.save();
    o.globalCompositeOperation = 'multiply';
    o.fillStyle = 'rgba(238,224,200,.42)';
    o.fillRect(0, 0, w, h);
    o.restore();
    var g = o.createLinearGradient(w * 0.36, 0, w * 0.45, 0);
    g.addColorStop(0, 'rgba(80,60,40,0)');
    g.addColorStop(0.48, 'rgba(80,60,40,.10)');
    g.addColorStop(0.52, 'rgba(255,255,255,.16)');
    g.addColorStop(1, 'rgba(80,60,40,0)');
    o.fillStyle = g;
    o.fillRect(0, 0, w, h);
    o.fillStyle = 'rgba(70,52,34,.18)';
    for (var i = 0; i < 46; i++) {
      o.fillRect(Math.random() * w, Math.random() * h, 1, 1);
    }
    return out;
  }

  function drawWrappedText(o, text, x, y, maxW, lineH, maxLines) {
    const words = String(text || '').split(/\s+/);
    let line = '', lines = [];
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (o.measureText(test).width > maxW && line) { lines.push(line); line = word; }
      else line = test;
    }
    if (line) lines.push(line);
    lines = lines.slice(0, maxLines || 2);
    lines.forEach(function (ln, i) { o.fillText(ln, x, y + i * lineH); });
    return lines.length;
  }

  function fxPoster(src, w, h, p) {
    var out = make(w, h), o = out.getContext('2d');
    o.fillStyle = '#f1e5d1'; o.fillRect(0, 0, w, h);
    var pad = Math.round(w * 0.045);
    var imgW = Math.round(w * 0.52), imgH = h - pad * 2;
    var tmp = make(imgW, imgH);
    cover(tmp.getContext('2d'), SRC, imgW, imgH, 0.5, 0.62);
    var ht = fxHalftone(tmp, p);
    o.drawImage(ht, pad, pad);
    var x = pad + imgW + Math.round(w * 0.05);
    var t = state.text || {};
    o.fillStyle = '#1b1813';
    o.font = '600 ' + Math.round(h * 0.125) + 'px ' + SERIF;
    drawWrappedText(o, t.title || '静物研究', x, h * 0.26, w - x - pad, Math.round(h * 0.14), 3);
    o.fillStyle = '#5f574b';
    o.font = '400 ' + Math.round(h * 0.026) + 'px ' + SERIF;
    drawWrappedText(o, t.subtitle || '', x, h * 0.56, w - x - pad, Math.round(h * 0.036), 2);
    o.fillStyle = '#a8452f';
    var sq = Math.round(w * 0.02);
    o.fillRect(x, h * 0.68, sq, sq);
    o.fillStyle = '#6f675a';
    o.font = '500 ' + Math.round(w * 0.012) + 'px ' + MONO;
    o.fillText((t.date || '2026.11') + ' / N° 01', x, h * 0.76);
    o.strokeStyle = 'rgba(27,24,19,.28)';
    o.lineWidth = 1;
    o.beginPath(); o.moveTo(x, h * 0.81); o.lineTo(w - pad, h * 0.81); o.stroke();
    o.fillStyle = '#6f675a';
    o.font = '500 ' + Math.round(w * 0.011) + 'px ' + MONO;
    o.fillText(t.handle || '@IMAGE STUDIO', x, h * 0.86);
    return out;
  }

  function fxSocial(src, w, h, p) {
    var out = make(w, h), o = out.getContext('2d');
    o.fillStyle = '#f1e5d1'; o.fillRect(0, 0, w, h);
    var imgH = Math.round(h * 0.62);
    var tmp = make(w, imgH);
    cover(tmp.getContext('2d'), SRC, w, imgH, 0.5, 0.42);
    o.drawImage(fxFilm(tmp, p), 0, 0);
    var pad = Math.round(w * 0.07);
    var t = state.text || {};
    o.fillStyle = '#a8452f';
    o.fillRect(pad, imgH + Math.round(h * 0.045), Math.round(w * 0.06), Math.max(2, Math.round(h * 0.004)));
    o.fillStyle = '#1b1813';
    o.font = '600 ' + Math.round(h * 0.072) + 'px ' + SERIF;
    drawWrappedText(o, t.title || '静物研究', pad, imgH + Math.round(h * 0.16), w - pad * 2, Math.round(h * 0.082), 2);
    o.fillStyle = '#5f574b';
    o.font = '400 ' + Math.round(h * 0.026) + 'px ' + SERIF;
    drawWrappedText(o, t.subtitle || '', pad, imgH + Math.round(h * 0.29), w - pad * 2, Math.round(h * 0.034), 1);
    o.fillStyle = '#6f675a';
    o.font = '500 ' + Math.round(h * 0.019) + 'px ' + MONO;
    o.fillText(t.handle || '@IMAGE STUDIO', pad, h - pad);
    o.textAlign = 'right';
    o.fillText(t.date || '2026.11', w - pad, h - pad);
    o.textAlign = 'left';
    return out;
  }

  function escapeHTML(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function templateHTML(id, w, h, t) {
    var title = escapeHTML(t.title || '静物研究');
    var subtitle = escapeHTML(t.subtitle || '');
    var date = escapeHTML(t.date || '2026.11');
    var handle = escapeHTML(t.handle || '@IMAGE STUDIO');
    var base = 'position:absolute;box-sizing:border-box;font-synthesis:none;-webkit-font-smoothing:antialiased;';
    if (id === 'social') {
      var pad = Math.round(w * 0.07);
      return '<div xmlns="http://www.w3.org/1999/xhtml" style="position:relative;width:' + w + 'px;height:' + h + 'px;overflow:hidden">' +
        '<div style="' + base + 'left:' + pad + 'px;right:' + pad + 'px;top:' + Math.round(h * 0.665) + 'px;color:#1b1813">' +
          '<div style="width:' + Math.round(w * 0.06) + 'px;height:' + Math.max(2, Math.round(h * 0.004)) + 'px;background:#a8452f"></div>' +
          '<div style="margin-top:' + Math.round(h * 0.055) + 'px;font-family:Georgia,\'Songti SC\',serif;font-size:' + Math.round(h * 0.072) + 'px;line-height:1.08;font-weight:600;letter-spacing:-.015em;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">' + title + '</div>' +
          '<div style="margin-top:' + Math.round(h * 0.035) + 'px;font-family:Georgia,\'Songti SC\',serif;font-size:' + Math.round(h * 0.026) + 'px;line-height:1.35;color:#5f574b;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">' + subtitle + '</div>' +
        '</div>' +
        '<div style="' + base + 'left:' + pad + 'px;right:' + pad + 'px;bottom:' + pad + 'px;display:flex;justify-content:space-between;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:' + Math.round(h * 0.019) + 'px;letter-spacing:.02em;color:#6f675a">' +
          '<span>' + handle + '</span><span>' + date + '</span>' +
        '</div>' +
      '</div>';
    }
    var p = Math.round(w * 0.045);
    var x = p + Math.round(w * 0.52) + Math.round(w * 0.05);
    var right = w - x - p;
    return '<div xmlns="http://www.w3.org/1999/xhtml" style="position:relative;width:' + w + 'px;height:' + h + 'px;overflow:hidden">' +
      '<div style="' + base + 'left:' + x + 'px;top:' + Math.round(h * 0.18) + 'px;width:' + right + 'px;color:#1b1813">' +
        '<div style="font-family:Georgia,\'Songti SC\',serif;font-size:' + Math.round(h * 0.125) + 'px;line-height:1.02;font-weight:600;letter-spacing:-.02em;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">' + title + '</div>' +
        '<div style="margin-top:' + Math.round(h * 0.055) + 'px;font-family:Georgia,\'Songti SC\',serif;font-size:' + Math.round(h * 0.026) + 'px;line-height:1.4;color:#5f574b;max-height:' + Math.round(h * 0.09) + 'px;overflow:hidden">' + subtitle + '</div>' +
        '<div style="margin-top:' + Math.round(h * 0.10) + 'px;width:' + Math.round(w * 0.02) + 'px;height:' + Math.round(w * 0.02) + 'px;background:#a8452f"></div>' +
        '<div style="margin-top:' + Math.round(h * 0.055) + 'px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:' + Math.round(w * 0.012) + 'px;letter-spacing:.04em;color:#6f675a">' + date + ' / N° 01</div>' +
        '<div style="margin-top:' + Math.round(h * 0.10) + 'px;border-top:1px solid rgba(27,24,19,.28);padding-top:' + Math.round(h * 0.03) + 'px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:' + Math.round(w * 0.011) + 'px;letter-spacing:.04em;color:#6f675a">' + handle + '</div>' +
      '</div>' +
    '</div>';
  }

  function renderHTMLLayer(html, w, h) {
    return new Promise(function (resolve) {
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '"><foreignObject x="0" y="0" width="' + w + '" height="' + h + '">' + html + '</foreignObject></svg>';
      var img = new Image();
      var done = false;
      var timer = setTimeout(function () { if (!done) { done = true; resolve(null); } }, 2500);
      img.onload = function () {
        if (done) return;
        done = true; clearTimeout(timer);
        try {
          var c = make(w, h);
          c.getContext('2d').drawImage(img, 0, 0);
          resolve(c);
        } catch (e) { resolve(null); }
      };
      img.onerror = function () { if (done) return; done = true; clearTimeout(timer); resolve(null); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
  }

  function renderTemplate(id, w, h, override) {
    var p = Object.assign({}, effective(id), override || {});
    if (!SRC.complete) return Promise.resolve(null);
    var out = make(w, h), o = out.getContext('2d');
    o.fillStyle = '#f1e5d1'; o.fillRect(0, 0, w, h);
    if (id === 'social') {
      var imgH = Math.round(h * 0.62);
      var tmp = make(w, imgH);
      cover(tmp.getContext('2d'), SRC, w, imgH, 0.5, 0.42);
      o.drawImage(fxFilm(tmp, p), 0, 0);
    } else {
      var pad = Math.round(w * 0.045);
      var imgW = Math.round(w * 0.52), imgH2 = h - pad * 2;
      var tmp2 = make(imgW, imgH2);
      cover(tmp2.getContext('2d'), SRC, imgW, imgH2, 0.5, 0.62);
      o.drawImage(fxHalftone(tmp2, p), pad, pad);
    }
    grain(out, p.grain * 0.5);
    vignette(out, 0.06);
    return renderHTMLLayer(templateHTML(id, w, h, state.text), w, h).then(function (layer) {
      if (layer) o.drawImage(layer, 0, 0);
      else {
        var fallback = id === 'social' ? fxSocial(o.canvas, w, h, p) : fxPoster(o.canvas, w, h, p);
        o.clearRect(0, 0, w, h);
        o.drawImage(fallback, 0, 0);
      }
      return out;
    });
  }

  function renderStyleAsync(id, w, h, override) {
    var preset = styleById(id);
    if (preset && preset.renderer === 'preset' && preset.base) {
      return renderStyleAsync(preset.base, w, h, Object.assign({}, preset.packParams || {}, override || {}));
    }
    if (id === 'poster') {
      var layout = (state.text && state.text.variant === 'social') ? 'social' : 'poster';
      return renderTemplate(layout, w, h, override).catch(function () { return renderStyle(id, w, h, override); });
    }
    return Promise.resolve(renderStyle(id, w, h, override));
  }

  function edgeCanvas(src, color, gain, floor) {
    var w = src.width, h = src.height;
    var sd = src.getContext('2d').getImageData(0, 0, w, h).data;
    var g = new Float32Array(w * h);
    for (var i = 0, j = 0; i < sd.length; i += 4, j++) {
      g[j] = (sd[i] * 0.299 + sd[i + 1] * 0.587 + sd[i + 2] * 0.114) / 255;
    }
    var out = make(w, h), ctx = out.getContext('2d');
    var img = ctx.createImageData(w, h), d = img.data;
    var c = hex(color);
    for (var y = 1; y < h - 1; y++) {
      for (var x = 1; x < w - 1; x++) {
        var k = y * w + x;
        var gx = -g[k - w - 1] - 2 * g[k - 1] - g[k + w - 1] + g[k - w + 1] + 2 * g[k + 1] + g[k + w + 1];
        var gy = -g[k - w - 1] - 2 * g[k - w] - g[k - w + 1] + g[k + w - 1] + 2 * g[k + w] + g[k + w + 1];
        var e = Math.min(1, Math.sqrt(gx * gx + gy * gy) * gain);
        var f = floor == null ? 0.12 : floor;
        e = e <= f ? 0 : Math.pow((e - f) / (1 - f), 0.95);
        var idx = k * 4;
        d[idx] = c[0]; d[idx + 1] = c[1]; d[idx + 2] = c[2];
        d[idx + 3] = e * 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return out;
  }

  function fxIllustration(src, p) {
    var w = src.width, h = src.height;
    var out = make(w, h), o = out.getContext('2d');
    var img = o.createImageData(w, h), d = img.data;
    var sd = src.getContext('2d').getImageData(0, 0, w, h).data;
    var palette = [[34, 22, 16], [104, 48, 34], [186, 82, 55], [241, 224, 201]];
    for (var i = 0; i < d.length; i += 4) {
      var l = (sd[i] * 0.299 + sd[i + 1] * 0.587 + sd[i + 2] * 0.114) / 255;
      var k = l < 0.2 ? 0 : l < 0.42 ? 1 : l < 0.68 ? 2 : 3;
      d[i] = palette[k][0]; d[i + 1] = palette[k][1]; d[i + 2] = palette[k][2]; d[i + 3] = 255;
    }
    o.putImageData(img, 0, 0);
    var edges = edgeCanvas(src, '#2a1a12', 2.2, 0.18);
    o.globalAlpha = 0.3;
    o.drawImage(edges, 0, 0);
    o.globalAlpha = 1;
    return out;
  }

  function fxSilver(src, p) {
    var w = src.width, h = src.height;
    var out = make(w, h), o = out.getContext('2d');
    o.filter = 'grayscale(1) contrast(1.06) brightness(1.02)';
    o.drawImage(src, 0, 0);
    o.filter = 'none';
    var img = o.getImageData(0, 0, w, h), d = img.data;
    for (var i = 0; i < d.length; i += 4) {
      var l = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255;
      var v = l < 0.5 ? 0.5 * Math.pow(l * 2, 1.5) : 1 - 0.5 * Math.pow((1 - l) * 2, 1.5);
      v = 255 * (v * 0.98 + 0.01);
      d[i] = d[i + 1] = d[i + 2] = v;
    }
    o.putImageData(img, 0, 0);
    var glow = make(w, h), g = glow.getContext('2d');
    g.filter = 'blur(16px) brightness(1.25)';
    g.drawImage(out, 0, 0);
    g.filter = 'none';
    o.globalCompositeOperation = 'screen';
    o.globalAlpha = 0.16;
    o.drawImage(glow, 0, 0);
    o.globalCompositeOperation = 'source-over';
    o.globalAlpha = 1;
    return out;
  }

  function effective(id) {
    return Object.assign({}, state.params, (id && state.overrides[id]) || {});
  }

  function renderStyle(id, w, h, override) {
    var preset = styleById(id);
    if (preset && preset.renderer === 'preset' && preset.base) {
      return renderStyle(preset.base, w, h, Object.assign({}, preset.packParams || {}, override || {}));
    }
    var p = Object.assign({}, effective(id), override || {});
    var base = make(w, h);
    cover(base.getContext('2d'), SRC, w, h, 0.5, 0.62);
    var out;
    switch (id) {
      case 'halftone': out = fxHalftone(base, p); break;
      case 'duotone': out = fxDuotone(base, p); break;
      case 'riso': out = fxRiso(base, p); break;
      case 'cyanotype': out = fxCyanotype(base, p); break;
      case 'film': out = fxFilm(base, p); break;
      case 'paper': out = fxPaper(base, p); break;
      case 'poster': out = (state.text && state.text.variant === 'social') ? fxSocial(base, w, h, p) : fxPoster(base, w, h, p); break;
      case 'social': out = fxSocial(base, w, h, p); break;
      case 'h3-illus': out = fxIllustration(base, p); break;
      case 'h3-silver': out = fxSilver(base, p); break;
      default: out = base;
    }
    var graphic = id === 'poster' || id === 'social' || id === 'h3-silver' || id === 'h3-illus';
    if (!graphic && p.strength < 0.995) out = blend(base, out, p.strength);
    var isLine = false;
    grain(out, isLine ? p.grain * 0.1 : p.grain);
    vignette(out, isLine ? 0.03 : (id === 'halftone' || id === 'poster' ? 0.1 : id === 'h3-silver' ? 0.3 : 0.16));
    return out;
  }

  /* ————— 尺寸 / 价格 ————— */


  /* ————— 尺寸 / 输出 ————— */
  function frameRatio() {
    if (!state.source.url) {
      var active = null;
      for (var ai = 0; ai < state.results.length; ai++) if (state.results[ai].id === state.activeResult) active = state.results[ai];
      if (active && active.w && active.h) return active.h / active.w;
      return 4 / 3;
    }
    if (state.frame === '原图') return state.source.h / state.source.w;
    if (state.frame === '4:5') return 5 / 4;
    if (state.frame === '3:4') return 4 / 3;
    return 2 / 3;
  }
  function outSize() {
    var w = state.params.size === '640' ? 640 : state.params.size === '1200' ? 1200 : 960;
    return { w: w, h: Math.round(w * frameRatio()) };
  }
  function applyFrame() {
    var stage = $('#stage');
    var print = $('#print');
    if (!stage || !print) return;
    var r = state.border === 'polaroid' ? 1.25 : frameRatio();
    var padX = state.border === 'polaroid' ? 9 : state.border === 'paper' ? 12 : state.border === 'film' ? 9 : 0;
    var padT = padX;
    var padB = state.border === 'polaroid' ? 32 : padX;
    var availW = Math.max(120, stage.clientWidth - 44 - padX * 2);
    var availH = Math.max(120, stage.clientHeight - 40 - padT - padB);
    var h = Math.min(availH, availW * r);
    print.style.width = Math.round(h / r) + 'px';
    print.style.height = Math.round(h) + 'px';
  }
  function price() {
    return state.params.size === '1200' ? 0.24 : state.params.size === '640' ? 0.14 : 0.17;
  }
  function cloudReady() {
    return !!(state.settings && state.settings.hasKey && state.settings.cloud);
  }

  function cloudUnitPrice(quality) {
    var q = quality || state.cloudQuality;
    if (q === '4K') {
      var promoEnd = new Date('2026-11-18T00:00:00+08:00').getTime();
      return Date.now() < promoEnd ? 0.2404 : 0.4809;
    }
    return q === '1K' ? 0.1744 : 0.1747;
  }

  function styleById(id) {
    for (var i = 0; i < STYLES.length; i++) if (STYLES[i].id === id) return STYLES[i];
    return null;
  }
  function addPackStyle(pack) {
    if (!pack || !pack.id || styleById(pack.id)) return false;
    STYLES.push({
      id: pack.id,
      name: pack.name || pack.id,
      renderer: 'preset',
      base: pack.base,
      packParams: pack.params || {},
      preview: pack.preview || '',
      eta: '0.3s',
      desc: '导入预设 · ' + (pack.base || ''),
    });
    return true;
  }

  function loadStyles() {
    apiFetch('/styles', { cache: 'no-store' }).then(function (res) {
      return res.ok ? res.json() : null;
    }).then(function (data) {
      if (!data || !Array.isArray(data.styles)) return;
      var added = false;
      data.styles.forEach(function (pack) { if (addPackStyle(pack)) added = true; });
      if (added) { renderGrid(); renderChips(); }
      renderLibraryManager();
      renderStamp();
    }).catch(function () {});
  }

  function readHiddenStyles() {
    try {
      var list = JSON.parse(localStorage.getItem(HIDDEN_KEY)) || [];
      return Array.isArray(list) ? list.filter(function (id) { return typeof id === 'string'; }) : [];
    } catch (e) { return []; }
  }

  function saveHiddenStyles() {
    try { localStorage.setItem(HIDDEN_KEY, JSON.stringify(hiddenStyles)); } catch (e) {}
  }

  function styleHidden(id) {
    return hiddenStyles.indexOf(id) >= 0;
  }

  function visibleStyles() {
    return STYLES.filter(function (s) { return !s.hidden && !styleHidden(s.id); });
  }

  function libraryType(s) {
    if (s.renderer === 'model') return '云端';
    if (s.renderer === 'preset') return '预设';
    if (s.renderer === 'html') return '模板';
    return '本机';
  }

  function libraryPreview(s) {
    return s.preview || state.thumbs[s.id] || '';
  }

  function libraryCard(s, restore) {
    var action = restore
      ? '<button class="lib-action" data-restore-style="' + s.id + '">恢复</button>'
      : '<button class="lib-action" data-hide-style="' + s.id + '">删除</button>';
    return '<div class="lib-card">' +
      '<span class="lib-thumb">' + (libraryPreview(s) ? '<img src="' + libraryPreview(s) + '" alt="">' : '<span>预设</span>') + '</span>' +
      '<span class="lib-info"><b>' + escapeHTML(s.name) + '</b><span>' + libraryType(s) + ' · ' + s.id + '</span></span>' +
      action +
      '</div>';
  }

  function renderLibraryManager() {
    var visible = visibleStyles();
    var hidden = STYLES.filter(function (s) { return styleHidden(s.id); });
    $('#packCount').textContent = visible.length + ' 个';
    $('#hiddenCount').textContent = hidden.length + ' 个';
    $('#libList').innerHTML = visible.length ? visible.map(function (s) { return libraryCard(s, false); }).join('') : '<div class="lib-empty">风格库为空。</div>';
    $('#hiddenList').innerHTML = hidden.length ? hidden.map(function (s) { return libraryCard(s, true); }).join('') : '';
    $('#restoreAll').hidden = !hidden.length;
  }

  function hideStyleFromLibrary(id) {
    var s = styleById(id);
    if (!s) return;
    if (!window.confirm('从风格库删除「' + s.name + '」？可在「已移除」中恢复。')) return;
    if (!styleHidden(id)) hiddenStyles.push(id);
    saveHiddenStyles();
    state.selected = state.selected.filter(function (x) { return x !== id; });
    if (state.focus === id) state.focus = state.selected[state.selected.length - 1] || null;
    renderGrid();
    renderChips();
    renderProof();
    updateUI();
    renderStamp();
    renderLibraryManager();
    toast('已从风格库移除 · ' + s.name);
  }

  function restoreStyleToLibrary(id) {
    hiddenStyles = hiddenStyles.filter(function (x) { return x !== id; });
    saveHiddenStyles();
    renderGrid();
    renderChips();
    renderProof();
    updateUI();
    renderStamp();
    renderLibraryManager();
    var s = styleById(id);
    toast('已恢复风格 · ' + (s ? s.name : id));
  }

  function restoreAllStyles() {
    hiddenStyles = [];
    saveHiddenStyles();
    renderGrid();
    renderChips();
    renderProof();
    updateUI();
    renderStamp();
    renderLibraryManager();
    toast('已恢复全部风格');
  }

  function filteredStyles() {
    var q = state.query.trim().toLowerCase();
    return STYLES.filter(function (s) {
      if (s.hidden || styleHidden(s.id)) return false;
      if (state.filter === 'local' && s.renderer === 'model') return false;
      if (state.filter === 'cloud' && s.renderer !== 'model') return false;
      if (q && (s.name + s.desc).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }

  /* ————— 界面 ————— */
  function renderGrid() {
    var list = filteredStyles();
    var active = document.activeElement;
    var activeCard = active && active.closest ? active.closest('#styleGrid .card') : null;
    var activeId = activeCard ? activeCard.dataset.id : '';
    $('#styleCount').textContent = ('0' + list.length).slice(-2);
    $('#styleGrid').innerHTML = list.map(function (s) {
      var on = state.selected.indexOf(s.id) >= 0;
      var tag = s.renderer === 'model' ? '云端' : s.renderer === 'html' ? '模板' : s.renderer === 'preset' ? '预设' : '本机';
      var tail = '<span>' + tag + ' · ' + s.eta + '</span>';
      if (s.renderer === 'model') tail += '<span class="price">¥' + cloudUnitPrice().toFixed(2) + '</span>';
      return '<div class="card-wrap">' +
        '<button class="card' + (on ? ' on' : '') + '" data-id="' + s.id + '" title="' + s.desc + '" aria-pressed="' + (on ? 'true' : 'false') + '">' +
        '<img src="' + (state.thumbs[s.id] || '') + '" alt="">' +
        '<span class="tick"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.2 8.6l3 3L12.8 5"/></svg></span>' +
        '<span class="cap"><span class="nm">' + s.name + '</span>' +
        '<span class="mt">' + tail + '</span></span>' +
        '</button>' +
        '<button class="card-zoom" data-zoom="' + s.id + '" aria-label="放大查看 ' + escapeHTML(s.name) + ' 示例" title="放大查看示例"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><path d="M6 2H2v4M10 2h4v4M6 14H2v-4M10 14h4v-4"/></svg></button>' +
        '</div>';
    }).join('');
    if (activeId) {
      var again = $('.card[data-id="' + activeId + '"]');
      if (again) again.focus();
    }
  }

  function renderChips() {
    if (!state.selected.length) {
      $('#chips').innerHTML = '<div class="chips-empty">未选择风格</div>';
      return;
    }
    $('#chips').innerHTML = state.selected.map(function (id) {
      var s = styleById(id);
      var on = state.focus === id;
      var tag = on ? '预览中' : (s.renderer === 'model' ? '云端' : s.renderer === 'html' ? '模板' : s.renderer === 'preset' ? '预设' : '本机');
      return '<div class="chip' + (on ? ' on' : '') + '" data-focus="' + id + '">' +
        '<img src="' + (state.thumbs[id] || '') + '" alt="">' +
        '<span class="cname">' + s.name + '</span><span class="ctag">' + tag + '</span>' +
        '<button class="x" data-remove="' + id + '" aria-label="移除 ' + s.name + '"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg></button>' +
        '</div>';
    }).join('');
  }

  function renderEstimate() {
    var localN = state.selected.filter(function (id) {
      var s = styleById(id);
      return s && s.renderer !== 'model';
    }).length;
    var cloudN = state.selected.filter(function (id) {
      var s = styleById(id);
      return s && s.renderer === 'model';
    }).length;
    var cloudCost = cloudN * cloudUnitPrice();
    $('#estLocal').textContent = localN;
    $('#estLocalTime').textContent = localN ? '≈ ' + (localN * 0.3).toFixed(1) + ' s' : '—';
    $('#estCloud').textContent = cloudN;
    $('#estCloudCost').textContent = cloudN ? '¥' + cloudCost.toFixed(2) : '¥0.00';
    $('#estCloudRow').style.display = cloudN ? '' : 'none';
    var eta = localN * 0.3 + cloudN * 25;
    $('#estEta').textContent = eta > 0 ? '≈ ' + (eta < 1 ? '1' : Math.round(eta)) + ' s' : '≈ 0 s';
    $('#estCost').textContent = '¥' + cloudCost.toFixed(2);
    var cloudNote = $('#cloudNote');
    if (cloudNote) cloudNote.style.display = cloudN ? '' : 'none';
    if (cloudN) {
      var cloudNoteText = $('#cloudNoteText');
      if (cloudNoteText) cloudNoteText.textContent = '含 ' + cloudN + ' 版云端 · 按量 · 国内站 · 约 ¥' + cloudCost.toFixed(2);
    }
  }

  function renderStamp() {
    var success = state.results.filter(function (r) { return !r.error; }).length;
    var cloudResults = state.results.filter(function (r) { return r.cloud && !r.error; });
    var unknownCost = cloudResults.some(function (r) { return !(Number(r.cost) > 0); });
    var cost = cloudResults.reduce(function (sum, r) { return sum + (Number(r.cost) || 0); }, 0);
    $('#stampMain').textContent = '今日 ' + success + ' 张 · ' + (unknownCost ? '¥—' : '¥' + cost.toFixed(2));
    var visible = visibleStyles();
    var localCount = visible.filter(function (x) { return x.renderer !== 'model'; }).length;
    var cloudCount = visible.filter(function (x) { return x.renderer === 'model'; }).length;
    var queueActive = queueActiveCount();
    var queueText = queueActive
      ? '队列 ' + queueActive + ' 进行中'
      : (queueUi.error && !queueUi.jobs.length ? '队列未知' : '队列空闲');
    $('#stampSub').textContent = '本机 ' + localCount + ' · 云端 ' + cloudCount + ' · ' + queueText;
    if ($('#packCount')) $('#packCount').textContent = visible.length + ' 个';
    $('#usageText').textContent = success + ' 张 · ¥' + cost.toFixed(2);
  }

  function selectedCloudIds() {
    return state.selected.filter(function (id) {
      var st = styleById(id);
      return st && st.renderer === 'model';
    });
  }

  function currentCloudStyleId() {
    var ids = selectedCloudIds();
    if (!ids.length) return '';
    if (state.focus && ids.indexOf(state.focus) >= 0) return state.focus;
    var sel = $('#cloudPromptSelect') ? $('#cloudPromptSelect').value : '';
    if (sel && ids.indexOf(sel) >= 0) return sel;
    return ids[0];
  }

  function defaultPrompt(id) {
    var st = styleById(id);
    return (st && st.prompt) || '';
  }

  function styleBody(id) {
    var base = defaultPrompt(id);
    [CLOUD_EDIT_HEAD, CLOUD_EDIT_TAIL, CLOUD_SCENE_HEAD, CLOUD_SCENE_TAIL, CLOUD_LAYOUT_HEAD, CLOUD_LAYOUT_TAIL, CLOUD_REF_HEAD, CLOUD_SCENE_REF_HEAD].forEach(function (part) {
      if (part) base = base.split(part).join('');
    });
    return base.replace(/图1是[^。]*。?/g, '').replace(/图2[^。；\n]*[。；]?/g, '').replace(/图1[^。；\n]*[。；]?/g, '').trim();
  }
  function h3TextPrompt(id) {
    return [
      '创作一张完整、可直接发布的图片。单一清晰主体，明确构图，不要拼贴或网格。',
      '',
      '画面类型与用途：【画面类型/用途】',
      '主体：【主体】——一个可识别的主体，一个动作或姿态；不要重复主体，不要改变身份。',
      '辅助元素：【辅助元素】——只保留这里写到的物体，并给出颜色和画面位置。',
      '构图：【构图】——主体位置、前中后景、机位高度、裁切和留白。',
      '场景与光线：【场景与光线】——地点、时间、光源方向、软硬、阴影和接触面。',
      '风格与材质：' + styleBody(id),
      '文字：默认不出现文字；如需文字，逐字加引号并说明位置，画面不要出现其他文字。',
      '避免：额外主体、重复肢体、水印、签名、UI、塑料3D、平滑数字渐变和无关道具。',
    ].join('\n');
  }
  function h3ImagePrompt(id) {
    return [
      '以图1为唯一源图与构图来源。保持主体数量、身份、面部关键特征、姿态、朝向、服装轮廓、配饰、镜头高度、裁切范围、前中后景关系、原文字位置和光线方向不变。只改变画种、介质、光线、色彩、边缘与表面质感。',
      '若提供图2，只把图2当作风格、材质、光线和色彩参考，不复制图2中的人物、物体、文字或构图。',
      '',
      '风格与材质：' + styleBody(id),
      '',
      '不要新增或删除主体，不改变动作、视线与空间关系，不要水印、签名、UI、塑料3D或平滑数字渐变。',
    ].join('\n');
  }
  function seedreamTextPrompt(id) {
    return [
      '创作一张完整作品，不使用任何参考图。',
      '',
      '画面类型与用途：【画面类型/用途】',
      '主体：【主体】——一个清晰主体，一个动作或姿态。',
      '场景：【场景】——地点、时间、天气和环境层次。',
      '构图与镜头：【构图】——主体位置、前中后景、机位高度、裁切和留白。',
      '光线与色彩：【光线】——光源方向、软硬、阴影和整体色温。',
      '风格与材质：' + styleBody(id),
      '文字：默认不出现文字；如需文字，逐字加引号并说明位置，不要出现其他文字。',
      '避免：额外主体、重复肢体、水印、签名、UI、塑料3D、平滑数字渐变和无关道具。',
    ].join('\n');
  }
  function seedreamImagePrompt(id) {
    return [
      '以参考图1为底图。保持主体数量、身份、面部、姿态、朝向、服装轮廓、配饰、镜头角度、裁切、前后景关系、原文字位置和光线方向不变。',
      '将画面处理成以下风格与材质：' + styleBody(id),
      '若有多张参考图，图2起只补充提示词明确指定的元素，不复制其构图和无关内容。',
      '只做风格化处理，不新增或删除主体，不改变动作、视线与空间关系；不要水印、签名、UI、塑料3D或平滑数字渐变。',
    ].join('\n');
  }
  function promptKey(id) { return state.genModel + ':' + id; }
  function promptOverride(id) {
    var key = promptKey(id);
    if (state.promptOverrides[key] !== undefined) return state.promptOverrides[key];
    if (state.promptOverrides[id] !== undefined) return state.promptOverrides[id];
    return undefined;
  }
  function modelPrompt(id, textMode, seedream) {
    var override = promptOverride(id);
    if (override !== undefined) return override;
    if (seedream) return textMode ? seedreamTextPrompt(id) : seedreamImagePrompt(id);
    return textMode ? h3TextPrompt(id) : h3ImagePrompt(id);
  }
  function basePromptFor(id) {
    var seedream = state.genModel === 'seedream';
    if (!state.source.url) return seedream ? seedreamTextPrompt(id) : h3TextPrompt(id);
    return seedream ? seedreamImagePrompt(id) : h3ImagePrompt(id);
  }
  function promptFor(id) {
    var override = promptOverride(id);
    if (override !== undefined) return override;
    return basePromptFor(id);
  }

  function promptStateLabel(id) {
    return promptOverride(id) !== undefined ? '已修改' : '默认';
  }

  function renderPromptPanel() {
    var ids = selectedCloudIds();
    var group = $('#promptGroup');
    if (!group) return;
    group.hidden = !ids.length;
    if (!ids.length) return;
    var select = $('#cloudPromptSelect');
    if (select) {
      select.innerHTML = ids.map(function (id) {
        var st = styleById(id);
        return '<option value="' + id + '">' + escapeHTML(st ? st.name : id) + '</option>';
      }).join('');
      select.hidden = true;
    }
    if (select) select.value = currentCloudStyleId();
    var id = currentCloudStyleId();
    if (!id) return;
    if (select) select.value = id;
    var st = styleById(id);
    var name = $('#promptStyleName');
    if (name) name.textContent = (st && st.name) || '云端风格';
    var area = $('#cloudPrompt');
    if (area && document.activeElement !== area) area.value = promptFor(id);
    var stateEl = $('#promptState');
    if (stateEl) stateEl.textContent = promptStateLabel(id);
    var modeHint = $('#promptModeHint');
    if (modeHint) modeHint.textContent = (state.genModel === 'seedream' ? 'Seedream 5.5' : 'MiniMax H3') + (state.source.url ? ' · 图片编辑' : ' · 文生图');
  }

  function resetPrompt() {
    var id = currentCloudStyleId();
    if (!id) return;
    delete state.promptOverrides[promptKey(id)];
    delete state.promptOverrides[id];
    var area = $('#cloudPrompt');
    if (area) area.value = basePromptFor(id);
    $('#promptState').textContent = '默认';
    if (state.results.length) state.dirty = true;
    toast('已恢复默认提示词');
  }

  function updateUI() {
    var n = state.selected.length;
    $('#selCount').textContent = n ? n + ' 版' : '未选';
    $('#go').disabled = state.generating || (!state.source.url && !state.selected.length);
    $('#cropBtn').disabled = !state.source.url || state.generating;
    $$('#genModel button').forEach(function (b) { b.classList.toggle('on', b.dataset.genModel === state.genModel); });
    $('#go').hidden = !state.source.url && !state.selected.length;
    var proofEl = document.querySelector('.proof');
    if (proofEl) proofEl.hidden = !state.source.url && !state.selected.length && !state.results.length;
    $('#go').textContent = (!state.source.url && !n) ? '先载入图片' : (state.generating ? '生成中 ' + state.results.length + ' / ' + n : (n ? '生成 ' + n + ' 版' : '生成'));
    $('#proofCount').textContent = state.results.length + ' / ' + (state.generating ? n : (state.results.length || n));
    var successCount = state.results.filter(function (r) { return !r.error; }).length;
    var failedCount = state.results.length - successCount;
    $('#zipBtn').disabled = !successCount || state.dirty || state.generating;
    $('#frameHint').textContent = state.frame === '原图' ? '原图比例' : state.frame + ' 裁切';
    $('#sampleTag').hidden = !state.source.url || !state.isSample;
    var status = $('#proofStatus');
    status.textContent = state.generating ? '生成中…' : (state.dirty ? '参数已修改 · 重新生成' : (state.results.length ? (failedCount ? failedCount + ' 版失败' : '已生成') : ''));
    status.className = 'proof-status' + (state.dirty || failedCount ? ' dirty' : '');
    var focusId = state.focus || state.selected[0] || '';
    var eff = effective(focusId);
    var view = state.scope === 'style' ? eff : state.params;
    $('#strengthVal').textContent = Math.round(view.strength * 100) + '%';
    $('#grainVal').textContent = Math.round(view.grain * 100) + '%';
    $('#inkVal').textContent = INK_NAMES[view.ink] || view.ink;
    var hasOverride = !!(focusId && state.overrides[focusId]);
    $('#resetOverride').hidden = !hasOverride;
    $('#scopeHint').textContent = hasOverride
      ? (state.scope === 'style' ? '只改当前风格；其他风格不变。' : '当前风格有单独覆盖；共用参数不会影响它。')
      : (state.scope === 'style' ? '只改当前风格；其他风格不变。' : '');
    $('#sizeVal').textContent = state.params.size + ' px';
    $('#frameVal').textContent = state.frame;
    var selectedStyles = state.selected.map(styleById).filter(Boolean);
    var hasCloud = selectedStyles.some(function (st) { return st.renderer === 'model'; });
    var hasLocal = selectedStyles.some(function (st) { return st.renderer !== 'model'; });
    var hasCanvas = selectedStyles.some(function (st) { return st.renderer === 'canvas' || st.renderer === 'preset'; });
    var hasTemplate = selectedStyles.some(function (st) { return st.id === 'poster'; });
    $('#adjustGroup').hidden = !hasCanvas;
    $('#promptGroup').hidden = !hasCloud;
    var hasAnyStyle = state.selected.length > 0;
    $('#borderGroup').hidden = !hasAnyStyle;
    var printFrame = $('#printFrame');
    if (printFrame) {
      printFrame.classList.remove('frame-polaroid', 'frame-film', 'frame-paper');
      if (state.border !== 'none') printFrame.classList.add('frame-' + state.border);
      applyFrame();
    }
    $$('#borderOptions button').forEach(function (el) { el.classList.toggle('on', el.dataset.border === state.border); });
    var borderHints = { none: '无边框：保留原图边缘。', polaroid: '宝丽来：4:5 固定比例，中心裁切，奶油白相纸与底部留白。', film: '胶片：黑色片边与齿孔。', paper: '留白：均匀白边，适合排版。' };
    $('#borderHint').textContent = borderHints[state.border] || borderHints.none;
    $('#localOutputFields').hidden = !hasLocal;
    $('#outputGroup').hidden = !hasLocal && !hasCloud;
    $('#cloudQualityField').hidden = !hasCloud;
    var outputHint = hasLocal && hasCloud ? '尺寸 · 画幅 · 画质' : hasCloud ? '画质' : '尺寸 · 画幅';
    var outputHintEl = $('#outputGroup .ins-group-hint');
    if (outputHintEl) outputHintEl.textContent = outputHint;
    $('#cloudQualityVal').textContent = state.cloudQuality;
    $$('#cloudQualityGroup button').forEach(function (el) {
      el.classList.toggle('on', el.dataset.quality === state.cloudQuality);
    });
    var promo = Date.now() < new Date('2026-11-18T00:00:00+08:00').getTime();
    var priceHint = $('#cloudPriceHint');
    if (priceHint) priceHint.textContent = '';
    $$('#scopeGroup button').forEach(function (el) { el.classList.toggle('on', el.dataset.scope === state.scope); });
    var isTemplate = hasTemplate;
    if ($('#textFields')) $('#textFields').hidden = !isTemplate;
    $('#resetOverride').addEventListener('click', function () {
      if (!state.focus) return;
      delete state.overrides[state.focus];
      updateUI();
      renderProof();
      schedulePreview();
    });
    $$('#variantGroup button').forEach(function (el) { el.classList.toggle('on', el.dataset.variant === state.text.variant); });
    var variantVal = $('#textFields .val');
    if (variantVal) variantVal.textContent = state.text.variant === 'social' ? '社交卡片' : '印刷海报';
    var textSummary = $('#textSummary');
    if (textSummary) textSummary.textContent = (state.text.variant === 'social' ? '卡片' : '海报') + ' · ' + (state.text.title || '未命名');
    if (isTemplate) {
      $('#resetOverride').addEventListener('click', function () {
      if (!state.focus) return;
      delete state.overrides[state.focus];
      updateUI();
      renderProof();
      schedulePreview();
    });
    $$('#variantGroup button').forEach(function (el) {
      el.addEventListener('click', function () {
        state.text.variant = el.dataset.variant;
        if (state.results.length) state.dirty = true;
        updateUI();
        buildThumbs(SRC);
        renderProof();
        schedulePreview();
      });
    });
    [['textTitle', 'title'], ['textSubtitle', 'subtitle'], ['textDate', 'date'], ['textHandle', 'handle']].forEach(function (pair) {
        var el = $('#' + pair[0]);
        if (el && document.activeElement !== el) el.value = state.text[pair[1]] || '';
      });
    }
    $('#styleCount').textContent = ('0' + filteredStyles().length).slice(-2);
    $$('#swatches .sw').forEach(function (el) {
      el.classList.toggle('on', el.dataset.ink === view.ink);
    });
    $$('#sizeGroup button').forEach(function (el) {
      el.classList.toggle('on', el.dataset.size === state.params.size);
    });
    $$('#frameGroup button').forEach(function (el) {
      el.classList.toggle('on', el.dataset.frame === state.frame);
    });
    var tonal = state.selected.some(function (id) {
      return ['halftone', 'duotone', 'riso', 'cyanotype', 'film'].indexOf(id) >= 0;
    });
    var inkUsed = state.selected.some(function (id) {
      return ['halftone', 'duotone', 'riso', 'poster'].indexOf(id) >= 0;
    });
    $('#strengthField').style.display = tonal ? '' : 'none';
    $('#inkField').style.display = inkUsed ? '' : 'none';
    $$('#styleGrid .card').forEach(function (el) {
      el.classList.toggle('on', state.selected.indexOf(el.dataset.id) >= 0);
      el.setAttribute('aria-pressed', el.classList.contains('on') ? 'true' : 'false');
    });
    $$('#sizeGroup button').forEach(function (el) { el.setAttribute('aria-pressed', el.classList.contains('on') ? 'true' : 'false'); });
    $$('#frameGroup button').forEach(function (el) { el.setAttribute('aria-pressed', el.classList.contains('on') ? 'true' : 'false'); });
    $$('#swatches .sw').forEach(function (el) { el.setAttribute('aria-pressed', el.classList.contains('on') ? 'true' : 'false'); });
    $$('.seg button').forEach(function (el) { el.setAttribute('aria-pressed', el.classList.contains('on') ? 'true' : 'false'); });
    renderEstimate();
    renderStamp();
    renderPromptPanel();
    updateFavoriteCount();
  }

  function caption(left, right) {
    $('#capLeft').innerHTML = left;
    $('#capRight').textContent = right;
  }

  function schedulePreview() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(showPreview, 70);
  }

  function showOriginal() {
    previewToken++;
    $('#baseImg').hidden = !state.source.url;
    $('#print').classList.add('original-only');
    $('#resultImg').removeAttribute('src');
    state.activeResult = null;
    caption(state.source.url ? '<b>原图</b> · ' + (state.source.name || '未载入') : '<b>文生图</b> · 不传图片模式', state.selected.length ? '点「生成」开始' : '先选一个风格');
  }

  function showPreview() {
    if (!state.source.url) { showOriginal(); return; }
    if (!state.focus) { showOriginal(); return; }
    var s = styleById(state.focus);
    if (s.renderer === 'model') {
      showOriginal();
      caption('<b>云端</b> · ' + s.name, '生成后上传并出图');
      return;
    }
    var token = ++previewToken;
    state.activeResult = null;
    caption('<b>预览</b> · ' + s.name, state.frame + ' · sRGB');
    renderProof();
    renderStyleAsync(state.focus, 720, Math.round(720 * frameRatio())).then(function (c) {
      if (token !== previewToken || disposed || !c) return;
      $('#print').classList.remove('original-only');
      $('#resultImg').src = c.toDataURL('image/jpeg', 0.9);
    }).catch(function () {});
  }

  function showResult(id) {
    previewToken++;
    var idx = -1;
    for (var i = 0; i < state.results.length; i++) if (state.results[i].id === id) idx = i;
    if (idx < 0) return;
    var r = state.results[idx], s = styleById(id) || { name: id };
    state.activeResult = id;
    if (r.error) {
      $('#print').classList.add('original-only');
      $('#resultImg').removeAttribute('src');
      caption('<b>失败</b> · ' + s.name, r.error.message);
      renderProof();
      return;
    }
    $('#print').classList.remove('original-only');
    $('#emptyStage').hidden = true;
    $('#print').style.display = '';
    $('#printFrame').hidden = false;
    $('#baseImg').hidden = !state.source.url;
    $('#resultImg').src = r.url;
    applyFrame();
    caption('<b>结果 ' + ('0' + (idx + 1)).slice(-2) + '</b> · ' + s.name, r.w + ' × ' + r.h + ' · sRGB');
    renderProof();
  }

  function renderProof() {
    var grid = $('#proofGrid');
    var n = state.generating ? state.selected.length : state.results.length;
    grid.style.setProperty('--cols', Math.min(4, Math.max(2, n || 2)));
    if (state.generating) {
      grid.innerHTML = state.selected.map(function (id, i) {
        var r = state.results[i];
        if (r) return proofCard(r, i);
        return '<div class="pcard loading"><div class="ph"></div><div class="pcap"><span>0' + (i + 1) + '</span><span>正在出图…</span></div></div>';
      }).join('');
      return;
    }
    if (!state.results.length) {
      grid.innerHTML = state.selected.length
        ? '<div class="proof-empty">点「生成 ' + state.selected.length + ' 版」，试印会出现在这里。</div>'
        : '<div class="proof-empty">未选择风格</div>';
      return;
    }
    grid.innerHTML = state.results.map(proofCard).join('');
  }

  function proofCard(r, i) {
    var s = styleById(r.id) || { name: r.id };
    var on = state.activeResult === r.id ? ' on' : '';
    if (r.error) {
      var retry = r.error.code === 'unknown' ? '' : '<button class="pcard-retry" data-retry="' + r.id + '" title="重试可能再次计费">重试</button>';
      return '<div class="pcard-wrap">' +
        '<button class="pcard err' + on + '" data-result="' + r.id + '" title="' + escapeHTML(r.error.message) + '">' +
        '<span class="err-msg">' + escapeHTML(r.error.message) + '</span>' +
        '<span class="pcap"><b>0' + (i + 1) + ' · ' + s.name + '</b><span>' + (r.error.code === 'unknown' ? 'unknown' : '失败') + '</span></span>' +
        '</button>' + retry +
        '</div>';
    }
    var frameClass = state.border && state.border !== 'none' ? ' frame-' + state.border : '';
    return '<div class="pcard-wrap">' +
      '<button class="pcard' + frameClass + on + '" data-result="' + r.id + '" title="' + (r.revisedPrompt ? escapeHTML(r.revisedPrompt) : s.name) + '">' +
      '<img src="' + r.url + '" alt="">' +
      '<span class="pcap"><b>0' + (i + 1) + ' · ' + s.name + '</b><span>' + (r.cloud ? '云端' : '本机') + '</span></span>' +
      '</button>' +
      '<button class="pcard-zoom" data-result-zoom="' + r.id + '" title="查看大图" aria-label="查看 ' + s.name + ' 大图">放大</button>' +
      '<button class="pcard-dl" data-download="' + r.id + '" title="下载这一版" aria-label="下载 ' + s.name + '">下载</button>' +
      '</div>';
  }

  function exportSize() {
    var long = Math.min(4096, Math.max(960, Math.max(state.source.w, state.source.h)));
    var r = frameRatio();
    var w, h;
    if (r >= 1) { h = long; w = Math.round(h / r); }
    else { w = long; h = Math.round(w * r); }
    return { w: w, h: h };
  }

  function loadImageUrl(url) {
    return new Promise(function (resolve, reject) {
      var im = new Image();
      im.onload = function () { resolve(im); };
      im.onerror = function () { reject(new Error('image')); };
      im.src = url;
    });
  }

  function triggerDownload(dataUrl, name) {
    var a = document.createElement('a');
    a.href = dataUrl;
    a.download = name;
    a.click();
  }

  function framedCanvas(img, border) {
    var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
    if (!w || !h || !border || border === 'none') return null;
    if (border === 'polaroid') {
      var side = Math.min(w, h);
      var outW = Math.round(side / 0.86);
      var outH = Math.round(outW * 1.25);
      var pc = make(outW, outH), pctx = pc.getContext('2d');
      pctx.fillStyle = '#f6efe1';
      pctx.fillRect(0, 0, outW, outH);
      var sx = Math.round((w - side) / 2), sy = Math.round((h - side) / 2);
      pctx.drawImage(img, sx, sy, side, side, Math.round(outW * 0.07), Math.round(outW * 0.07), side, side);
      return pc;
    }
    var pad = border === 'paper' ? Math.max(16, Math.round(w * 0.04)) : Math.max(12, Math.round(w * 0.024));
    var c = make(w + pad * 2, h + pad * 2), ctx = c.getContext('2d');
    ctx.fillStyle = border === 'film' ? '#111111' : '#fffdf7';
    ctx.fillRect(0, 0, c.width, c.height);
    if (border === 'film') {
      ctx.fillStyle = '#e7c472';
      var hole = Math.max(4, Math.round(w * 0.007));
      for (var x = pad; x < c.width - pad; x += hole * 3) {
        ctx.fillRect(x, 2, hole, Math.max(3, Math.round(pad * 0.35)));
        ctx.fillRect(x, c.height - 2 - Math.max(3, Math.round(pad * 0.35)), hole, Math.max(3, Math.round(pad * 0.35)));
      }
    }
    ctx.drawImage(img, pad, pad, w, h);
    return c;
  }

  function frameDataUrl(url, border) {
    if (!border || border === 'none') return Promise.resolve(url);
    return loadImageUrl(url).then(function (im) {
      var c = framedCanvas(im, border);
      return c ? c.toDataURL('image/jpeg', 0.94) : url;
    });
  }

  function downloadOne(id) {
    if (state.dirty) { toast('参数已修改，先重新生成再下载'); return; }
    var found = null, index = -1;
    for (var i = 0; i < state.results.length; i++) {
      if (state.results[i].id === id) { found = state.results[i]; index = i; }
    }
    if (!found) return;
    if (found.error) { toast('这一版失败了，不能下载'); return; }
    if (found.cloud) {
      var cloudName = 'cloud-' + ('0' + (index + 1)).slice(-2) + '-' + found.id + '.jpg';
      if (state.border && state.border !== 'none') {
        toast('正在套用' + state.border + '边框…');
        frameDataUrl(found.url, state.border).then(function (dataUrl) {
          triggerDownload(dataUrl, cloudName);
          toast('已发起下载 · ' + styleById(id).name + ' · 云端 · ' + state.border);
        }).catch(function () { toast('边框处理失败，请重试'); });
      } else {
        var cloudA = document.createElement('a');
        cloudA.href = found.url;
        cloudA.download = cloudName;
        cloudA.click();
        toast('已发起下载 · ' + styleById(id).name + ' · 云端');
      }
      return;
    }
    var es = exportSize();
    toast('正在导出原图…');
    renderStyleAsync(id, es.w, es.h, found.params ? Object.assign({}, found.params) : undefined).then(function (c) {
      if (!c) { toast('导出失败，请重试'); return; }
      var out = state.border && state.border !== 'none' ? framedCanvas(c, state.border) : c;
      if (!out) out = c;
      triggerDownload(out.toDataURL('image/jpeg', 0.94), 'style-' + ('0' + (index + 1)).slice(-2) + '-' + found.id + '-' + es.w + 'x' + es.h + '.jpg');
      toast('已发起下载 · ' + styleById(id).name + ' · ' + es.w + '×' + es.h);
    }).catch(function () { toast('导出失败，请重试'); });
  }

  function zipAll() {
    if (state.dirty) { toast('参数已修改，先重新生成再打包'); return; }
    if (!state.results.length) { toast('还没有可打包的试印'); return; }
    if (state.generating) { toast('等这一批生成完再打包'); return; }
    var es = exportSize();
    toast('正在打包 ' + state.results.length + ' 张原图…');
    var jobs = state.results.map(function (r, i) {
      if (r.error) return null;
      var name = ('0' + (i + 1)).slice(-2) + '-' + r.id + '.jpg';
      if (r.cloud) {
        return fetch(r.url).then(function (res) {
          if (!res.ok) return null;
          return res.blob();
        }).then(function (blob) {
          if (!blob) return null;
          return blobToDataURL(blob).then(function (dataUrl) {
            return frameDataUrl(dataUrl, state.border).then(function (framed) { return { name: name, dataUrl: framed }; });
          });
        }).catch(function () { return null; });
      }
      return renderStyleAsync(r.id, es.w, es.h, r.params ? Object.assign({}, r.params) : undefined).then(function (c) {
        if (!c) return null;
        var out = state.border && state.border !== 'none' ? framedCanvas(c, state.border) : c;
        if (!out) out = c;
        return { name: name, dataUrl: out.toDataURL('image/jpeg', 0.94) };
      });
    });
    Promise.all(jobs).then(function (files) {
      files = files.filter(Boolean);
      if (!files.length) throw new Error('empty');
      var manifest = {
        app: 'dsh-image-workbench',
        version: '0.38.1',
        createdAt: new Date().toISOString(),
        source: { name: state.source.name, w: state.source.w, h: state.source.h },
        frame: state.frame,
        border: state.border,
        text: state.text,
        items: state.results.filter(function (r) { return !r.error; }).map(function (r) {
          var st = styleById(r.id) || { name: r.id };
          return { styleId: r.id, name: st.name, params: r.params || effective(r.id), w: r.w || es.w, h: r.h || es.h };
        })
      };
      return fetch(API + '/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: files, manifest: manifest })
      });
    }).then(function (res) {
      if (!res.ok) throw new Error('export');
      return res.blob();
    }).then(function (blob) {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'image-workbench-' + new Date().toISOString().slice(0, 10) + '.zip';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
      toast('已导出 ' + state.results.length + ' 张原图');
    }).catch(function () { toast('打包失败；请刷新页面后重试'); });
  }

  /* ————— 生成 ————— */
  function cloudError(message, code) {
    var friendly = message || '云端生成失败';
    if (code === 'insufficient_balance' || /1008|insufficient balance/i.test(friendly)) {
      friendly = 'MiniMax 开放平台余额不足（1008）。请充值按量余额，或改用 M Plan Key。';
    } else if (code === 'auth') {
      friendly = 'API Key 无效或已过期（401）。请在设置里更新 Key。';
    } else if (code === 'content_safety') {
      friendly = '内容安全未通过。换一张图或调整风格后再试。';
    } else if (code === 'rate_limited') {
      friendly = '请求太频繁或额度受限。稍后再试。';
    } else if (code === 'unknown') {
      friendly = '请求已发出，可能已生成并计费，暂未收到结果；不要自动重试。';
    }
    return { code: code || 'cloud_error', message: friendly };
  }

  async function ensureAssetId() {
    if (state.assetId) return state.assetId;
    var saved = await saveAsset(state.source.url, state.source.name, state.source.w, state.source.h);
    if (!saved || !saved.id) throw cloudError('原图上传失败，请检查 Host 存储', 'asset_upload_failed');
    return saved.id;
  }

  async function startCloudJob(assetId, id) {
    var style = styleById(id);
    var jobSize = state.cloudQuality;
    if (style.fixedRatio === '3:4') {
      jobSize = state.cloudQuality === '1K' ? '1152x1536' : state.cloudQuality === '4K' ? '2304x3072' : '1536x2048';
    } else if (style.fixedRatio === '16:9') {
      jobSize = state.cloudQuality === '1K' ? '1280x720' : state.cloudQuality === '4K' ? '4096x2304' : '2048x1152';
    }
    var body = {
      assetId: assetId,
      styleId: id,
      prompt: promptFor(id),
      size: jobSize,
      params: effective(id)
    };
    var opts = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
    var res = await fetch(API + '/cloud/jobs', opts);
    var data = await res.json().catch(function () { return {}; });
    if (res.status === 402 && data.code === 'budget_exceeded') {
      var msg = '今日云端预算不足。\n预计 ¥' + Number(data.estimatedYuan || 0).toFixed(2) +
        ' · 已用 ¥' + Number(data.spentTodayYuan || 0).toFixed(2) +
        ' · 预算 ¥' + Number(data.budgetYuan || 0).toFixed(2) +
        '。\n\n仍要生成这一张吗？';
      if (!window.confirm(msg)) throw cloudError('已取消云端（预算不足）', 'budget_cancelled');
      body.allowOverBudget = true;
      res = await fetch(API + '/cloud/jobs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      data = await res.json().catch(function () { return {}; });
    }
    if (!res.ok) throw cloudError(data.error || ('云端请求失败 ' + res.status), data.code);
    return data;
  }

  async function waitCloudJob(id) {
    var deadline = Date.now() + 620000;
    while (Date.now() < deadline) {
      await sleep(1500);
      if (disposed) throw cloudError('页面已关闭', 'disposed');
      var res = await fetch(API + '/cloud/jobs/' + encodeURIComponent(id), { cache: 'no-store' });
      var job = await res.json().catch(function () { return {}; });
      if (!res.ok) throw cloudError(job.error || ('云端状态读取失败 ' + res.status), job.code);
      if (['succeeded', 'failed', 'unknown', 'canceled'].indexOf(job.status) >= 0) {
        // 事件驱动的单次刷新：作业落定后同步队列徽标，不额外轮询。
        loadQueue({ silent: true });
        return job;
      }
    }
    return { status: 'unknown', error: cloudError('等待超时；请求可能已生成并计费', 'unknown') };
  }

  async function retryCloud(id) {
    var idx = -1;
    for (var i = 0; i < state.results.length; i++) if (state.results[i].id === id) idx = i;
    if (idx < 0) return;
    var failed = state.results[idx];
    if (!failed.error) return;
    if (failed.error.code === 'unknown') { toast('unknown 不允许一键重试；请先核对 MiniMax 账单'); return; }
    if (!cloudReady()) { toast('先在设置里保存 API Key'); openSettings(); return; }
    var style = styleById(id);
    if (!style || style.renderer !== 'model') { toast('这不是云端风格'); return; }
    if (!window.confirm('重试会再次请求 MiniMax，可能再次计费。\n\n继续重试这一张吗？')) return;
    state.generating = true;
    updateUI();
    try {
      var assetId = await ensureAssetId();
      var started = await startCloudJob(assetId, id);
      var job = await waitCloudJob(started.id);
      if (job.status === 'succeeded' && job.output) {
        state.results[idx] = {
          id: id,
          url: job.output.url,
          w: job.output.w,
          h: job.output.h,
          cloud: true,
          params: effective(id),
          cost: cloudUnitPrice(),
          revisedPrompt: job.revisedPrompt || null
        };
        toast('重试成功 · ' + style.name);
        showResult(id);
      } else {
        state.results[idx].error = cloudError(
          (job.error && job.error.message) || ('云端作业 ' + job.status),
          (job.error && job.error.code) || job.status
        );
        state.results[idx].cloud = true;
        state.results[idx].params = effective(id);
        toast('重试失败 · ' + state.results[idx].error.message);
      }
    } catch (err) {
      state.results[idx].error = cloudError(err.message, err.code);
      state.results[idx].cloud = true;
      toast('重试失败 · ' + state.results[idx].error.message);
    }
    state.generating = false;
    renderProof();
    updateUI();
  }

  function gcd(a, b) {
    a = Math.abs(a); b = Math.abs(b);
    while (b) { var t = b; b = a % b; a = t; }
    return a || 1;
  }

  function frameAspectText() {
    if (state.frame === '4:5') return '4:5';
    if (state.frame === '3:4') return '3:4';
    if (state.frame === '3:2') return '3:2';
    return state.source.url ? (Math.round(state.source.w / gcd(state.source.w, state.source.h)) + ':' + Math.round(state.source.h / gcd(state.source.w, state.source.h))) : '3:4';
  }

  function workbenchTextSize() {
    return textTargetSize(frameAspectText(), state.cloudQuality);
  }

  async function sourceDataUrl() {
    if (!state.source.url) return null;
    if (state.source.url.indexOf('data:') === 0) return state.source.url;
    var res = await fetch(state.source.url);
    if (!res.ok) throw cloudError('原图读取失败', 'asset_read_failed');
    return blobToDataUrl(await res.blob());
  }

  async function runSeedreamWorkbench(prompt, size, imageDataUrl) {
    var path = imageDataUrl ? '/seedream/edit' : '/seedream/text';
    var body = { prompt: prompt, size: size, model: 'doubao-seedream-5-5-261028' };
    if (imageDataUrl) body.imageDataUrl = imageDataUrl;
    var res = await apiFetch(path, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok) throw cloudError(data.error || ('Seedream 请求失败 ' + res.status), data.code);
    return { url: data.url, w: data.w, h: data.h, cost: 0.28 };
  }

  async function runH3TextWorkbench(prompt, sizeOverride) {
    var size = sizeOverride || workbenchTextSize();
    var res = await fetch(API + '/cloud/text-jobs', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: prompt, size: size }),
    });
    var data = await res.json().catch(function () { return {}; });
    if (res.status === 402 && data.code === 'budget_exceeded') {
      var msg = '今日云端预算不足。\n预计 ¥' + Number(data.estimatedYuan || 0).toFixed(2) +
        ' · 已用 ¥' + Number(data.spentTodayYuan || 0).toFixed(2) +
        ' · 预算 ¥' + Number(data.budgetYuan || 0).toFixed(2) + '。\n\n仍要生成吗？';
      if (!window.confirm(msg)) throw cloudError('已取消文生图', 'budget_cancelled');
      res = await fetch(API + '/cloud/text-jobs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt, size: size, allowOverBudget: true }),
      });
      data = await res.json().catch(function () { return {}; });
    }
    if (!res.ok) throw cloudError(data.error || ('文生图请求失败 ' + res.status), data.code);
    var job = await waitCloudJob(data.id);
    if (job.status !== 'succeeded' || !job.output) {
      throw cloudError((job.error && job.error.message) || ('文生图作业 ' + job.status), (job.error && job.error.code) || job.status);
    }
    return { url: job.output.url, w: job.output.w, h: job.output.h, cost: cloudUnitPrice() };
  }

  function generate(auto) {
    if (disposed || state.generating) return;
    if (!state.selected.length) {
      toast('还没有选风格，请先从左边风格库选一个');
      var firstCard = $('#styleGrid .card');
      if (firstCard) firstCard.focus();
      return;
    }
    var ids = state.selected.slice();
    var localIds = ids.filter(function (id) {
      var s2 = styleById(id);
      return s2 && s2.renderer !== 'model';
    });
    var cloudIds = ids.filter(function (id) {
      var s2 = styleById(id);
      return s2 && s2.renderer === 'model';
    });
    var isText = !state.source.url;
    if (isText && localIds.length) {
      localIds = [];
      toast('不传图片时只生成云端文生图，本机风格需要图片');
    }
    if (isText && !cloudIds.length) {
      toast('文生图需要选择一个云端风格');
      return;
    }
    var useSeedream = state.genModel === 'seedream';
    if (cloudIds.length) {
      if (useSeedream ? !state.settings.hasSeedreamKey : !cloudReady()) {
        toast(useSeedream ? '先在设置里保存 Seedream Key' : '先在设置里保存 API Key 启用云端');
        openSettings();
        return;
      }
    }
    var size = outSize();
    state.generating = true;
    state.results = [];
    state.activeResult = null;
    state.dirty = false;
    renderProof();
    updateUI();

    (async function () {
      var assetId = null;
      var sourceData = null;
      if (cloudIds.length && !isText) {
        try {
          if (useSeedream) sourceData = await sourceDataUrl();
          else assetId = await ensureAssetId();
        } catch (err) {
          cloudIds.forEach(function (id) {
            state.results.push({ id: id, cloud: true, params: effective(id), error: cloudError(err.message, err.code) });
          });
        }
      }

      for (var i = 0; i < localIds.length; i++) {
        await sleep(210);
        if (disposed) return;
        var c = await renderStyleAsync(localIds[i], size.w, size.h);
        if (!c) continue;
        state.results.push({
          id: localIds[i],
          url: c.toDataURL('image/jpeg', 0.92),
          w: size.w,
          h: size.h,
          params: effective(localIds[i]),
          cost: 0
        });
        renderProof();
        updateUI();
        if (i === 0) showResult(localIds[i]);
      }

      if (cloudIds.length) {
        for (var c2 = 0; c2 < cloudIds.length; c2++) {
          if (disposed) return;
          var cid = cloudIds[c2];
          try {
            var result = null;
            if (isText) {
              if (useSeedream) result = await runSeedreamWorkbench(modelPrompt(cid, true, true), workbenchTextSize());
              else result = await runH3TextWorkbench(modelPrompt(cid, true, false));
            } else if (useSeedream) {
              var g = gcd(state.source.w, state.source.h);
              var asp = Math.round(state.source.w / g) + ':' + Math.round(state.source.h / g);
              result = await runSeedreamWorkbench(modelPrompt(cid, false, true), textTargetSize(asp, state.cloudQuality), sourceData);
            } else if (assetId) {
              var started = await startCloudJob(assetId, cid);
              var job = await waitCloudJob(started.id);
              if (job.status === 'succeeded' && job.output) {
                result = { url: job.output.url, w: job.output.w, h: job.output.h, cost: cloudUnitPrice(), revisedPrompt: job.revisedPrompt || null };
              } else {
                throw cloudError(
                  (job.error && job.error.message) || ('云端作业 ' + job.status),
                  (job.error && job.error.code) || job.status
                );
              }
            }
            if (result) {
              state.results.push({
                id: cid, url: result.url, w: result.w, h: result.h, cloud: true,
                params: effective(cid), cost: result.cost || 0, revisedPrompt: result.revisedPrompt || null
              });
            }
          } catch (err) {
            state.results.push({ id: cid, cloud: true, params: effective(cid), error: cloudError(err.message, err.code) });
          }
          renderProof();
          updateUI();
          if (state.focus === cid) {
            var cloudResult = null;
            for (var k = 0; k < state.results.length; k++) if (state.results[k].id === cid) cloudResult = state.results[k];
            if (cloudResult && !cloudResult.error) showResult(cid);
          }
        }
      }

      if (disposed) return;
      state.generating = false;
      state.dirty = false;
      var focusResult = null;
      for (var j = 0; j < state.results.length; j++) if (state.results[j].id === state.focus) focusResult = state.results[j];
      var target = focusResult || state.results.filter(function (r) { return !r.error; })[0] || state.results[0];
      if (target) showResult(target.id);
      updateUI();
      loadAllHistory(true);
      if (!auto) {
        rememberBatch();
        var okCount = state.results.filter(function (r) { return !r.error; }).length;
        var failCount = state.results.length - okCount;
        toast('试印完成 · ' + okCount + ' 版' + (failCount ? ' · ' + failCount + ' 版失败' : ''));
      }
    })();
  }

  function toggleStyle(id) {
    var s = styleById(id);
    if (!s || state.generating) return;
    if (s.renderer === 'model') {
      var needs = state.genModel === 'seedream' ? !state.settings.hasSeedreamKey : !cloudReady();
      if (needs) {
        toast(state.genModel === 'seedream' ? '先在设置里保存 Seedream Key' : '先在设置里保存 API Key 启用云端');
        openSettings();
        return;
      }
    }
    if (state.selected.indexOf(id) >= 0) {
      removeStyle(id);
      return;
    }
    state.selected.push(id);
    state.focus = id;
    if (state.results.length) state.dirty = true;
    renderGrid();
    renderChips();
    updateUI();
    renderProof();
    schedulePreview();
  }

  function setParam(key, value) {
    if (state.scope === 'style' && state.focus) {
      var next = Object.assign({}, state.overrides[state.focus] || {});
      next[key] = value;
      state.overrides[state.focus] = next;
    } else {
      state.params[key] = value;
    }
  }

  function removeStyle(id) {
    if (state.generating) return;
    state.selected = state.selected.filter(function (x) { return x !== id; });
    if (state.focus === id) state.focus = state.selected[state.selected.length - 1] || null;
    if (state.results.length) state.dirty = true;
    renderGrid();
    renderChips();
    updateUI();
    renderProof();
    schedulePreview();
  }

  /* ————— 图片 ————— */
  function blobToDataURL(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function setSource(url, name, isSample) {
    return new Promise(function (resolve, reject) {
      var im = new Image();
      im.onload = function () {
        if (disposed) return resolve();
        SRC = im;
        state.source = { name: name, w: im.naturalWidth, h: im.naturalHeight, url: url };
        state.originalSource = { name: name, w: im.naturalWidth, h: im.naturalHeight, url: url };
        state.isSample = !!isSample;
        state.frame = '原图';
        state.assetId = null;
        state.results = [];
        state.activeResult = null;
        $('#baseImg').hidden = false;
        $('#baseImg').src = url;
        $('#resultImg').removeAttribute('src');
        $('#emptyStage').hidden = true;
        $('#print').style.display = '';
        $('#printFrame').hidden = false;
        $('#fileMeta').textContent = name + ' · ' + im.naturalWidth + ' × ' + im.naturalHeight;
        $('#sampleTag').hidden = !state.isSample;
        applyFrame();
        updateUI();
        resolve();
      };
      im.onerror = function () { reject(new Error('图片无法解码')); };
      im.src = url;
    });
  }

  function showEmpty() {
    state.source = { name: '', w: 720, h: 860, url: '' };
    state.results = [];
    state.activeResult = null;
    state.dirty = false;
    state.assetId = null;
    $('#emptyStage').hidden = false;
    $('#print').style.display = 'none';
    $('#printFrame').hidden = true;
    $('#fileMeta').textContent = '未载入图片';
    $('#sampleTag').hidden = true;
    state.isSample = false;
    state.originalSource = null;
    state.frame = '原图';
    $('#baseImg').hidden = true;
    $('#baseImg').removeAttribute('src');
    $('#resultImg').removeAttribute('src');
    renderGrid();
    renderChips();
    renderProof();
    updateUI();
  }

  function loadFile(file) {
    if (!file || !/^image\//.test(file.type)) { toast('请选择图片文件'); return; }
    var reader = new FileReader();
    reader.onload = function () {
      setSource(reader.result, file.name).then(function () {
        if (disposed) return;
        state.assetId = null;
        saveAsset(reader.result, file.name, SRC.naturalWidth, SRC.naturalHeight);
        buildThumbs(SRC);
        renderGrid();
        renderChips();
        showPreview();
        renderProof();
        updateUI();
        toast('已载入 ' + file.name);
      }).catch(function () { toast('这张图解不开，换一张试试'); });
    };
    reader.readAsDataURL(file);
  }

  function buildThumbs(img) {
    if (!img || !img.complete) return Promise.resolve();
    var previous = SRC;
    SRC = img;
    return Promise.all(STYLES.map(function (s) {
      if (s.preview) { state.thumbs[s.id] = s.preview; return Promise.resolve(); }
      var previewId = (s.renderer === 'model' && s.previewBase) ? s.previewBase : s.id;
      return renderStyleAsync(previewId, 560, 420, Object.assign({ strength: 0.95, grain: 0.28 }, s.previewParams || {})).then(function (c) {
        if (c) state.thumbs[s.id] = c.toDataURL('image/jpeg', 0.86);
      }).catch(function () {});
    })).then(function () {
      SRC = previous;
      renderGrid();
      renderChips();
    });
  }

  /* ————— 历史 ————— */
  function saveAsset(dataUrl, name, w, h) {
    if (!dataUrl || dataUrl.indexOf('data:') !== 0) return Promise.resolve(null);
    return apiFetch('/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataUrl: dataUrl, name: name, w: w, h: h })
    }).then(function (res) { return res.ok ? res.json() : null; }).then(function (data) {
      if (data && data.id) state.assetId = data.id;
      return data;
    }).catch(function () { return null; });
  }

  function fromHost(entry) {
    return {
      at: new Date(entry.createdAt || Date.now()).getTime(),
      source: entry.source && entry.source.url,
      sourceName: (entry.source && entry.source.name) || 'history',
      assetId: entry.source && entry.source.id,
      styleIds: (entry.results || []).map(function (r) { return r.styleId; }),
      params: {},
      text: entry.text || null,
      frame: entry.frame || '3:2',
      results: (entry.results || []).map(function (r) {
        var st = styleById(r.styleId);
        return { id: r.styleId, url: r.url, w: r.w, h: r.h, cost: Number(r.costYuan) || 0, cloud: !!(st && st.renderer === 'model') };
      }),
      hostId: entry.id,
      archived: entry.archived === true
    };
  }

  function loadHostHistory(limit, offset) {
    limit = limit || 20;
    offset = offset || 0;
    return apiFetch('/history?limit=' + encodeURIComponent(limit) + '&offset=' + encodeURIComponent(offset), { cache: 'no-store' }).then(function (res) {
      return res.ok ? res.json() : null;
    }).then(function (data) {
      if (!data || !Array.isArray(data.entries)) return;
      var mapped = data.entries.map(fromHost);
      hostHistory = offset > 0 ? hostHistory.concat(mapped) : mapped;
      historyTotal = Number.isFinite(Number(data.total)) ? Number(data.total) : hostHistory.length;
      hostHistoryReady = true;
      renderHistory();
      renderHistoryModal();
    }).catch(function () { renderHistory(); });
  }

  function allRecentItems() {
    var items = [];
    currentHistory().forEach(function (entry) {
      (entry.results || []).forEach(function (r) { items.push({ entry: entry, result: r }); });
    });
    return items;
  }
  function archivedIndex(key) {
    for (var i = 0; i < archived.length; i++) if (archived[i] === key) return i;
    return -1;
  }
  function isItemArchived(item) {
    return item.entry.archived === true || archivedIndex(resultKey(item.result)) >= 0;
  }
  function recentItems() {
    return allRecentItems().filter(function (item) {
      var isArch = isItemArchived(item);
      return showArchived ? isArch : !isArch;
    });
  }
  var RC_ICONS = {
    like: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6.2 7.2 8.4 3c.3-.6 1.3-.7 1.6.1l.8 2.6h2.4c.9 0 1.5.8 1.3 1.6l-1.1 4.1c-.2.6-.7 1-1.3 1H6.2"/><path d="M6.2 7.2H3.8v5.2h2.4z"/></svg>',
    dislike: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9.8 8.8 7.6 13c-.3.6-1.3.7-1.6-.1L5.2 10.3H2.8c-.9 0-1.5-.8-1.3-1.6l1.1-4.1c.2-.6.7-1 1.3-1h7.9"/><path d="M9.8 8.8h2.4V3.6H9.8z"/></svg>',
    fav: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4.4 2.5h7.2c.6 0 1 .4 1 1v10l-4.6-2.8L3.4 13.5v-10c0-.6.4-1 1-1Z"/></svg>',
    edit: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="m10.8 2.6 2.6 2.6-6.9 6.9-3.2.6.6-3.2 6.9-6.9Z"/><path d="M9.4 4l2.6 2.6"/></svg>',
    download: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2.8v7.1M5.2 7.2 8 10l2.8-2.8M3 12.5v1.2h10v-1.2"/></svg>',
    archive: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 3.5h11v3h-11z"/><path d="M3.5 6.5v6h9v-6M6.5 9.5h3"/></svg>'
  };
  function recentIconButton(action, index, title, active) {
    return '<button type="button" class="rc-action' + (active ? ' on' : '') + '" data-recent-action="' + action + '" data-recent-index="' + index + '" title="' + escapeHTML(title) + '" aria-label="' + escapeHTML(title) + '">' + RC_ICONS[action] + '</button>';
  }
  function renderRecentPage() {
    var grid = $('#recentGrid');
    if (!grid) return;
    var items = recentItems();
    var allItems = allRecentItems();
    var archCount = allItems.filter(isItemArchived).length;
    $('#recentTabCount').textContent = String(items.length);
    $('#archiveCount').textContent = String(archCount);
    var toggle = $('#recentArchiveToggle');
    var archiveLabel = $('#archiveLabel');
    if (toggle) {
      toggle.classList.toggle('on', showArchived);
      toggle.setAttribute('aria-pressed', showArchived ? 'true' : 'false');
      toggle.title = showArchived ? '返回最近生成' : '查看已归档图片';
    }
    if (archiveLabel) archiveLabel.textContent = showArchived ? '返回最近' : '归档';
    $('#recentMeta').textContent = recentLoading ? '载入中…' : (showArchived ? '已归档 · ' + items.length + ' 张' : (items.length ? items.length + ' 张 · ' + currentHistory().length + ' 次生成' : ''));
    if (!items.length) {
      grid.innerHTML = '<div class="recent-empty">' + (recentLoading ? '载入中…' : (showArchived ? '还没有归档图片' : '还没有生成记录')) + '</div>';
      return;
    }
    grid.innerHTML = items.map(function (item, i) {
      var r = item.result;
      var s = styleById(r.id) || { name: r.id || '生成图片' };
      var key = resultKey(r);
      var fb = feedbackStore[key] || '';
      var fav = favoriteIndex(key) >= 0;
      var isArch = isItemArchived(item);
      return '<article class="recent-card">'
        + '<button class="recent-open" data-recent-open="' + i + '" aria-label="查看 ' + escapeHTML(s.name) + '"><img loading="lazy" data-recent-key="' + escapeHTML(key) + '" src="' + escapeHTML(r.url) + '" alt="' + escapeHTML(s.name) + '">'
        + '<span class="rc-style">' + escapeHTML(s.name) + '</span>'
        + '<span class="rc-meta">' + escapeHTML(dateTimeLabel(item.entry.at)) + ' · ' + r.w + ' × ' + r.h + (r.cloud ? ' · 云端' : ' · 本机') + '</span></button>'
        + '<div class="recent-actions">'
        + recentIconButton('like', i, '赞', fb === 'up')
        + recentIconButton('dislike', i, '踩', fb === 'down')
        + recentIconButton('fav', i, fav ? '取消收藏' : '收藏', fav)
        + recentIconButton('edit', i, '多轮编辑', false)
        + recentIconButton('download', i, '下载', false)
        + recentIconButton('archive', i, isArch ? '取消归档' : '归档', isArch)
        + '</div>'
        + '</article>';
    }).join('');
  }
  function toggleArchiveKey(key) {
    var idx = archivedIndex(key);
    if (idx >= 0) archived.splice(idx, 1);
    else { archived.unshift(key); if (archived.length > 400) archived.pop(); }
    if (!writeJsonStore(ARCHIVE_KEY, archived)) { toast('归档保存失败'); return false; }
    return idx < 0;
  }
  async function setItemArchived(item, flag) {
    if (item.entry.hostId) {
      try {
        var res = await apiFetch('/history/archive', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: item.entry.hostId, archived: flag }),
        });
        if (!res.ok) throw new Error('归档保存失败');
        item.entry.archived = flag;
        var localKey = resultKey(item.result);
        var idx = archivedIndex(localKey);
        if (idx >= 0) { archived.splice(idx, 1); writeJsonStore(ARCHIVE_KEY, archived); }
        return flag;
      } catch (err) { toast(err.message || '归档保存失败'); return null; }
    }
    return toggleArchiveKey(resultKey(item.result));
  }

  async function recentAction(action, index) {
    var item = recentItems()[index];
    if (!item) return;
    var r = item.result;
    var key = resultKey(r);
    if (action === 'like') {
      feedbackStore[key] = feedbackStore[key] === 'up' ? '' : 'up';
      writeJsonStore(FEEDBACK_KEY, feedbackStore);
      renderRecentPage();
      return;
    }
    if (action === 'dislike') {
      feedbackStore[key] = feedbackStore[key] === 'down' ? '' : 'down';
      writeJsonStore(FEEDBACK_KEY, feedbackStore);
      renderRecentPage();
      return;
    }
    if (action === 'fav') {
      var fi = favoriteIndex(key);
      if (fi >= 0) favorites.splice(fi, 1);
      else {
        var st = styleById(r.id) || { name: r.id || '生成图片' };
        favorites.unshift({ key: key, url: r.url, title: st.name, styleId: r.id, styleName: st.name, w: r.w, h: r.h, cloud: !!r.cloud, border: 'none', at: Date.now() });
        if (favorites.length > 40) favorites.pop();
      }
      writeJsonStore(FAVORITES_KEY, favorites);
      updateFavoriteCount();
      renderRecentPage();
      return;
    }
    if (action === 'download') {
      var st2 = styleById(r.id) || { name: r.id || '生成图片' };
      triggerDownload(r.url, st2.name + '-' + Date.now() + '.jpg');
      return;
    }
    if (action === 'archive') {
      var archivedNow = await setItemArchived(item, !isItemArchived(item));
      if (archivedNow === null) return;
      toast(archivedNow ? '已归档，文件仍保留在本机' : '已取消归档');
      renderRecentPage();
      return;
    }
    if (action === 'edit') {
      openRecentImage(index);
      openRefine();
    }
  }

  function loadAllHistory(force) {
    if (recentLoading) return Promise.resolve();
    if (recentLoaded && !force) { renderRecentPage(); return Promise.resolve(); }
    recentLoading = true;
    renderRecentPage();
    var all = [];
    var total = 0;
    function page(offset) {
      return apiFetch('/history?limit=100&offset=' + offset, { cache: 'no-store' }).then(function (res) {
        return res.ok ? res.json() : null;
      }).then(function (data) {
        if (!data || !Array.isArray(data.entries)) throw new Error('历史加载失败');
        total = Number.isFinite(Number(data.total)) ? Number(data.total) : data.entries.length;
        all = all.concat(data.entries.map(fromHost));
        if (data.entries.length && all.length < total) return page(all.length);
      });
    }
    return page(0).then(function () {
      hostHistory = all;
      historyTotal = total;
      hostHistoryReady = true;
      recentLoaded = true;
    }).catch(function () {
      recentLoaded = true;
      if (!all.length) toast('历史加载失败');
    }).then(function () {
      recentLoading = false;
      renderRecentPage();
    });
  }

  function resultModelName(r) {
    var id = String(r && r.id || '');
    if (id === 'region') return '区域合成';
    return /^seedream/.test(id) ? 'Seedream 5.5' : 'MiniMax H3';
  }
  function openRecentImage(index) {
    var item = recentItems()[index];
    if (!item) return;
    var r = item.result;
    var s = styleById(r.id) || { name: r.id || '生成图片' };
    openBig({
      key: resultKey(r),
      url: r.url,
      title: s.name,
      meta: dateTimeLabel(item.entry.at) + ' · ' + resultModelName(r) + ' · ' + (r.w && r.h ? r.w + ' × ' + r.h : '读取尺寸…'),
      info: '历史生成 · ' + r.w + ' × ' + r.h,
      w: r.w,
      h: r.h,
      border: 'none',
      resultId: null,
      styleId: r.id,
      cloud: !!r.cloud,
      archiveKey: resultKey(r),
      hostId: item.entry.hostId,
      archived: item.entry.archived === true,
    });
  }

  var textState = { model: 'minimax', aspect: '1:1', quality: '2K', busy: false, result: null };
  var TEXT_TEMPLATES = [
    { name: '东方印谱', prompt: '以【主体】为唯一主体，做一张3:4东方印谱海报：上方50%保留【主体】的真实照片感，下方50%是一页印谱，一方朱砂肖形印蜕与一条边款墨拓错落放置；宣纸白不少于70%，朱砂红、墨黑、纸白，刀痕古拙，纸白留白；【主色】只以极小铅笔注记出现；不要数码印章素材、满版印章、廉价国潮、3D。' },
    { name: '白石雕塑', prompt: '把【主体】转化为白色大理石/石膏雕塑，保留主体身份、数量、姿态与构图；纯黑虚空，背后一圈极细白色霓虹光环，冷银灰单色，石材凿痕、石粉与细裂纹；【场景】只作为远处云团或石台承托；不要活体毛发、森林、彩色、3D游戏或复杂背景。' },
    { name: '玄黄版画', prompt: '2D丝网印刷/木刻版画，不是3D场景：把【主体】压缩成深青色硬边剪影，保留身份、姿态与关键轮廓；深青、墨蓝、明黄、琥珀四色平涂；巨大黄色日轮，木刻龙形卷云与同心圆线；纸纹、套色偏移、旧印刷磨损；【情绪】通过构图与留白表达；不要写实风景、照片、体积云、3D、景深。' },
    { name: '产品海报', prompt: '为【产品】做一张高级产品海报：主体居中偏下，保留包装结构与品牌色【品牌色】；背景为【场景】，柔和侧光与真实接触阴影；留出大面积干净留白，画面角落一行极小说明；像真实棚拍与平面设计结合，不要塑料3D、过度高光、模板化大字、水印或无关文字。' },
  ];
  var seedreamState = { mode: 'text', model: 'doubao-seedream-5-5-261028', aspect: '1:1', quality: '2K', source: null, busy: false, result: null };

  function renderTextTemplates() {
    var box = $('#textTemplates');
    if (!box || box.dataset.ready) return;
    box.dataset.ready = '1';
    box.innerHTML = TEXT_TEMPLATES.map(function (t, i) {
      return '<button type="button" data-text-template="' + i + '">' + t.name + '</button>';
    }).join('');
  }

  function renderSeedreamPage() {
    if (!$('#seedreamPage')) return;
    var settings = state.settings || {};
    var keyState = $('#seedreamKeyHint');
    if (keyState) keyState.textContent = settings.hasSeedreamKey
      ? '火山方舟 · 已配置 · 尾号 ' + (settings.seedreamKeyHint || '****')
      : '火山方舟 · 未配置 Key';
    $$('#seedreamMode button').forEach(function (b) { b.classList.toggle('on', b.dataset.seedreamMode === seedreamState.mode); });
    $$('#seedreamModel button').forEach(function (b) { b.classList.toggle('on', b.dataset.seedreamModel === seedreamState.model); });
    $$('#seedreamAspect button').forEach(function (b) { b.classList.toggle('on', b.dataset.aspect === seedreamState.aspect); });
    $$('#seedreamQuality button').forEach(function (b) { b.classList.toggle('on', b.dataset.quality === seedreamState.quality); });
    $('#seedreamEditBox').hidden = seedreamState.mode !== 'edit';
    var size = textTargetSize(seedreamState.aspect, seedreamState.quality);
    var sModel = seedreamState.model === 'doubao-seedream-5-5-261028' ? 'Seedream 5.5' : seedreamState.model === 'doubao-seedream-4-5-251128' ? 'Seedream 4.5' : 'Seedream 4.0';
    var sPrice = seedreamState.model === 'doubao-seedream-5-5-261028' ? 0.28 : 0.20;
    $('#seedreamCost').textContent = sModel + ' · ' + size + ' · 约 ¥' + sPrice.toFixed(2) + '/张';
    var needsSource = seedreamState.mode === 'edit' && !(seedreamState.source && seedreamState.source.url);
    $('#seedreamGenerate').disabled = seedreamState.busy || !settings.hasSeedreamKey || !$('#seedreamPrompt').value.trim() || needsSource;
    $('#seedreamGenerate').textContent = seedreamState.busy ? '生成中…' : '生成';
    if (seedreamState.source && seedreamState.source.url) {
      $('#seedreamSource').src = seedreamState.source.url;
      $('#seedreamSource').hidden = false;
    } else {
      $('#seedreamSource').hidden = true;
    }
  }

  function setSeedreamResult(result) {
    seedreamState.result = result;
    $('#seedreamEmpty').hidden = true;
    $('#seedreamActions').hidden = false;
    $('#seedreamImage').src = result.url;
    $('#seedreamImage').hidden = false;
  }

  async function startSeedream() {
    if (seedreamState.busy) return;
    var settings = state.settings || {};
    if (!settings.hasSeedreamKey) { toast('先在设置里保存 Seedream API Key'); openSettings(); return; }
    var prompt = $('#seedreamPrompt').value.trim();
    if (!prompt) { toast('填写提示词'); $('#seedreamPrompt').focus(); return; }
    if (seedreamState.mode === 'edit' && !(seedreamState.source && seedreamState.source.url)) { toast('先选择一张图片'); return; }
    var size = textTargetSize(seedreamState.aspect, seedreamState.quality);
    seedreamState.busy = true;
    renderSeedreamPage();
    try {
      var body = { prompt: prompt, size: size, model: seedreamState.model };
      var path = '/seedream/text';
      if (seedreamState.mode === 'edit') {
        path = '/seedream/edit';
        body.imageDataUrl = seedreamState.source.url;
      }
      var res = await apiFetch(path, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok) throw cloudError(data.error || ('Seedream 请求失败 ' + res.status), data.code);
      setSeedreamResult(data);
      loadAllHistory(true);
      toast('Seedream 完成');
    } catch (err) {
      toast(err.message || 'Seedream 失败');
    } finally {
      seedreamState.busy = false;
      renderSeedreamPage();
    }
  }

  function viewSeedreamResult() {
    if (!seedreamState.result) return;
    openBig({
      key: resultKey({ id: 'seedream', cloud: true, url: seedreamState.result.url }),
      url: seedreamState.result.url,
      title: 'Seedream',
      meta: 'Seedream · ' + seedreamState.result.w + ' × ' + seedreamState.result.h,
      info: '',
      w: seedreamState.result.w,
      h: seedreamState.result.h,
      border: 'none', resultId: null, styleId: 'seedream', cloud: true,
    });
  }

  var textState = { aspect: '1:1', quality: '2K', busy: false, result: null };

  function textTargetSize(aspect, quality) {
    var target = { '1K': 1048576, '2K': 4194304, '4K': 16777216 }[quality] || 4194304;
    var parts = aspect.split(':');
    var ratio = Number(parts[0]) / Number(parts[1]);
    var width = Math.round(Math.sqrt(target * ratio));
    var height = Math.round(width / ratio);
    while (width * height > 16777216) { width -= 1; height = Math.round(width / ratio); }
    while (width * height < 921600) { width += 1; height = Math.round(width / ratio); }
    return width + 'x' + height;
  }

  function textModelName() {
    return textState.model === 'seedream' ? 'Seedream 5.5' : 'MiniMax H3';
  }

  function textPrice() {
    return textState.model === 'seedream' ? 0.28 : Number(cloudUnitPrice(textState.quality));
  }

  function renderTextPage() {
    if (!$('#textPage')) return;
    $$('#textModel button').forEach(function (b) { b.classList.toggle('on', b.dataset.model === textState.model); });
    $$('#textAspect button').forEach(function (b) { b.classList.toggle('on', b.dataset.aspect === textState.aspect); });
    $$('#textQuality button').forEach(function (b) { b.classList.toggle('on', b.dataset.quality === textState.quality); });
    var size = textTargetSize(textState.aspect, textState.quality);
    var seedream = textState.model === 'seedream';
    $('#textModeHint').textContent = seedream ? 'Seedream 5.5 · 不读取参考图' : 'Prompt 增强已关闭 · 不读取参考图';
    $('#textCost').textContent = textModelName() + ' · ' + size + ' · 约 ¥' + textPrice().toFixed(2);
    var needsKey = seedream ? !state.settings.hasSeedreamKey : !cloudReady();
    $('#textGenerate').disabled = textState.busy || needsKey || !$('#textPrompt').value.trim();
    $('#textGenerate').textContent = textState.busy ? '生成中…' : '生成';
  }

  function showTextResult(data) {
    textState.result = { url: data.url, w: data.w, h: data.h, model: textState.model };
    $('#textEmpty').hidden = true;
    $('#textActions').hidden = false;
    var img = $('#textImage');
    img.src = data.url;
    img.hidden = false;
    $('#textPage').classList.add('has-result');
    loadAllHistory(true);
    toast('文生图完成');
  }

  async function startTextJob() {
    if (textState.busy) return;
    var prompt = $('#textPrompt').value.trim();
    if (!prompt) { toast('填写提示词'); $('#textPrompt').focus(); return; }
    var seedream = textState.model === 'seedream';
    if (seedream ? !state.settings.hasSeedreamKey : !cloudReady()) {
      toast(seedream ? '先在设置里保存 Seedream Key' : '先在设置里保存 API Key');
      openSettings();
      return;
    }
    var size = textTargetSize(textState.aspect, textState.quality);
    textState.busy = true;
    renderTextPage();
    try {
      if (seedream) {
        var sr = await apiFetch('/seedream/text', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: prompt, size: size, model: 'doubao-seedream-5-5-261028' }),
        });
        var sd = await sr.json().catch(function () { return {}; });
        if (!sr.ok) throw cloudError(sd.error || ('Seedream 请求失败 ' + sr.status), sd.code);
        showTextResult(sd);
        return;
      }
      var res = await fetch(API + '/cloud/text-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt, size: size }),
      });
      var data = await res.json().catch(function () { return {}; });
      if (res.status === 402 && data.code === 'budget_exceeded') {
        var msg = '今日云端预算不足。\n预计 ¥' + Number(data.estimatedYuan || 0).toFixed(2) +
          ' · 已用 ¥' + Number(data.spentTodayYuan || 0).toFixed(2) +
          ' · 预算 ¥' + Number(data.budgetYuan || 0).toFixed(2) + '。\n\n仍要生成吗？';
        if (!window.confirm(msg)) throw cloudError('已取消文生图', 'budget_cancelled');
        res = await fetch(API + '/cloud/text-jobs', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: prompt, size: size, allowOverBudget: true }),
        });
        data = await res.json().catch(function () { return {}; });
      }
      if (!res.ok) throw cloudError(data.error || ('文生图请求失败 ' + res.status), data.code);
      var job = await waitCloudJob(data.id);
      if (job.status !== 'succeeded' || !job.output) {
        throw cloudError((job.error && job.error.message) || ('文生图作业 ' + job.status), (job.error && job.error.code) || job.status);
      }
      showTextResult(job.output);
    } catch (err) {
      toast(err.message || '文生图失败');
    } finally {
      textState.busy = false;
      renderTextPage();
    }
  }

  function viewTextResult() {
    if (!textState.result) return;
    var seedream = textState.result.model === 'seedream';
    openBig({
      key: resultKey({ id: seedream ? 'seedream' : 'h3-text', cloud: true, url: textState.result.url }),
      url: textState.result.url,
      title: seedream ? 'Seedream 5.5' : 'MiniMax H3',
      meta: seedream ? 'Seedream 5.5 · ' + textState.result.w + ' × ' + textState.result.h : '文生图 · ' + textState.result.w + ' × ' + textState.result.h + ' · Prompt 增强已关闭',
      info: '',
      w: textState.result.w,
      h: textState.result.h,
      border: 'none',
      resultId: null,
      styleId: seedream ? 'seedream' : 'h3-text',
      cloud: true,
    });
  }

  /* 固定工作流 */
  var flowNames = ['图片输入', '模型选择', '模型调参', '提示词构建', '分辨率', '生成', '二次编辑'];
  var flowModels = { minimax: 'MiniMax H3 Image', seedream: 'Seedream 5.5' };
  var flowHistoryKey = 'dsh-image-workbench/workflow-last/v1';
  var flowDraftKey = 'dsh-image-workbench/workflow-prompts/v1';
  var flowDrafts = readJsonStore(flowDraftKey, {});
  if (!flowDrafts || Array.isArray(flowDrafts) || typeof flowDrafts !== 'object') flowDrafts = {};
  var flow = {
    node: 3, provider: 'minimax', styleId: 'h3-illus', source: null, ratio: '1:1', quality: '2K',
    format: 'png', compression: 90, enhance: false, background: 'auto', watermark: false,
    editModel: 'same', editSize: 'inherit', editPrompt: '', record: null, pending: false, busy: false,
    error: '', requestId: readJsonStore(flowHistoryKey, ''), timer: null, revealId: '', zoom: 1, x: 0, y: 0,
    result: null, firstResult: null, editResult: null, artworkId: null, parentVersionId: null, jobKind: 'first',
  };
  var currentView = 'flow';
  var startupView = 'flow';
  var flowCaps = null;

  function flowStyles() {
    return STYLES.filter(function (style) { return style.renderer === 'model' && !style.hidden; });
  }
  function flowCapsFor(provider) { return flowCaps?.[provider] || null; }
  async function loadFlowCaps() {
    if (flowCaps) return;
    try {
      var res = await apiFetch('/v2/capabilities', { cache: 'no-store' });
      var data = await res.json().catch(function () { return {}; });
      if (res.ok && data.capabilities) flowCaps = data.capabilities;
    } catch {}
  }
  function flowStyle() { return styleById(flow.styleId) || flowStyles()[0]; }
  function flowPreview(style) { return API + '/style-preview/' + encodeURIComponent(style.id) + '.jpg'; }
  function flowDraftName() { return [flow.provider, flow.source ? 'edit' : 'text', flow.styleId].join(':'); }
  function flowPrompt() {
    var saved = flowDrafts[flowDraftName()];
    if (typeof saved === 'string') return saved;
    if (flow.provider === 'seedream') return flow.source ? seedreamImagePrompt(flow.styleId) : seedreamTextPrompt(flow.styleId);
    return flow.source ? h3ImagePrompt(flow.styleId) : h3TextPrompt(flow.styleId);
  }
  function flowEditModel() { return flow.editModel === 'same' ? flow.provider : flow.editModel; }
  function flowSize() {
    if (flow.customWidth && flow.customHeight) return flow.customWidth + 'x' + flow.customHeight;
    var ratio = flow.ratio === '原图' && flow.source ? flow.source.w + ':' + flow.source.h : flow.ratio;
    if (ratio === '原图') ratio = '1:1';
    var parts = ratio.split(':').map(Number);
    var numeric = parts[0] / parts[1];
    var limit = flow.provider === 'seedream' ? 16 : 3;
    numeric = Math.max(1 / limit, Math.min(limit, numeric));
    var area = { '1K': 1048576, '2K': 4194304, '4K': 16777216 }[flow.quality];
    var width = Math.round(Math.sqrt(area * numeric));
    var height = Math.round(width / numeric);
    while (Math.max(width / height, height / width) > limit) {
      if (width > height) width--; else height--;
    }
    return width + 'x' + height;
  }
  function flowNumberOptions() {
    return flowEditModel() === 'seedream' ? ['1024x1024', '1536x1536', '2048x2048'] : ['1024x1024', '2048x2048', '4096x4096'];
  }
  function flowOptions(id, title, items, current) {
    var options = items.map(function (entry) {
      var value = Array.isArray(entry) ? entry[0] : entry;
      var label = Array.isArray(entry) ? entry[1] : entry;
      return '<option value="' + escapeHTML(value) + '"' + (value === current ? ' selected' : '') + '>' + escapeHTML(label) + '</option>';
    }).join('');
    return '<label class="wf-field" for="' + id + '">' + title + '<select id="' + id + '">' + options + '</select></label>';
  }
  function flowImage(output, label) {
    var figure = document.createElement('figure');
    var caption = document.createElement('figcaption');
    caption.textContent = label;
    var media = document.createElement(output ? 'img' : 'div');
    if (output) { media.src = output.url; media.alt = label; }
    else { media.className = 'wf-placeholder'; media.textContent = label; }
    figure.append(media, caption);
    if (output) {
      var link = document.createElement('a');
      link.href = output.url;
      link.download = output.url.split('/').pop();
      link.textContent = '保存';
      caption.append(' · ', link);
    }
    return figure;
  }
  function flowResultUrl(result) {
    if (!result?.artworkId || !result?.versionId) return '';
    return API + '/v2/artworks/' + encodeURIComponent(result.artworkId) + '/versions/' + encodeURIComponent(result.versionId) + '/file';
  }
  function flowStatus() {
    var status = flow.record && flow.record.status;
    return flow.error || ({
      queued: '排队中…', submitting: '提交任务…', generating: '生成中…', fetching_asset: '取回图片…',
      saving_original: '保存原图…', splitting_layers: '拆分图层…', saving_layers: '保存图层…',
      succeeded: '已完成', partial_success: '原图完成，图层部分失败', failed: '生成失败',
      unknown: '请求状态待确认，请查看队列', cancelled: '已取消',
    }[status] || (flow.result ? '已完成' : ''));
  }
  function flowSync() {
    var record = flow.record;
    var status = record && record.status;
    var values = [
      flow.source ? flow.source.name : '', flow.modelChosen ? flowModels[flow.provider] : '', flow.paramsChosen ? flow.format.toUpperCase() : '',
      flow.styleChosen ? flowStyle().name : '', flow.sizeChosen ? flowSize().replace('x', ' × ') : '',
      flow.result ? '已出片' : ['queued','submitting','generating','fetching_asset','saving_original'].includes(status) ? '生成中…' : '待生成',
      flow.editResult ? '编辑完成' : ['queued','submitting','generating'].includes(status) && flow.jobKind === 'edit' ? '编辑中…' : flow.result ? '可编辑' : flowModels[flowEditModel()],
    ];
    $$('[data-wf-node]').forEach(function (button, i) {
      button.setAttribute('aria-pressed', String(flow.node === i));
      button.querySelector('small').textContent = values[i];
    });
    $('[data-wf-action=remove]').hidden = !flow.source;
    var run = $('#workflowRun');
    run.disabled = flow.busy || flow.pending;
    run.textContent = flow.busy ? '执行中…' : flow.pending ? '提交中…' : '执行工作流';
    var statusLabel = $('#wfStatus');
    statusLabel.textContent = flowStatus();
    requestAnimationFrame(flowEdges);
  }
  function flowEdges() {
    if (disposed || currentView !== 'flow') return;
    var graph = $('#wfNodes');
    var origin = graph.getBoundingClientRect();
    var boxes = $$('[data-wf-node]').map(function (b) {
      var r = b.getBoundingClientRect();
      function x(value) { return (value - origin.left) / flow.zoom; }
      function y(value) { return (value - origin.top) / flow.zoom; }
      return { left: x(r.left), right: x(r.right), top: y(r.top), bottom: y(r.bottom),
        x: x(r.left + r.width / 2), y: y(r.top + r.height / 2) };
    });
    var existing = $$('#wfEdges g path');
    boxes.slice(0, -1).forEach(function (a, i) {
      var b = boxes[i + 1];
      var path = existing[i];
      var d;
      if (Math.abs(b.y - a.y) < 4) {
        var right = b.x > a.x;
        d = 'M' + (right ? a.right : a.left) + ',' + a.y + ' H' + (right ? b.left - 3 : b.right + 3);
      } else {
        var mid = (a.bottom + b.top) / 2;
        d = 'M' + a.x + ',' + a.bottom + ' V' + mid + ' H' + b.x + ' V' + (b.top - 3);
      }
      path.setAttribute('d', d);
      path.classList.toggle('hot', i + 1 === flow.node);
      path.classList.toggle('handoff', i === 5 && flow.record?.status === 'edit-running');
    });
  }
  async function exportPolaroid(result) {
    if (!result?.url) return;
    var response = await fetch(result.url);
    if (!response.ok) throw new Error('无法读取结果图');
    var bitmap = await createImageBitmap(await response.blob());
    var pad = Math.round(Math.max(bitmap.width, bitmap.height) * 0.065);
    var caption = Math.round(pad * 0.72);
    var canvas = document.createElement('canvas');
    canvas.width = bitmap.width + pad * 2;
    canvas.height = bitmap.height + pad + caption + pad;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f6efe1'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, pad, pad);
    ctx.fillStyle = '#8c8170'; ctx.font = Math.max(12, Math.round(pad * 0.32)) + 'px ui-monospace,monospace';
    ctx.fillText('IMAGE WORKBENCH · ' + new Date().toISOString().slice(0, 10), pad, canvas.height - pad * 0.5);
    var blob = await new Promise(function (resolve) { canvas.toBlob(resolve, 'image/jpeg', 0.94); });
    bitmap.close?.();
    if (!blob) throw new Error('相纸导出失败');
    var url = URL.createObjectURL(blob);
    triggerDownload(url, 'polaroid-' + Date.now() + '.jpg');
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  function flowOpen(node, focus) {
    flow.node = node;
    var inspect = $('.wf-inspect');
    inspect.dataset.kind = node === 5 ? 'output' : [1,2,4].includes(node) ? 'option' : 'editor';
    if (inspect.dataset.kind === 'option') {
      var anchor = $('[data-wf-node="' + node + '"]').getBoundingClientRect();
      var bounds = $('#flowPage').getBoundingClientRect();
      inspect.style.setProperty('--wf-popup-x', Math.max(8, Math.min(anchor.left-bounds.left, bounds.width-234))+'px');
      inspect.style.setProperty('--wf-popup-y', (anchor.bottom-bounds.top+6)+'px');
    }
    $('#wfTitle').textContent = node === 3 ? '首轮提示词' : node === 6 ? '编辑指令' : flowNames[node];
    var area = $('#wfBody');
    var panels = $$('[data-wf-node]');
    area.setAttribute('aria-labelledby', 'wfTitle');
    if (node === 0) {
      area.innerHTML = '';
    } else if (node === 1) {
      area.innerHTML = flowOptions('wfModel', '首轮模型', Object.entries(flowModels), flow.provider);
    } else if (node === 2) {
      var caps = flowCapsFor(flow.provider);
      var formats = caps?.formats || (flow.provider === 'minimax' ? ['jpeg', 'png', 'webp'] : ['jpeg', 'png']);
      area.innerHTML = flowOptions('wfFormat', '图像格式', formats, flow.format);
      if (flow.provider === 'minimax') {
        if (flow.format !== 'png') area.insertAdjacentHTML('beforeend', '<label class="wf-field">压缩质量<input id="wfCompression" type="number" min="0" max="100" value="' + flow.compression + '"></label>');
        if (!flow.source) area.insertAdjacentHTML('beforeend', flowOptions('wfEnhance', '提示词优化', [['true','开启'],['false','关闭']], String(flow.enhance)));
        else area.insertAdjacentHTML('beforeend', '<p class="wf-sub">提示词优化 · 服务端自动优化</p>');
      } else {
        area.insertAdjacentHTML('beforeend', flowOptions('wfBackground', '背景', [['auto','自动'],['opaque','不透明'],['transparent','透明']], flow.background)
          + flowOptions('wfWatermark', '水印', [['true','开启'],['false','关闭']], String(flow.watermark)) + '<p class="wf-sub">提示词优化 · 标准模式</p>');
      }
    } else if (node === 3) {
      var style = flowStyle();
      area.innerHTML = '<div class="wf-prompt-grid"><div class="wf-row">'
        + (flow.styleChosen ? '<span class="wf-style-chip"><img src="' + flowPreview(style) + '" alt="">' + escapeHTML(style.name) + '</span>' : '<span></span>')
        + '<div><button class="wf-quiet" data-wf-action="pack" aria-haspopup="dialog">选择风格包</button><button class="wf-quiet" data-wf-action="reset">恢复默认</button></div></div>'
        + '<label class="wf-field wf-prompt-field"><textarea id="wfPrompt" aria-label="首轮提示词" rows="6" maxlength="32000"></textarea></label></div>';
      $('#wfPrompt').value = flowPrompt();
    } else if (node === 4) {
      var caps = flowCapsFor(flow.provider);
      var ratios = caps?.aspectRatios || ['1:1', '4:5', '3:4', '16:9', '9:16'];
      if (flow.source) ratios = ['原图'].concat(ratios);
      var tiers = caps?.tiers || (flow.provider === 'seedream' ? ['1K', '2K'] : ['1K', '2K', '4K']);
      area.innerHTML = flowOptions('wfRatio', '画面比例', ratios, flow.ratio)
        + flowOptions('wfQuality', '分辨率', tiers, flow.quality)
        + '<div class="wf-row"><label class="wf-field">自定义宽度<input id="wfWidth" type="number" min="128" max="8192" value="' + (flow.customWidth || '') + '"></label><label class="wf-field">自定义高度<input id="wfHeight" type="number" min="128" max="8192" value="' + (flow.customHeight || '') + '"></label></div>'
        + '<p class="wf-sub">目标尺寸 ' + flowSize().replace('x', ' × ') + '</p>';
    } else if (node === 5) {
      area.innerHTML = '<p class="wf-sub">' + escapeHTML(flowModels[flow.provider] + ' · ' + flowStyle().name + ' · ' + flowSize()) + '</p>'
        + '<button class="wf-quiet wf-return" data-wf-action="back">返回画布</button><div class="wf-hole" aria-hidden="true"></div><div class="wf-print"><div class="wf-exit"></div></div>';
      if (flow.result) {
        var photo = flowImage(flow.result, '首轮结果');
        photo.className = 'wf-photo';
        var ribbon = document.createElement('span');
        ribbon.className = 'wf-ribbon'; ribbon.setAttribute('aria-hidden', 'true');
        photo.append(ribbon);
        $('.wf-exit').append(photo);
        area.insertAdjacentHTML('beforeend', '<button class="wf-quiet" data-wf-action="polaroid">下载相纸版</button>');
        if (flow.result.layerManifest) area.insertAdjacentHTML('beforeend', '<button class="wf-quiet" data-wf-action="layers">下载分层 ZIP</button>');
        if (flow.revealId === flow.result.versionId) {
          flow.revealId = '';
          photo.classList.add('play'); $('.wf-hole').classList.add('play');
        }
      }
    } else {
      area.innerHTML = flowOptions('wfEditModel', '编辑模型', [['same','沿用首轮模型']].concat(Object.entries(flowModels)), flow.editModel)
        + flowOptions('wfEditSize', '编辑输出尺寸', [['inherit','沿用首轮尺寸']].concat(flowNumberOptions()), flow.editSize)
        + '<label class="wf-field">编辑指令<textarea id="wfEditPrompt" rows="3" maxlength="32000" placeholder="例如：保留主体和构图，把背景改成暖灰色"></textarea></label>'
        + '<div class="wf-compare"></div>'
        + '<div class="wf-row"><button class="wf-quiet" data-wf-action="edit">生成编辑版</button><span class="wf-sub">' + (flow.result ? '基于当前结果生成新分支' : '先完成首轮生成') + '</span></div>';
      $('#wfEditPrompt').value = flow.editPrompt;
      $('.wf-compare').append(flowImage(flow.firstResult, '首轮结果 · 自动作为源图'), flowImage(flow.editResult, '二次编辑结果'));
      if (flow.editResult) $('.wf-compare figure:last-child img').classList.add('wf-final');
      if (flow.record?.status === 'failed' && flow.jobKind === 'edit') area.insertAdjacentHTML('beforeend', '<button class="wf-quiet" data-wf-action="retry">重试二次编辑</button>');
    }
    panels.forEach(function (button) { button.setAttribute('aria-controls', 'wfBody'); });
    flowSync();
    if ([1,2,4].includes(node)) area.querySelector('select')?.focus();
    else if (focus) $('#wfTitle').focus({ preventScroll: true });
  }
  function renderFlow() { flowOpen(flow.node); }
  function flowPose() {
    $('#wfNodes').style.transform = 'translate(' + flow.x + 'px,' + flow.y + 'px) scale(' + flow.zoom + ')';
    $('#wfFit').textContent = Math.round(flow.zoom * 100) + '%';
  }
  async function flowApi(path, body) {
    var init = body === undefined ? { cache: 'no-store' } : {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    };
    var res = await apiFetch(path, init);
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok) throw Object.assign(new Error(data.error || '工作流请求失败'), { status: res.status });
    return data;
  }
  function flowResume() {
    clearTimeout(flow.timer);
    if (disposed || !flow.requestId) return;
    flowPoll(flow.requestId);
  }
  async function flowPoll(id) {
    try {
      var job = await flowApi('/v2/jobs/' + encodeURIComponent(id));
      if (disposed || flow.requestId !== id) return;
      await flowApply(job);
    } catch (error) {
      if (disposed || flow.requestId !== id) return;
      if (error.status === 404) {
        flow.requestId = '';
        flow.busy = false;
        flow.error = '未找到已接受的任务，可重新执行';
        writeJsonStore(flowHistoryKey, '');
      } else {
        flow.error = '暂时无法读取状态，正在重连…';
        flow.timer = setTimeout(function () { flowPoll(id); }, 2500);
      }
      flowSync();
    }
  }
  function flowSetResult(job) {
    if (!job?.result?.artworkId || !job.result.versionId) return null;
    var result = {
      url: flowResultUrl(job.result), w: job.result.width || 0, h: job.result.height || 0,
      artworkId: job.result.artworkId, versionId: job.result.versionId, file: job.result.file, sha256: job.result.sha256,
      layerManifest: job.result.layerManifest || null,
    };
    if (flow.jobKind === 'edit' && flow.firstResult) flow.editResult = result;
    else { flow.firstResult = result; flow.artworkId = result.artworkId; }
    flow.result = result;
    flow.parentVersionId = result.versionId;
    return result;
  }
  async function flowApply(job) {
    var prior = flow.record;
    var previousStatus = prior?.status;
    flow.record = job;
    var status = job?.status || '';
    var active = ['queued','submitting','generating','fetching_asset','saving_original','splitting_layers','saving_layers'].includes(status);
    flow.busy = active;
    flow.error = status === 'failed' || status === 'unknown' ? (job.error?.message || flowStatus()) : '';
    var result = flowSetResult(job);
    if (result && (!prior?.result || prior.result.versionId !== job.result.versionId)) {
      flow.revealId = result.versionId;
      if (currentView === 'flow' && flow.node === 5) {
        try { var img = new Image(); img.src = result.url; await img.decode(); } catch {}
        if (disposed || flow.record?.id !== job.id) return;
        flowOpen(5);
      }
    }
    if (!active && flow.requestId === job.id) {
      flow.requestId = '';
      writeJsonStore(flowHistoryKey, '');
    }
    flowSync();
    if (active) flow.timer = setTimeout(function () { flowPoll(job.id); }, 600);
    else if (previousStatus !== status) { loadAllHistory(true); loadQueue({ silent: true }); }
  }
  function flowSourceSnapshot() {
    return flow.source ? { sourceAssetId: null } : {};
  }
  async function flowSubmit() {
    if (flow.pending || flow.busy) return;
    if (!flowPrompt().trim()) { flowOpen(3); $('#wfPrompt').focus(); return; }
    if (state.settings?.privacyConfirm !== false && !window.confirm('执行工作流会调用一次云端模型。提供的原图将交给供应商，成功的调用可能计费。继续？')) return;
    flow.pending = true;
    flow.error = '';
    flowSync();
    var id = crypto.randomUUID ? crypto.randomUUID() : 'wf-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    try {
      var sourceAssetId = null;
      if (flow.source) {
        sourceAssetId = (await flowApi('/assets', { dataUrl: flow.source.url, name: flow.source.name, w: flow.source.w, h: flow.source.h })).id;
      }
      var sizeText = flowSize();
      var sizeParts = sizeText.split('x').map(Number);
      var snapshot = {
        provider: flow.provider,
        operation: flow.source ? 'image_to_image' : 'text_to_image',
        prompt: flowPrompt(),
        styleId: flow.styleId,
        ratio: flow.ratio,
        tier: flow.quality,
        format: flow.format,
        compression: flow.format === 'png' ? null : flow.compression,
        width: sizeParts[0], height: sizeParts[1], size: sizeText,
        sourceAssetId, enhance: flow.enhance, background: flow.background, watermark: flow.watermark,
        title: flowPrompt().slice(0, 30),
      };
      var job = await flowApi('/v2/jobs', { snapshot, idempotencyKey: id });
      if (disposed) return;
      flow.jobKind = 'first';
      flow.firstResult = null; flow.editResult = null; flow.result = null; flow.artworkId = null; flow.parentVersionId = null;
      flow.requestId = job.id;
      writeJsonStore(flowHistoryKey, job.id);
      flow.record = job;
      flowOpen(5);
      await flowApply(job);
    } catch (error) {
      if (!disposed) flow.error = error.message;
    } finally {
      if (!disposed) { flow.pending = false; flowSync(); }
    }
  }
  async function flowEditSubmit() {
    if (flow.pending || flow.busy || !flow.result) return;
    if (!flow.editPrompt.trim()) { flow.error = '请填写二次编辑指令'; flowOpen(6); $('#wfEditPrompt').focus(); return; }
    if (state.settings?.privacyConfirm !== false && !window.confirm('生成编辑版会再调用一次云端模型，可能计费。继续？')) return;
    flow.pending = true; flow.error = ''; flowSync();
    var id = crypto.randomUUID ? crypto.randomUUID() : 'edit-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    try {
      var fetched = await fetch(flow.result.url);
      if (!fetched.ok) throw new Error('无法读取当前结果，不能编辑');
      var dataUrl = await blobToDataURL(await fetched.blob());
      var asset = await flowApi('/assets', { dataUrl, name: 'edit-source.png', w: flow.result.w, h: flow.result.h });
      var size = flow.editSize === 'inherit' ? flow.result.w + 'x' + flow.result.h : flow.editSize;
      var parts = size.split('x').map(Number);
      var snapshot = {
        provider: flowEditModel(), operation: 'edit', prompt: flow.editPrompt, styleId: flow.styleId,
        ratio: '1:1', tier: flow.quality, format: 'png', compression: null,
        width: parts[0], height: parts[1], size, sourceAssetId: asset.id,
        background: 'auto', watermark: flow.watermark, enhance: false,
        title: flow.editPrompt.slice(0, 30),
      };
      var job = await flowApi('/v2/jobs', { snapshot, artworkId: flow.result.artworkId, parentVersionId: flow.result.versionId, idempotencyKey: id });
      if (disposed) return;
      flow.jobKind = 'edit';
      flow.requestId = job.id;
      writeJsonStore(flowHistoryKey, job.id);
      flow.record = job;
      flowOpen(5);
      await flowApply(job);
    } catch (error) {
      if (!disposed) flow.error = error.message;
    } finally {
      if (!disposed) { flow.pending = false; flowSync(); }
    }
  }
  async function flowRetry() {
    if (flow.busy || flow.pending || !flow.record || flow.record.status !== 'failed') return;
    if (!window.confirm('重试会再次调用模型，可能计费。继续？')) return;
    flow.pending = true; flowSync();
    try {
      var job = await flowApi('/v2/jobs/' + encodeURIComponent(flow.record.id) + '/retry', {});
      flow.requestId = job.id;
      writeJsonStore(flowHistoryKey, job.id);
      flow.record = job;
      await flowApply(job);
    } catch (error) { if (!disposed) flow.error = error.message; }
    finally { if (!disposed) { flow.pending = false; flowSync(); } }
  }

  function bindWorkflow() {
    var deck = $('#wfDeck'), graph = $('#wfGraph');
    var cards = $('.wf-deck-cards', deck);
    var dragging = false, drawing = false, pan, fileVersion = 0, pendingSource = null, dragDepth = 0;
    async function requestSource(file) {
      if (!file) return;
      var version = ++fileVersion;
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { toast('只支持 JPEG / PNG / WebP'); return; }
      if (file.size > 20 * 1024 * 1024) { toast('图片不能超过 20 MB'); return; }
      try {
        var head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
        var magic = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff ? 'jpeg'
          : head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47 ? 'png'
          : head[0] === 0x52 && head[1] === 0x49 && head[8] === 0x57 && head[9] === 0x45 ? 'webp' : '';
        if (!magic) { toast('文件内容不是有效图片'); return; }
        var url = await blobToDataURL(file);
        var image = new Image(); image.src = url; await image.decode();
        if (disposed || version !== fileVersion) return;
        var next = { url: url, name: file.name, w: image.naturalWidth, h: image.naturalHeight };
        if (flow.source) {
          pendingSource = next;
          $('#wfOldImg').src = flow.source.url;
          $('#wfNewImg').src = next.url;
          var dialog = $('#wfReplace');
          dialog.showModal();
          $('#wfReplaceCancel').focus();
        } else {
          flow.source = next; flow.ratio = '原图'; flowSync();
        }
      } catch { if (!disposed) toast('图片无法读取'); }
    }
    function closeReplace() { pendingSource = null; $('#wfReplace').close(); }
    function fitDeck() {
      var box = root.getBoundingClientRect();
      deck.style.left = Math.max(0, box.left) + 'px';
      deck.style.top = Math.max(0, box.top) + 'px';
      deck.style.width = Math.min(box.width, innerWidth - Math.max(0, box.left)) + 'px';
      deck.style.height = Math.min(box.height, innerHeight - Math.max(0, box.top)) + 'px';
    }
    function deckPrompt(styleId) {
      if (flow.provider === 'seedream') return flow.source ? seedreamImagePrompt(styleId) : seedreamTextPrompt(styleId);
      return flow.source ? h3ImagePrompt(styleId) : h3TextPrompt(styleId);
    }
    function showDeck() {
      cards.replaceChildren();
      var rows = [document.createElement('div'), document.createElement('div')];
      rows.forEach(function (row, i) { row.className = 'wf-deck-row'; row.dataset.row = i; cards.append(row); });
      flowStyles().forEach(function (style, i) {
        var card = document.createElement('article');
        card.className = 'wf-card'; card.dataset.wfStyle = style.id;
        card.setAttribute('aria-pressed', String(style.id === flow.styleId));
        var inner = document.createElement('div'); inner.className = 'wf-card-inner';
        var front = document.createElement('button'); front.type = 'button'; front.className = 'wf-card-face wf-card-front';
        front.setAttribute('aria-label', '翻开 ' + style.name);
        var art = document.createElement('img'); art.src = flowPreview(style); art.alt = ''; art.draggable = false; art.loading = 'lazy';
        var name = document.createElement('b'); name.textContent = style.name;
        front.append(art, name);
        var back = document.createElement('div'); back.className = 'wf-card-face wf-card-back';
        var textarea = document.createElement('textarea'); textarea.rows = 5; textarea.value = flowDrafts[style.id + ':' + flowDraftName()] || deckPrompt(style.id); textarea.setAttribute('aria-label', style.name + ' 提示词');
        var actions = document.createElement('div'); actions.className = 'wf-card-actions';
        var reset = document.createElement('button'); reset.type = 'button'; reset.textContent = '恢复'; reset.dataset.wfCardReset = '1';
        var cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = '返回'; cancel.dataset.wfCardCancel = '1';
        var use = document.createElement('button'); use.type = 'button'; use.textContent = '确认'; use.dataset.wfCardUse = style.id;
        actions.append(reset, cancel, use); back.append(textarea, actions); inner.append(front, back); card.append(inner);
        rows[i % 2].append(card);
      });
      fitDeck();
      $('.wf-workspace').inert = true;
      deck.show();
      $('#wfDeckClose').focus();
    }
    deck.addEventListener('pointermove', function (e) {
      var card = e.target.closest('[data-wf-style]');
      if (!card || card.classList.contains('flipped') || e.pointerType === 'touch') return;
      card.classList.add('hot');
    });
    deck.addEventListener('pointerleave', function () { cards.querySelectorAll('.hot').forEach(card => card.classList.remove('hot')); });
    deck.addEventListener('click', function (e) {
      var close = e.target.closest('#wfDeckClose');
      if (close) { deck.close(); $('.wf-workspace').inert = false; $('[data-wf-node="3"]').focus(); return; }
      var front = e.target.closest('.wf-card-front');
      if (front) {
        var card = front.closest('[data-wf-style]');
        cards.querySelectorAll('.flipped').forEach(other => { if (other !== card) other.classList.remove('flipped'); });
        card.classList.add('flipped');
        setTimeout(function () { var area = card.querySelector('textarea'); if (area) { area.focus(); area.setSelectionRange(0, 0); area.scrollTop = 0; } }, 480);
        return;
      }
      var cancel = e.target.closest('[data-wf-card-cancel]');
      if (cancel) { cancel.closest('[data-wf-style]').classList.remove('flipped'); return; }
      var reset = e.target.closest('[data-wf-card-reset]');
      if (reset) { var card = reset.closest('[data-wf-style]'); card.querySelector('textarea').value = deckPrompt(card.dataset.wfStyle); return; }
      var use = e.target.closest('[data-wf-card-use]');
      if (use) {
        var chosen = use.closest('[data-wf-style]');
        flow.styleId = chosen.dataset.wfStyle;
        flow.styleChosen = true;
        flowDrafts[flow.styleId + ':' + flowDraftName()] = chosen.querySelector('textarea').value;
        writeJsonStore(flowDraftKey, flowDrafts);
        $('.wf-workspace').inert = false;
        deck.close();
        flowOpen(3);
        $('#wfPrompt').focus();
      }
    });
    deck.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { deck.close(); $('.wf-workspace').inert = false; $('[data-wf-node="3"]').focus(); }
    });
    deck.addEventListener('close', function () { $('.wf-workspace').inert = false; });
    $('#workflowRun').addEventListener('click', flowSubmit);
    $('#flowPage').addEventListener('click', function (e) {
      var node = e.target.closest('[data-wf-node]');
      if (node) {
        var index = Number(node.dataset.wfNode);
        if (index === 0) { $('#wfFile').click(); return; }
        flowOpen(index, e.detail === 0);
        if (index === 3) showDeck();
        return;
      }
      var button = e.target.closest('[data-wf-action]');
      if (!button) return;
      switch (button.dataset.wfAction) {
        case 'pack': showDeck(); break;
        case 'back': flowOpen(3); break;
        case 'reset': delete flowDrafts[flowDraftName()]; writeJsonStore(flowDraftKey, flowDrafts); $('#wfPrompt').value = flowPrompt(); break;
        case 'remove': fileVersion++; flow.source = null; flow.ratio = '1:1'; flowSync(); break;
        case 'retry': flowRetry(); break;
        case 'edit': flowEditSubmit(); break;
        case 'polaroid': exportPolaroid(flow.result).catch(function (error) { toast(error.message); }); break;
        case 'layers': if (flow.result) window.open(API + '/v2/artworks/' + encodeURIComponent(flow.result.artworkId) + '/versions/' + encodeURIComponent(flow.result.versionId) + '/layers.zip', '_blank', 'noopener'); break;
        case 'in': flow.zoom = Math.min(2, flow.zoom + .15); flowPose(); break;
        case 'out': flow.zoom = Math.max(.55, flow.zoom - .15); flowPose(); break;
        case 'fit': flow.zoom = 1; flow.x = flow.y = 0; flowPose(); break;
      }
    });
    $('#flowPage').addEventListener('input', function (e) {
      if (e.target.id === 'wfPrompt') { flowDrafts[flowDraftName()] = e.target.value; writeJsonStore(flowDraftKey, flowDrafts); }
      if (e.target.id === 'wfEditPrompt') flow.editPrompt = e.target.value;
    });
    $('#flowPage').addEventListener('change', async function (e) {
      var value = e.target.value;
      switch (e.target.id) {
        case 'wfFile': {
          await requestSource(e.target.files[0]);
          e.target.value = '';
          return;
        }
        case 'wfModel':
          flow.provider = value; flow.modelChosen = true; flow.paramsChosen = false;
          if (value === 'seedream') { if (flow.format === 'webp') flow.format = 'jpeg'; if (flow.quality === '4K') flow.quality = '2K'; }
          if (value === 'minimax' && flow.quality === '1.5K') flow.quality = '2K';
          if (flow.editModel === 'same') flow.editSize = 'inherit';
          break;
        case 'wfFormat': flow.paramsChosen = true; flow.format = value; if (value !== 'png' && flow.background === 'transparent') flow.background = 'auto'; flowOpen(2); return;
        case 'wfBackground': flow.background = value; if (value === 'transparent') flow.format = 'png'; flowOpen(2); return;
        case 'wfCompression': flow.compression = Math.max(0, Math.min(100, Math.round(Number(value)))); e.target.value = flow.compression; break;
        case 'wfEnhance': flow.enhance = value === 'true'; break;
        case 'wfWatermark': flow.watermark = value === 'true'; break;
        case 'wfWidth': flow.customWidth = Number(value) || null; flowOpen(4); $('#wfWidth').focus(); return;
        case 'wfHeight': flow.customHeight = Number(value) || null; flowOpen(4); $('#wfHeight').focus(); return;
        case 'wfRatio': flow.sizeChosen = true; flow.customWidth = flow.customHeight = null; flow.ratio = value; flowOpen(4); $('#wfRatio').focus(); return;
        case 'wfQuality': flow.sizeChosen = true; flow.customWidth = flow.customHeight = null; flow.quality = value; flowOpen(4); $('#wfQuality').focus(); return;
        case 'wfEditModel': flow.editModel = value; flow.editSize = 'inherit'; flowOpen(6); $('#wfEditModel').focus(); return;
        case 'wfEditSize': flow.editSize = value; break;
      }
      flowSync();
    });
    var page = $('#flowPage'), drop = $('#wfDrop');
    page.addEventListener('dragenter', function (e) {
      if (!e.dataTransfer?.types?.includes('Files')) return;
      e.preventDefault(); dragDepth += 1; drop.classList.add('on'); drop.setAttribute('aria-hidden', 'false');
    });
    page.addEventListener('dragover', function (e) { if (e.dataTransfer?.types?.includes('Files')) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } });
    page.addEventListener('dragleave', function (e) {
      if (!e.dataTransfer?.types?.includes('Files')) return;
      dragDepth = Math.max(0, dragDepth - 1);
      if (!dragDepth) { drop.classList.remove('on'); drop.setAttribute('aria-hidden', 'true'); }
    });
    page.addEventListener('drop', function (e) {
      if (!e.dataTransfer?.types?.includes('Files')) return;
      e.preventDefault(); dragDepth = 0; drop.classList.remove('on'); drop.setAttribute('aria-hidden', 'true');
      requestSource(e.dataTransfer.files[0]);
    });
    $('#wfReplaceCancel').addEventListener('click', closeReplace);
    $('#wfReplace').addEventListener('cancel', function (e) { e.preventDefault(); closeReplace(); });
    $('#wfReplaceOk').addEventListener('click', function () {
      if (pendingSource) { flow.source = pendingSource; flow.ratio = '原图'; }
      closeReplace(); flowSync();
    });
    graph.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button') || e.button !== 0) return;
      pan = { x: e.clientX - flow.x, y: e.clientY - flow.y };
      graph.setPointerCapture(e.pointerId);
    });
    graph.addEventListener('pointermove', function (e) {
      if (!pan) return;
      flow.x = e.clientX - pan.x; flow.y = e.clientY - pan.y; flowPose();
    });
    graph.addEventListener('lostpointercapture', function () { pan = null; });
    var motion = $('#wfMotion');
    motion.checked = readJsonStore('dsh-image-workbench/reduce-motion/v1', false);
    function applyMotion() { $('#flowPage').dataset.motion = motion.checked ? 'off' : 'on'; }
    motion.addEventListener('change', function () { writeJsonStore('dsh-image-workbench/reduce-motion/v1', motion.checked); applyMotion(); });
    applyMotion();
    var light = $('.wf-scene');
    var ambient = new IntersectionObserver(function (entries) { light.toggleAttribute('data-paused', !entries[0].isIntersecting || document.hidden); });
    ambient.observe(graph);
    listen(document, 'visibilitychange', function () { light.toggleAttribute('data-paused', document.hidden || currentView !== 'flow'); });
    cleanups.push(function () { ambient.disconnect(); });
    var observer = new ResizeObserver(function () { flowEdges(); if (deck.open) fitDeck(); });
    observer.observe($('#wfNodes'));
    observer.observe(root);
    listen(window, 'resize', function () { if (deck.open) fitDeck(); });
    cleanups.push(function () { observer.disconnect(); clearTimeout(flow.timer); if (deck.open) deck.close(); });
  }

  async function flowLoadHistory() {
    try {
      var data = await flowApi('/workflows');
      if (disposed || currentView !== 'recent') return;
      var history = $('#wfHistory');
      history.replaceChildren();
      if (!data.workflows?.length) return;
      var title = document.createElement('h3');
      title.textContent = '工作流记录';
      history.append(title);
      data.workflows.forEach(function (row) {
        var button = document.createElement('button');
        button.className = 'ghost-btn';
        button.textContent = (styleById(row.styleId)?.name || row.styleId) + ' · ' + new Date(row.updatedAt).toLocaleString()
          + (row.editOutput ? ' · 两轮完成' : ' · 首轮结果');
        button.addEventListener('click', async function () {
          if (flow.busy || flow.pending) { toast('当前工作流仍在执行，请稍后查看历史'); return; }
          try {
            var record = await flowApi('/workflows/' + encodeURIComponent(row.id));
            if (disposed || flow.busy || flow.pending) return;
            flow.requestId = record.id;
            flow.record = record;
            flow.error = record.error || '';
            flow.busy = ['first-running','edit-running'].includes(record.status);
            flow.editModel = record.edit.provider;
            flow.editSize = record.edit.size;
            flow.editPrompt = record.edit.prompt;
            writeJsonStore(flowHistoryKey, record.id);
            flow.node = 6;
            switchView('flow');
            if (flow.busy) flowResume();
          } catch (error) { if (!disposed) toast(error.message); }
        });
        history.append(button);
      });
    } catch { if (!disposed) $('#wfHistory').replaceChildren(); }
  }
  async function flowLoadV2History() {
    try {
      var data = await flowApi('/v2/artworks?limit=12');
      if (disposed || currentView !== 'recent') return;
      var history = $('#wfHistory');
      var existing = history.querySelector('[data-v2-history]');
      if (existing) existing.remove();
      var section = document.createElement('div');
      section.dataset.v2History = '1';
      var title = document.createElement('h3');
      title.textContent = '作品库 · 相纸堆';
      section.append(title);
      (data.artworks || []).forEach(function (art) {
        var latest = art.versions?.[art.versions.length - 1];
        if (!latest) return;
        var item = document.createElement('article'); item.className = 'wf-history-item';
        var thumbUrl = API + '/v2/artworks/' + encodeURIComponent(art.id) + '/versions/' + encodeURIComponent(latest.id) + '/file';
        var thumb = document.createElement('img'); thumb.className = 'wf-history-thumb'; thumb.src = thumbUrl; thumb.alt = ''; thumb.loading = 'lazy';
        var button = document.createElement('button'); button.className = 'ghost-btn';
        button.textContent = (art.title || '未命名') + ' · ' + (art.versions.length) + ' 版 · ' + new Date(latest.created_at).toLocaleDateString();
        var chips = document.createElement('div'); chips.className = 'wf-history-versions';
        (art.versions || []).forEach(function (version, index) {
          var chip = document.createElement('button'); chip.className = 'wf-history-chip'; chip.textContent = 'v' + String(index + 1).padStart(3, '0');
          chip.addEventListener('click', function () {
            var result = { artworkId: art.id, versionId: version.id, url: API + '/v2/artworks/' + encodeURIComponent(art.id) + '/versions/' + encodeURIComponent(version.id) + '/file', w: version.width, h: version.height };
            flow.artworkId = art.id; flow.parentVersionId = version.id; flow.result = result; flow.firstResult = result;
            flow.editResult = null; flow.error = ''; flow.busy = false; flow.pending = false; flow.node = 5;
            switchView('flow'); flowOpen(5);
          });
          chips.append(chip);
        });
        item.append(thumb, button, chips); section.append(item);
      });
      history.append(section);
    } catch { /* v2 history unavailable on older host */ }
  }

  function switchView(view) {
    var recent = view === 'recent';
    var text = view === 'text';
    var seedream = view === 'seedream';
    var workflow = view === 'flow';
    currentView = view;
    $('.page').dataset.wfView = view;
    $('#viewTabs').hidden = startupView === 'flow';
    $('#workflowHistory').textContent = recent ? '返回工作台' : '历史';
    $('.work').hidden = view !== 'studio';
    $('#recentPage').hidden = !recent;
    $('#textPage').hidden = !text;
    $('#seedreamPage').hidden = !seedream;
    $('#flowPage').hidden = !workflow;
    $$('#viewTabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.view === view); });
    if (recent) {
      flowLoadHistory();
      flowLoadV2History();
      renderRecentPage();
      if (!recentLoaded) loadAllHistory();
    }
    if (text) { renderTextTemplates(); renderTextPage(); }
    if (seedream) renderSeedreamPage();
    if (!workflow && $('#wfDeck').open) { $('#wfDeck').close(); $('.wf-workspace').inert = false; }
    if (workflow) { loadFlowCaps(); renderFlow(); }
  }

  function currentHistory() {
    return hostHistoryReady ? hostHistory : readHistory();
  }

  function readHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch (e) { return []; }
  }
  function writeHistory(list) {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
      return true;
    } catch (e) {
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 1)));
        toast('图片较大，最近只保存了 1 次');
        return true;
      } catch (e2) {
        toast('图片较大，未能存入最近');
        return false;
      }
    }
  }
  function timeLabel(at) {
    try {
      return new Date(at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return '--:--'; }
  }
  function rememberBatch() {
    if (!state.source.url || !state.results.length) return;
    var entry = {
      at: Date.now(),
      source: state.source.url,
      sourceName: state.source.name,
      assetId: state.assetId,
      styleIds: state.selected.slice(),
      params: { strength: state.params.strength, ink: state.params.ink, grain: state.params.grain, size: state.params.size },
      frame: state.frame,
      results: state.results.filter(function (r) { return !r.error; }).map(function (r) {
        return { id: r.id, url: r.url, w: r.w, h: r.h, cloud: !!r.cloud };
      })
    };
    var list = readHistory();
    list.unshift(entry);
    writeHistory(list.slice(0, 3));
    recentLoaded = false;
    renderHistory();
    if (state.assetId && !state.results.some(function (r) { return r.cloud; })) {
      apiFetch('/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: state.assetId,
          text: state.text,
          frame: state.frame,
          results: state.results.map(function (r) {
            return { styleId: r.id, params: r.params || effective(r.id), dataUrl: r.url, w: r.w, h: r.h };
          })
        })
      }).then(function (res) { return res.ok ? res.json() : null; }).then(function (data) {
        if (!data) return;
        hostHistoryReady = true;
        hostHistory.unshift(fromHost(data));
        historyTotal += 1;
        renderHistory();
      }).catch(function () {});
    }
  }
  function forgetLocalHistory(urls) {
    if (!urls || !urls.length) return;
    var list = readHistory();
    var next = list.filter(function (e) {
      return !(e.results || []).some(function (r) { return urls.indexOf(r.url) >= 0; });
    });
    if (next.length !== list.length) writeHistory(next);
  }

  function deleteHistory(index) {
    var list = currentHistory();
    var e = list[index];
    if (!e) return;
    if (!window.confirm('删除这条最近记录？对应的 Host 结果也会一并移除，此操作不可撤销。')) return;
    if (e.hostId) {
      fetch(API + '/batch/' + encodeURIComponent(e.hostId), { method: 'DELETE' }).then(function (res) {
        if (!res.ok) throw new Error('删除失败');
        var urls = (e.results || []).map(function (r) { return r.url; });
        hostHistory = hostHistory.filter(function (x) { return x.hostId !== e.hostId; });
        hostHistoryReady = true;
        historyTotal = Math.max(0, historyTotal - 1);
        forgetLocalHistory(urls);
        renderHistory();
        renderHistoryModal();
        toast('已删除这条记录');
      }).catch(function (err) { toast(err.message || '删除失败'); });
      return;
    }
    var local = readHistory();
    local.splice(index, 1);
    writeHistory(local);
    historyTotal = local.length;
    renderHistory();
    renderHistoryModal();
    toast('已删除这条记录');
  }

  function paddedCount(n) {
    n = Number(n) || 0;
    return n < 100 ? ('0' + n).slice(-2) : String(n);
  }

  function dateTimeLabel(at) {
    try {
      return new Date(at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch (e) { return '--:--'; }
  }

  function renderHistory() {
    var list = currentHistory();
    var box = $('#historyBox');
    if (!box) return;
    var total = hostHistoryReady ? historyTotal : list.length;
    box.hidden = !total;
    $('#historyCount').textContent = paddedCount(total);
    $('#historyMore').hidden = total <= 3;
    $('#historyList').innerHTML = list.slice(0, 3).map(function (e, i) {
      var thumb = (e.results && e.results[0] && e.results[0].url) || '';
      return '<div class="history-slot">' +
        '<button class="history-item" data-history="' + i + '" title="恢复 ' + timeLabel(e.at) + ' 的试印">' +
        '<img src="' + thumb + '" alt="">' +
        '<span>' + timeLabel(e.at) + '</span>' +
        '</button>' +
        '<button class="history-del" data-history-del="' + i + '" aria-label="删除这条最近记录" title="删除记录">×</button>' +
        '</div>';
    }).join('');
    if ($('#historyLayer') && $('#historyLayer').classList.contains('open')) renderHistoryModal();
  }

  function historyStyleNames(entry) {
    var names = (entry.styleIds || []).map(function (id) {
      var st = styleById(id);
      return st ? st.name : '';
    }).filter(Boolean);
    return names.length ? names.join(' · ') : '—';
  }

  function renderHistoryModal() {
    var box = $('#historyModalList');
    if (!box) return;
    var list = currentHistory();
    var total = hostHistoryReady ? historyTotal : list.length;
    $('#historyModalCount').textContent = '共 ' + total + ' 条';
    if (!list.length) {
      box.innerHTML = '<div class="history-empty">还没有历史记录。</div>';
    } else {
      box.innerHTML = list.map(function (e, i) {
        var thumb = (e.results && e.results[0] && e.results[0].url) || '';
        var n = (e.results || []).length;
        return '<article class="history-card">' +
          '<button class="history-thumb" data-history-restore="' + i + '" aria-label="恢复这条记录">' +
          (thumb ? '<img src="' + thumb + '" alt="">' : '<span class="ph">无图</span>') +
          '</button>' +
          '<div class="history-info">' +
          '<b>' + escapeHTML(dateTimeLabel(e.at)) + ' · ' + n + ' 版</b>' +
          '<span>' + escapeHTML(e.sourceName || 'history') + '</span>' +
          '<span>' + escapeHTML(historyStyleNames(e)) + '</span>' +
          '</div>' +
          '<div class="history-actions">' +
          '<button data-history-restore="' + i + '">恢复</button>' +
          '<button data-history-delete="' + i + '">删除</button>' +
          '</div>' +
          '</article>';
      }).join('');
    }
    var more = $('#historyLoadMore');
    if (more) {
      more.hidden = !hostHistoryReady || hostHistory.length >= historyTotal;
      more.disabled = historyLoadingMore;
      more.textContent = historyLoadingMore ? '加载中…' : '加载更多';
    }
  }

  function openHistoryModal() {
    var layer = $('#historyLayer');
    if (!layer) return;
    historyReturnFocus = document.activeElement;
    layer.classList.add('open');
    layer.removeAttribute('inert');
    layer.setAttribute('aria-hidden', 'false');
    renderHistoryModal();
    if (hostHistoryReady && historyTotal > hostHistory.length) {
      loadHostHistory(100, 0).then(function () { renderHistoryModal(); });
    }
    var close = $('.history-dialog-head .icon-btn');
    if (close) close.focus();
  }

  function closeHistoryModal() {
    var layer = $('#historyLayer');
    if (!layer) return;
    layer.classList.remove('open');
    layer.setAttribute('inert', '');
    layer.setAttribute('aria-hidden', 'true');
    if (historyReturnFocus && historyReturnFocus.isConnected) historyReturnFocus.focus();
    historyReturnFocus = null;
  }

  function loadMoreHistory() {
    if (!hostHistoryReady || historyLoadingMore || hostHistory.length >= historyTotal) return;
    historyLoadingMore = true;
    renderHistoryModal();
    loadHostHistory(100, hostHistory.length).then(function () {
      historyLoadingMore = false;
      renderHistoryModal();
    }).catch(function () {
      historyLoadingMore = false;
      renderHistoryModal();
    });
  }
  function restoreHistory(index) {
    var list = currentHistory();
    var e = list[index];
    if (!e) return;
    setSource(e.source, e.sourceName || 'history').then(function () {
      if (disposed) return;
      state.assetId = e.assetId || null;
      state.selected = (e.styleIds || []).filter(function (id) {
        var s = styleById(id);
        return s && !s.disabled;
      });
      if (!state.selected.length) state.selected = ['halftone', 'riso', 'cyanotype'];
      state.focus = state.selected[state.selected.length - 1];
      state.params = Object.assign({}, state.params, e.params || {});
      if (e.text) state.text = Object.assign({}, state.text, e.text);
      state.frame = e.frame || '3:2';
      state.results = (e.results || []).map(function (r) {
        return { id: r.id, url: r.url, w: r.w, h: r.h, cost: 0, cloud: !!r.cloud };
      });
      buildThumbs(SRC);
      renderGrid();
      renderChips();
      applyFrame();
      updateUI();
      if (state.results.length) showResult(state.results[0].id);
      else showPreview();
      renderProof();
      toast('已恢复 ' + timeLabel(e.at) + ' 的试印');
    }).catch(function () { toast('这张历史图片已经找不到了'); });
  }

  /* ————— 设置 ————— */
  var setLayer = $('#settingsLayer');
  var settingsReturnFocus = null;
  function loadUsage() {
    var today = $('#usageToday');
    var month = $('#usageMonth');
    if (!today || !month) return;
    apiFetch('/usage', { cache: 'no-store' }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) { return { ok: res.ok, data: data }; });
    }).then(function (result) {
      if (!result.ok) {
        today.textContent = result.data.error || '—';
        month.textContent = '—';
        return;
      }
      var t = result.data.today || {};
      var m = result.data.month || {};
      today.textContent = (t.count || 0) + ' 张 · ¥' + Number(t.costYuan || 0).toFixed(2);
      month.textContent = (m.count || 0) + ' 张 · ¥' + Number(m.costYuan || 0).toFixed(2);
    }).catch(function () { today.textContent = '—'; month.textContent = '—'; });
  }
  async function loadStorage() {
    var path = $('#storagePath'), input = $('#storageInput'), roots = $('#storageRoots');
    if (!path || !roots) return;
    try {
      var res = await apiFetch('/v2/storage', { cache: 'no-store' });
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok) throw new Error(data.error || '读取存储目录失败');
      path.textContent = data.active || '—';
      if (data.writable === false) $('#storageNote').textContent = '当前目录不可写或已离线；作品索引仍保留，请重新定位。';
      path.title = data.active || '';
      if (input) input.value = data.active || '';
      roots.replaceChildren();
      (data.roots || []).forEach(function (root) {
        var row = document.createElement('div');
        row.className = 'storage-root' + (root.active ? ' active' : '');
        var name = document.createElement('span'); name.textContent = root.path; name.title = root.path;
        row.append(name);
        if (root.status === 'offline') { var off = document.createElement('b'); off.textContent = '离线'; row.append(off); }
        roots.append(row);
      });
    } catch (error) {
      path.textContent = '读取失败';
      $('#storageNote').textContent = error.message;
    }
  }
  async function applyStorage() {
    var input = $('#storageInput');
    if (!input || !input.value.trim()) return;
    try {
      var res = await apiFetch('/v2/storage', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ root: input.value.trim() }),
      });
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok) throw new Error(data.error || '目录不可写');
      toast('存储目录已更新');
      await loadStorage();
    } catch (error) { toast(error.message); }
  }
  function openSettings() {
    settingsReturnFocus = document.activeElement;
    renderLibraryManager();
    loadUsage();
    loadStorage();
    setLayer.inert = false;
    setLayer.classList.add('open');
    setLayer.setAttribute('aria-hidden', 'false');
    setTimeout(function () {
      var first = setLayer.querySelector('button');
      if (first) first.focus();
    }, 0);
  }
  function closeSettings() {
    setLayer.classList.remove('open');
    setLayer.setAttribute('aria-hidden', 'true');
    setLayer.inert = true;
    if (settingsReturnFocus && settingsReturnFocus.focus) settingsReturnFocus.focus();
  }
  function setMiniSeg(group, value) {
    $$('[data-group="' + group + '"] button').forEach(function (b) {
      b.classList.toggle('on', b.textContent.trim() === value);
    });
  }
  function currentSeg(group) {
    var b = $('[data-group="' + group + '"] button.on');
    return b ? b.textContent.trim() : '';
  }
  function setKeyState(s) {
    var el = $('#keyState');
    if (!el) return;
    if (s && s.hasKey && s.cloud) {
      el.textContent = '已启用 · 尾号 ' + (s.keyHint || '****');
      el.classList.remove('warn');
    } else if (s && s.hasKey) {
      el.textContent = '已保存 · 云端未启用';
      el.classList.add('warn');
    } else {
      el.textContent = '未配置 · 云端不可用';
      el.classList.add('warn');
    }
  }
  function setSeedreamKeyState(s) {
    var el = $('#seedreamKeyState');
    if (!el) return;
    if (s && s.hasSeedreamKey) {
      el.textContent = '已配置 · 尾号 ' + (s.seedreamKeyHint || '****');
      el.classList.remove('warn');
    } else {
      el.textContent = '未配置';
      el.classList.add('warn');
    }
    var modelGroup = $('#seedreamModelGroup');
    if (modelGroup) $$('#seedreamModelGroup button').forEach(function (b) {
      b.classList.toggle('on', b.dataset.seedreamModel === (s && s.seedreamModel ? s.seedreamModel : 'doubao-seedream-5-5-261028'));
    });
  }
  function saveSeedreamKeyOnly() {
    var key = $('#seedreamKeyInput').value.trim();
    if (!key) { toast('请输入 Seedream Key'); return; }
    apiFetch('/seedream/key', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: key }),
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) throw new Error(data.error || '保存失败');
        return data;
      });
    }).then(function (s) {
      if (disposed) return;
      state.settings = s;
      setSeedreamKeyState(s);
      renderSeedreamPage();
      $('#seedreamKeyInput').value = '';
      $('#seedreamKeyEdit').hidden = true;
      toast('Seedream Key 已更新');
    }).catch(function (err) { toast(err.message || 'Seedream Key 保存失败'); });
  }

  function loadSettings() {
    apiFetch('/settings', { cache: 'no-store' }).then(function (res) {
      if (!res.ok) throw new Error('settings');
      return res.json();
    }).then(function (s) {
      if (disposed) return;
      state.settings = s;
      startupView = s.startupMode === 'studio' ? 'studio' : 'flow';
      $('#startupMode').value = startupView;
      if (currentView !== 'recent') switchView(startupView);
      if (s.defaultSize && ['640', '960', '1200'].indexOf(s.defaultSize) >= 0) {
        state.params.size = s.defaultSize;
        setMiniSeg('size', state.params.size);
      }
      if (typeof s.budget === 'number' && $('#budget')) $('#budget').value = s.budget;
      if ($('#confirmCloud')) $('#confirmCloud').checked = s.privacyConfirm !== false;
      setMiniSeg('conc', String(s.concurrency || 2));
      setMiniSeg('base', s.base === 'intl' ? '国际站' : '国内站');
      setMiniSeg('model', s.model === 'highspeed' ? 'H3 极速' : 'H3 标准');
      setMiniSeg('bill', s.billing === 'mplan' ? 'M Plan' : '按量');
      setKeyState(s);
      setSeedreamKeyState(s);
      updateUI();
    }).catch(function () {
      if (disposed) return;
      setKeyState({ hasKey: false, keyHint: '' });
      $('#keyState').textContent = '设置服务未连接';
      $('#keyState').classList.add('warn');
    });
  }
  function postSettings(body) {
    return apiFetch('/settings', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) throw new Error(data.error || '保存失败');
        return data;
      });
    });
  }
  function saveSettings() {
    var body = {
      defaultSize: currentSeg('size'),
      startupMode: $('#startupMode').value,
      enableCloud: !!(state.settings && state.settings.hasKey)
    };
    var key = $('#keyInput').value.trim();
    if (key) body.key = key;
    postSettings(body).then(function (s) {
      if (disposed) return;
      state.settings = s;
      if (s.defaultSize && ['640', '960', '1200'].indexOf(s.defaultSize) >= 0) state.params.size = s.defaultSize;
      setMiniSeg('size', state.params.size);
      setMiniSeg('conc', String(s.concurrency));
      setMiniSeg('base', s.base === 'intl' ? '国际站' : '国内站');
      setMiniSeg('model', s.model === 'highspeed' ? 'H3 极速' : 'H3 标准');
      setMiniSeg('bill', s.billing === 'mplan' ? 'M Plan' : '按量');
      setKeyState(s);
      setSeedreamKeyState(s);
      $('#keyInput').value = '';
      $('#keyEdit').hidden = true;
      startupView = s.startupMode === 'studio' ? 'studio' : 'flow';
      closeSettings();
      switchView(startupView);
      updateUI();
      toast('设置已保存');
    }).catch(function (err) { toast(err.message || '设置保存失败'); });
  }
  function saveKeyOnly() {
    var key = $('#keyInput').value.trim();
    if (!key) { toast('请输入 Key'); return; }
    postSettings({ key: key }).then(function (s) {
      if (disposed) return;
      state.settings = s;
      setKeyState(s);
      setSeedreamKeyState(s);
      $('#keyInput').value = '';
      $('#keyEdit').hidden = true;
      toast('Key 已更新');
    }).catch(function (err) { toast(err.message || 'Key 保存失败'); });
  }
  function testKey() {
    fetch(API + '/cloud/key-test', { method: 'POST' }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (data.supported === false) {
          toast(data.error || '官方没有免计费的 Key 探测端点；请用一次云端生成验证');
          return;
        }
        if (!res.ok || data.ok !== true) throw new Error(data.error || 'Key 不可用');
        toast('Key 可用');
      });
    }).catch(function (err) { toast(err.message || '检查 Key 失败'); });
  }

  /* ————— 图片裁切 ————— */
  var crop = { img: null, natW: 0, natH: 0, ratio: '原图', box: { x: 0, y: 0, w: 0, h: 0 }, scale: 1, drag: null, returnFocus: null };

  function cropRatioValue(ratio) {
    if (ratio === '原图') return 0;
    var parts = ratio.split(':');
    return Number(parts[0]) / Number(parts[1]);
  }

  function cropBoxForRatio(ratio) {
    var r = cropRatioValue(ratio);
    var w = crop.natW, h = crop.natH;
    if (r) { w = Math.min(crop.natW, crop.natH * r); h = w / r; }
    return { x: Math.round((crop.natW - w) / 2), y: Math.round((crop.natH - h) / 2), w: Math.round(w), h: Math.round(h) };
  }

  function renderCropBox() {
    var img = $('#cropImg'), stage = $('#cropStage'), box = $('#cropBox');
    if (!img || !stage || !box || !crop.img) return;
    var ir = img.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    if (!ir.width || !ir.height) return;
    crop.scale = ir.width / crop.natW;
    var left = ir.left - sr.left + crop.box.x * crop.scale;
    var top = ir.top - sr.top + crop.box.y * crop.scale;
    box.style.left = left + 'px';
    box.style.top = top + 'px';
    box.style.width = (crop.box.w * crop.scale) + 'px';
    box.style.height = (crop.box.h * crop.scale) + 'px';
    $('#cropInfo').textContent = Math.round(crop.box.w) + ' × ' + Math.round(crop.box.h) + ' px · ' + crop.ratio;
  }

  function setCropRatio(ratio) {
    crop.ratio = ratio;
    crop.box = cropBoxForRatio(ratio);
    $$('#cropRatios button').forEach(function (b) { b.classList.toggle('on', b.dataset.cropRatio === ratio); });
    renderCropBox();
  }

  function openCrop() {
    if (!state.source.url) { toast('先选择图片'); return; }
    var src = (state.originalSource && state.originalSource.url) ? state.originalSource : state.source;
    var layer = $('#cropLayer');
    crop.returnFocus = document.activeElement;
    crop.ratio = '原图';
    crop.drag = null;
    layer.classList.add('open');
    layer.inert = false;
    layer.setAttribute('aria-hidden', 'false');
    $('#cropMeta').textContent = src.name + ' · ' + src.w + ' × ' + src.h;
    $('#cropBox').hidden = true;
    var img = $('#cropImg');
    img.onload = function () {
      crop.img = img;
      crop.natW = img.naturalWidth;
      crop.natH = img.naturalHeight;
      $('#cropBox').hidden = false;
      $$('#cropRatios button').forEach(function (b) { b.classList.toggle('on', b.dataset.cropRatio === '原图'); });
      crop.box = cropBoxForRatio('原图');
      renderCropBox();
      $('.crop-head .icon-btn', layer).focus();
    };
    img.onerror = function () { toast('图片无法读取'); };
    img.src = src.url;
  }

  function closeCrop() {
    var layer = $('#cropLayer');
    if (!layer) return;
    layer.classList.remove('open');
    layer.inert = true;
    layer.setAttribute('aria-hidden', 'true');
    crop.drag = null;
    $('#cropImg').removeAttribute('src');
    crop.img = null;
    if (crop.returnFocus && crop.returnFocus.isConnected) crop.returnFocus.focus();
    crop.returnFocus = null;
  }

  function applyCrop() {
    if (!crop.img || !crop.box.w || !crop.box.h) return;
    var w = Math.max(1, Math.round(crop.box.w));
    var h = Math.max(1, Math.round(crop.box.h));
    var c = make(w, h);
    c.getContext('2d').drawImage(crop.img, crop.box.x, crop.box.y, crop.box.w, crop.box.h, 0, 0, w, h);
    var data = c.toDataURL('image/jpeg', 0.94);
    closeCrop();
    applyCroppedSource(data, w, h);
  }

  function applyCroppedSource(url, w, h) {
    var im = new Image();
    im.onload = function () {
      if (disposed) return;
      var baseName = (state.originalSource && state.originalSource.name) || state.source.name || 'image';
      state.source = { name: baseName, w: w, h: h, url: url };
      state.frame = '原图';
      state.assetId = null;
      state.results = [];
      state.activeResult = null;
      state.dirty = false;
      SRC = im;
      $('#baseImg').src = url;
      $('#resultImg').removeAttribute('src');
      $('#emptyStage').hidden = true;
      $('#print').style.display = '';
      $('#printFrame').hidden = false;
      $('#print').classList.add('original-only');
      $('#fileMeta').textContent = baseName + ' · 裁切 · ' + w + ' × ' + h;
      $('#sampleTag').hidden = !state.isSample;
      applyFrame();
      updateUI();
      renderGrid();
      renderChips();
      renderProof();
      showOriginal();
      caption('<b>裁切</b> · ' + baseName, w + ' × ' + h + ' · 原图比例');
      toast('已裁切 · ' + w + ' × ' + h);
    };
    im.onerror = function () { toast('裁切图片读取失败'); };
    im.src = url;
  }

  function restoreOriginalSource() {
    var src = state.originalSource;
    if (!src || !src.url) { toast('没有可恢复的原图'); return; }
    closeCrop();
    setSource(src.url, src.name, state.isSample).then(function () {
      if (!disposed) toast('已恢复原图');
    }).catch(function () { toast('恢复原图失败'); });
  }

  function bindCropDrag() {
    var box = $('#cropBox');
    if (!box) return;
    box.addEventListener('pointerdown', function (e) {
      if (!crop.img) return;
      crop.drag = { x: e.clientX, y: e.clientY, bx: crop.box.x, by: crop.box.y };
      box.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    box.addEventListener('pointermove', function (e) {
      if (!crop.drag) return;
      var dx = (e.clientX - crop.drag.x) / crop.scale;
      var dy = (e.clientY - crop.drag.y) / crop.scale;
      crop.box.x = Math.max(0, Math.min(crop.natW - crop.box.w, crop.drag.bx + dx));
      crop.box.y = Math.max(0, Math.min(crop.natH - crop.box.h, crop.drag.by + dy));
      renderCropBox();
    });
    box.addEventListener('pointerup', function () { crop.drag = null; });
    box.addEventListener('pointercancel', function () { crop.drag = null; });
  }

  /* ————— 结果大图 / 反馈 / 收藏 ————— */
  var resultReturnFocus = null;
  var bigState = null;

  function favoriteIndex(key) {
    for (var i = 0; i < favorites.length; i++) if (favorites[i].key === key) return i;
    return -1;
  }

  function updateFavoriteCount() {
    var count = $('#favCount');
    if (count) count.textContent = String(favorites.length);
  }

  function syncBigActions() {
    if (!bigState) return;
    var feedback = feedbackStore[bigState.key] || '';
    var like = $('#resultLike'), dislike = $('#resultDislike'), favorite = $('#resultFavorite');
    if (like) { like.classList.toggle('on', feedback === 'up'); like.setAttribute('aria-pressed', feedback === 'up' ? 'true' : 'false'); }
    if (dislike) { dislike.classList.toggle('on', feedback === 'down'); dislike.setAttribute('aria-pressed', feedback === 'down' ? 'true' : 'false'); }
    if (favorite) {
      var saved = favoriteIndex(bigState.key) >= 0;
      favorite.classList.toggle('on', saved);
      favorite.setAttribute('aria-pressed', saved ? 'true' : 'false');
      var label = favorite.querySelector('span');
      if (label) label.textContent = saved ? '已收藏' : '收藏';
    }
    var archive = $('#resultArchive');
    if (archive) {
      var canArchive = !!bigState.archiveKey;
      archive.hidden = !canArchive;
      var savedArchive = canArchive && (bigState.archived === true || archivedIndex(bigState.archiveKey) >= 0);
      archive.classList.toggle('on', savedArchive);
      var archiveLabel = archive.querySelector('span');
      if (archiveLabel) archiveLabel.textContent = savedArchive ? '取消归档' : '归档';
    }
    updateFavoriteCount();
  }

  function openBig(opts) {
    if (!opts || !opts.url) return;
    bigState = opts;
    resultReturnFocus = document.activeElement;
    var layer = $('#resultLayer');
    if (!layer) return;
    $('#resultTitle').textContent = opts.title || '结果';
    $('#resultMeta').textContent = opts.meta || '';
    $('#resultBig').onload = function () {
      var w = this.naturalWidth, h = this.naturalHeight;
      if (!w || !h) return;
      if (!bigState || !bigState.url) return;
      if (!bigState.w || !bigState.h) { bigState.w = w; bigState.h = h; }
      var meta = $('#resultMeta');
      if (meta) meta.textContent = meta.textContent.replace(/读取尺寸…|0 × 0/g, w + ' × ' + h);
    };
    $('#resultBig').src = opts.url;
    $('#resultBig').alt = (opts.title || '结果') + ' 大图';
    var infoEl = $('#resultInfo'); if (infoEl) infoEl.textContent = opts.info || '';
    var border = opts.border || 'none';
    layer.classList.remove('frame-polaroid', 'frame-film', 'frame-paper');
    if (border !== 'none') layer.classList.add('frame-' + border);
    layer.inert = false;
    layer.classList.add('open');
    layer.setAttribute('aria-hidden', 'false');
    syncBigActions();
    $('.preview-head .icon-btn', layer).focus();
  }

  function openResultBig(id) {
    var r = null;
    for (var i = 0; i < state.results.length; i++) if (state.results[i].id === id) r = state.results[i];
    if (!r || r.error) return;
    var s = styleById(id) || { name: id };
    var ratioMeta = state.border === 'polaroid' ? ' · 宝丽来 4:5' : '';
    openBig({
      key: resultKey(r),
      url: r.url,
      title: s.name,
      meta: (state.genModel === 'seedream' ? 'Seedream 5.5' : 'MiniMax H3') + ' · ' + r.w + ' × ' + r.h + ratioMeta,
      info: (state.border === 'polaroid' ? '宝丽来 4:5 · ' : '原图尺寸 · ') + r.w + ' × ' + r.h + ' · 可用底部按钮下载',
      w: r.w,
      h: r.h,
      border: state.border,
      resultId: id,
      styleId: id,
      cloud: !!r.cloud,
    });
  }

  function closeResultBig() {
    var layer = $('#resultLayer');
    if (!layer) return;
    layer.classList.remove('open');
    layer.setAttribute('aria-hidden', 'true');
    layer.inert = true;
    $('#resultBig').removeAttribute('src');
    if (resultReturnFocus && resultReturnFocus.isConnected) resultReturnFocus.focus();
    resultReturnFocus = null;
    bigState = null;
  }

  function toggleFeedback(kind) {
    if (!bigState) return;
    feedbackStore[bigState.key] = feedbackStore[bigState.key] === kind ? '' : kind;
    writeJsonStore(FEEDBACK_KEY, feedbackStore);
    syncBigActions();
  }

  function toggleFavoriteBig() {
    if (!bigState) return;
    var idx = favoriteIndex(bigState.key);
    if (idx >= 0) {
      var removed = favorites[idx];
      favorites.splice(idx, 1);
      if (!writeJsonStore(FAVORITES_KEY, favorites)) {
        favorites.splice(idx, 0, removed);
        toast('收藏保存失败，请重试');
        return;
      }
      toast('已取消收藏');
    } else {
      var entry = {
        key: bigState.key,
        url: bigState.url,
        title: bigState.title || '',
        styleId: bigState.styleId || '',
        styleName: bigState.title || '',
        w: bigState.w || 0,
        h: bigState.h || 0,
        cloud: !!bigState.cloud,
        border: bigState.border || 'none',
        at: Date.now(),
      };
      favorites.unshift(entry);
      if (favorites.length > 40) favorites.pop();
      if (!writeJsonStore(FAVORITES_KEY, favorites)) {
        favorites.shift();
        toast('收藏空间不足，先删除一些收藏');
        return;
      }
      toast('已收藏');
    }
    syncBigActions();
    if ($('#favoritesLayer') && $('#favoritesLayer').classList.contains('open')) renderFavorites();
  }

  function favoriteTime(ms) {
    try { return new Date(ms).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }); } catch (e) { return ''; }
  }

  function renderFavorites() {
    var grid = $('#favoritesGrid');
    if (!grid) return;
    $('#favoritesMeta').textContent = favorites.length ? favorites.length + ' 张 · 本机保存' : '';
    if (!favorites.length) {
      grid.innerHTML = '<div class="favorites-empty">还没有收藏。打开生成结果后点底部「收藏」。</div>';
      return;
    }
    grid.innerHTML = favorites.map(function (f, i) {
      var when = f.at ? favoriteTime(f.at) : '';
      return '<article class="favorite-card">'
        + '<button class="favorite-open" data-favorite-open="' + i + '" aria-label="查看收藏图片"><img src="' + escapeHTML(f.url) + '" alt="' + escapeHTML(f.title || '收藏图片') + '"></button>'
        + '<span class="f-name">' + escapeHTML(f.title || f.styleName || '收藏') + '</span>'
        + '<span class="f-meta">' + escapeHTML(when) + (f.cloud ? ' · 云端' : ' · 本机') + '</span>'
        + '<button class="favorite-remove" data-favorite-remove="' + i + '" aria-label="取消收藏">×</button>'
        + '</article>';
    }).join('');
  }

  function openFavorites() {
    renderFavorites();
    var layer = $('#favoritesLayer');
    if (!layer) return;
    layer.inert = false;
    layer.classList.add('open');
    layer.setAttribute('aria-hidden', 'false');
    $('.preview-head .icon-btn', layer).focus();
  }

  function closeFavorites() {
    var layer = $('#favoritesLayer');
    if (!layer) return;
    layer.classList.remove('open');
    layer.inert = true;
    layer.setAttribute('aria-hidden', 'true');
  }

  function openFavorite(index) {
    var f = favorites[index];
    if (!f) return;
    closeFavorites();
    openBig({
      key: f.key,
      url: f.url,
      title: f.title || '收藏图片',
      meta: '收藏 · ' + (f.at ? new Date(f.at).toLocaleString('zh-CN') : ''),
      info: (f.w && f.h ? f.w + ' × ' + f.h + ' · ' : '') + '来自收藏',
      w: f.w,
      h: f.h,
      border: f.border || 'none',
      resultId: null,
      styleId: f.styleId || '',
      cloud: !!f.cloud,
    });
  }

  /* ————— 多图生成 ————— */
  var multiState = { mode: 'loop', images: [], busy: false, results: [] };

  function openMulti(files) {
    var list = Array.prototype.slice.call(files || []).slice(0, 8);
    if (!list.length) return;
    multiState = { mode: 'loop', images: [], busy: false, results: [] };
    var pending = list.length;
    list.forEach(function (file, index) {
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          multiState.images[index] = { url: reader.result, el: img, w: img.naturalWidth, h: img.naturalHeight, name: file.name };
          if (--pending === 0) renderMulti();
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
    $('#multiLayer').inert = false;
    $('#multiLayer').classList.add('open');
    $('#multiLayer').setAttribute('aria-hidden', 'false');
    $('#multiThumbs').innerHTML = '';
    $('#multiResults').hidden = true;
    $('#multiResults').innerHTML = '';
  }

  function multiSize(img) {
    var g = gcd(img.w, img.h);
    return textTargetSize(Math.round(img.w / g) + ':' + Math.round(img.h / g), state.cloudQuality);
  }

  function renderMulti() {
    var imgs = multiState.images.filter(Boolean);
    $('#multiThumbs').innerHTML = imgs.map(function (x) { return '<img src="' + x.url + '" alt="">'; }).join('');
    var styles = selectedCloudIds();
    var count = imgs.length * styles.length;
    var price = state.genModel === 'seedream' ? 0.28 : Number(cloudUnitPrice());
    $('#multiMeta').textContent = imgs.length + ' 张图片 · ' + styles.length + ' 个风格';
    $('#multiCost').textContent = count ? '预计 ' + count + ' 张 · 约 ¥' + (count * price).toFixed(2) : '先选择云端风格';
    $('#multiGenerate').disabled = multiState.busy || !count || !(state.genModel === 'seedream' ? state.settings.hasSeedreamKey : cloudReady());
  }

  async function uploadMultiAsset(image) {
    var res = await apiFetch('/assets', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataUrl: image.url, name: image.name || 'multi.jpg', w: image.w, h: image.h }),
    });
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok || !data.id) throw cloudError(data.error || '图片上传失败', 'asset_upload_failed');
    return data.id;
  }

  async function generateMultiImage(image, styleId, prompt) {
    if (state.genModel === 'seedream') {
      var sr = await apiFetch('/seedream/edit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt, size: multiSize(image), imageDataUrl: image.url, model: 'doubao-seedream-5-5-261028' }),
      });
      var sd = await sr.json().catch(function () { return {}; });
      if (!sr.ok) throw cloudError(sd.error || 'Seedream 失败', sd.code);
      return { url: sd.url, w: sd.w, h: sd.h, styleId: styleId, cloud: true, cost: 0.28 };
    }
    var assetId = await uploadMultiAsset(image);
    var started = await startCloudJob(assetId, styleId);
    var job = await waitCloudJob(started.id);
    if (job.status !== 'succeeded' || !job.output) throw cloudError((job.error && job.error.message) || '生成失败', job.status);
    return { url: job.output.url, w: job.output.w, h: job.output.h, styleId: styleId, cloud: true, cost: cloudUnitPrice() };
  }

  async function generateMultiScene(images, styleId) {
    var styleBodyText = styleBody(styleId);
    var prompt = '以图1作为主构图与身份参考；图2至图' + images.length + '只补充提示词明确指定的其他主体、物体或环境，不复制其构图和无关细节。保持每个主体的身份、数量、姿态、关键特征和相互空间关系，融合成一个完整场景；只改变画种、介质、光线、色彩、边缘和表面质感：' + styleBodyText;
    if (state.genModel === 'seedream') {
      var sr = await apiFetch('/seedream/edit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt, size: textTargetSize('1:1', state.cloudQuality), imageDataUrls: images.map(function (im) { return im.url; }), model: 'doubao-seedream-5-5-261028' }),
      });
      var sd = await sr.json().catch(function () { return {}; });
      if (!sr.ok) throw cloudError(sd.error || 'Seedream 失败', sd.code);
      return { url: sd.url, w: sd.w, h: sd.h, styleId: styleId, cloud: true, cost: 0.28 };
    }
    var ids = [];
    for (var i = 0; i < images.length; i++) ids.push(await uploadMultiAsset(images[i]));
    var startedRes = await apiFetch('/cloud/jobs', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assetIds: ids, styleId: styleId, prompt: prompt, size: textTargetSize('1:1', state.cloudQuality), params: {} }),
    });
    var started = await startedRes.json().catch(function () { return {}; });
    if (!startedRes.ok) throw cloudError(started.error || '云端任务创建失败', started.code);
    var job = await waitCloudJob(started.id);
    if (job.status !== 'succeeded' || !job.output) throw cloudError((job.error && job.error.message) || '生成失败', job.status);
    return { url: job.output.url, w: job.output.w, h: job.output.h, styleId: styleId, cloud: true, cost: cloudUnitPrice() };
  }

  async function startMulti() {
    if (multiState.busy) return;
    var styles = selectedCloudIds();
    var images = multiState.images.filter(Boolean);
    if (!styles.length) { toast('先选择云端风格'); return; }
    if (state.genModel === 'seedream' ? !state.settings.hasSeedreamKey : !cloudReady()) { openSettings(); return; }
    multiState.busy = true;
    renderMulti();
    var results = [];
    try {
      if (multiState.mode === 'scene') {
        for (var si = 0; si < styles.length; si++) {
          results.push(await generateMultiScene(images, styles[si]));
        }
      } else {
        for (var i = 0; i < images.length; i++) {
          for (var j = 0; j < styles.length; j++) {
            results.push(await generateMultiImage(images[i], styles[j], promptFor(styles[j])));
          }
        }
      }
      multiState.results = results;
      $('#multiResults').hidden = false;
      $('#multiResults').innerHTML = results.map(function (r, i) {
        var st = styleById(r.styleId) || { name: r.styleId };
        return '<img data-multi-view="' + i + '" src="' + r.url + '" alt="' + escapeHTML(st.name) + '">';
      }).join('');
      loadAllHistory(true);
      toast('多图生成完成 · ' + results.length + ' 张');
    } catch (err) {
      toast(err.message || '多图生成失败');
    } finally {
      multiState.busy = false;
      renderMulti();
    }
  }

  /* ————— 二次编辑 ————— */
  var REFINE_PROMPT = '在保持当前图片构图、主体身份、主体数量、画面文字和整体风格不变的前提下进行二次优化：修正细节结构、边缘和材质，提升清晰度、光影层次与完成度，减少伪影；不要新增主体、文字或改变画幅。';
  var refine = { url: '', title: '', w: 0, h: 0, model: 'minimax', parentId: null, busy: false, result: null, thread: [], mask: { dataUrl: '', bbox: null, painted: false }, brush: { size: 32, mode: 'paint' } };

  function refineTargetSize(w, h) {
    var target = { '1K': 1048576, '2K': 4194304, '4K': 16777216 }[state.cloudQuality] || 4194304;
    if (!w || !h) return '2K';
    var scale = Math.sqrt(target / (w * h));
    var nw = Math.max(128, Math.round(w * scale));
    var nh = Math.max(128, Math.round(h * scale));
    while (nw * nh < 655360) { nw += 64; nh += 64; }
    return nw + 'x' + nh;
  }

  function blobToDataUrl(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(new Error('图片读取失败')); };
      reader.readAsDataURL(blob);
    });
  }

  async function uploadRefineSource(url, width, height, name) {
    var dataUrl = url;
    if (url.indexOf('data:') !== 0) {
      var fetched = await fetch(url);
      if (!fetched.ok) throw cloudError('二次编辑原图读取失败', 'asset_read_failed');
      dataUrl = await blobToDataUrl(await fetched.blob());
    }
    var res = await apiFetch('/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dataUrl: dataUrl,
        name: name || 'refine-source.jpg',
        w: width || refine.w,
        h: height || refine.h,
      }),
    });
    var saved = await res.json().catch(function () { return null; });
    if (!res.ok || !saved || !saved.id) throw cloudError((saved && saved.error) || '二次编辑原图上传失败', 'asset_upload_failed');
    return saved.id;
  }

  async function refineDataUrl(url) {
    if (url.indexOf('data:') === 0) return url;
    var fetched = await fetch(url);
    if (!fetched.ok) throw cloudError('二次编辑原图读取失败', 'asset_read_failed');
    return blobToDataUrl(await fetched.blob());
  }

  // Mirror of plugin/lib/mask.js: browser code cannot import the host Node module
  // and there is no build step. Keep these two functions in sync with the library.
  function maskBoundsFromAlpha(alpha, width, height) {
    var w = Math.floor(Number(width) || 0);
    var h = Math.floor(Number(height) || 0);
    if (!alpha || w <= 0 || h <= 0 || alpha.length < w * h) return null;
    var minX = w, minY = h, maxX = -1, maxY = -1;
    for (var y = 0; y < h; y++) {
      var row = y * w;
      for (var x = 0; x < w; x++) {
        if (alpha[row + x] > 0) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) return null;
    return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
  }

  function maskNormalizeBounds(bounds, width, height) {
    var w = Number(width) || 0;
    var h = Number(height) || 0;
    if (!bounds || w <= 0 || h <= 0) return { x: 0, y: 0, w: 0, h: 0 };
    return { x: bounds.x / w, y: bounds.y / h, w: bounds.w / w, h: bounds.h / h };
  }

  // MIRROR:regionmath:start — 与 plugin/lib/mask.js + plugin/lib/composite.js 同步。
  // 浏览器不能 import Host 模块，也没有构建步骤；plugin/tests/composite.test.mjs
  // 会抽出这段代码、用同一批输入与 lib 对比，防止两份实现漂移。
  var MASK_DISPLAY_ALPHA = 115;
  var REGION_DIAG = Math.SQRT2;

  function clampBounds(bounds, width, height) {
    var w = Math.max(0, Number(width) || 0);
    var h = Math.max(0, Number(height) || 0);
    if (!bounds) return { x: 0, y: 0, w: 0, h: 0 };
    var x = Math.min(Math.max(0, Number(bounds.x) || 0), w);
    var y = Math.min(Math.max(0, Number(bounds.y) || 0), h);
    var bw = Math.min(Math.max(0, Number(bounds.w) || 0), w - x);
    var bh = Math.min(Math.max(0, Number(bounds.h) || 0), h - y);
    return { x: x, y: y, w: bw, h: bh };
  }

  function expandBounds(bounds, pad, width, height) {
    if (!bounds) return { x: 0, y: 0, w: 0, h: 0 };
    var p = Math.max(0, Number(pad) || 0);
    return clampBounds(
      {
        x: (Number(bounds.x) || 0) - p,
        y: (Number(bounds.y) || 0) - p,
        w: (Number(bounds.w) || 0) + p * 2,
        h: (Number(bounds.h) || 0) + p * 2,
      },
      width,
      height,
    );
  }

  function maskPadding(width, height) {
    var longest = Math.max(Math.abs(Number(width) || 0), Math.abs(Number(height) || 0));
    if (!longest) return 16;
    return Math.max(16, Math.min(96, Math.round(longest * 0.12)));
  }

  function ensureAspect(bounds, width, height, minAspect) {
    var box = clampBounds(bounds, width, height);
    if (box.w <= 0 || box.h <= 0) return box;
    var lo = Math.max(0.02, Math.min(1, Number(minAspect) || 1 / 3));
    var hi = 1 / lo;
    var x = box.x;
    var y = box.y;
    var w = box.w;
    var h = box.h;
    var ratio = w / h;
    if (ratio > hi) {
      var nh = Math.min(height, Math.ceil(w / hi));
      y = Math.max(0, Math.round(y - (nh - h) / 2));
      h = nh;
    } else if (ratio < lo) {
      var nw = Math.min(width, Math.ceil(h * lo));
      x = Math.max(0, Math.round(x - (nw - w) / 2));
      w = nw;
    }
    return clampBounds({ x: x, y: y, w: w, h: h }, width, height);
  }

  function regionBox(bounds, width, height) {
    var w = Math.max(0, Math.floor(Number(width) || 0));
    var h = Math.max(0, Math.floor(Number(height) || 0));
    if (!bounds || w <= 0 || h <= 0) return { x: 0, y: 0, w: 0, h: 0 };
    var px = {
      x: Math.round((Number(bounds.x) || 0) * w),
      y: Math.round((Number(bounds.y) || 0) * h),
      w: Math.round((Number(bounds.w) || 0) * w),
      h: Math.round((Number(bounds.h) || 0) * h),
    };
    var padded = expandBounds(px, maskPadding(px.w, px.h), w, h);
    return ensureAspect(padded, w, h, 1 / 3);
  }

  function normalizeMaskAlpha(alpha, length) {
    var n = Math.max(0, Math.floor(Number(length) || (alpha ? alpha.length : 0)));
    if (!alpha || n <= 0) return new Uint8Array(0);
    var out = new Uint8Array(n);
    for (var i = 0; i < n; i++) {
      var v = Math.max(0, Math.min(255, Math.round(Number(alpha[i]) || 0)));
      out[i] = v === 0 ? 0 : Math.max(1, Math.min(255, Math.round((v * 255) / MASK_DISPLAY_ALPHA)));
    }
    return out;
  }

  function inwardFeatherAlpha(maskAlpha, width, height, feather) {
    var w = Math.max(0, Math.floor(Number(width) || 0));
    var h = Math.max(0, Math.floor(Number(height) || 0));
    if (!maskAlpha || w <= 0 || h <= 0 || maskAlpha.length < w * h) return new Uint8Array(0);
    var ramp = Math.max(1, Math.round(Number(feather) || 1));
    var BIG = 1e6;
    var dist = new Float32Array(w * h);
    var i;
    for (i = 0; i < dist.length; i++) dist[i] = maskAlpha[i] > 0 ? BIG : 0;
    for (var y = 0; y < h; y++) {
      var row = y * w;
      for (var x = 0; x < w; x++) {
        i = row + x;
        if (dist[i] === 0) continue;
        var best = dist[i];
        if (x > 0) best = Math.min(best, dist[i - 1] + 1);
        if (y > 0) {
          best = Math.min(best, dist[i - w] + 1);
          if (x > 0) best = Math.min(best, dist[i - w - 1] + REGION_DIAG);
          if (x < w - 1) best = Math.min(best, dist[i - w + 1] + REGION_DIAG);
        }
        dist[i] = best;
      }
    }
    for (var yy = h - 1; yy >= 0; yy--) {
      var row2 = yy * w;
      for (var xx = w - 1; xx >= 0; xx--) {
        i = row2 + xx;
        if (dist[i] === 0) continue;
        var best2 = dist[i];
        if (xx < w - 1) best2 = Math.min(best2, dist[i + 1] + 1);
        if (yy < h - 1) {
          best2 = Math.min(best2, dist[i + w] + 1);
          if (xx < w - 1) best2 = Math.min(best2, dist[i + w + 1] + REGION_DIAG);
          if (xx > 0) best2 = Math.min(best2, dist[i + w - 1] + REGION_DIAG);
        }
        dist[i] = best2;
      }
    }
    var out = new Uint8Array(w * h);
    for (i = 0; i < out.length; i++) {
      var base = maskAlpha[i];
      if (!base) continue;
      var t = Math.min(1, dist[i] / ramp);
      var smooth = t * t * (3 - 2 * t);
      out[i] = Math.max(1, Math.round(base * smooth));
    }
    return out;
  }

  function compositeBox(input) {
    var original = input.original;
    var edited = input.edited;
    var maskAlpha = input.maskAlpha;
    var w = Math.max(0, Math.floor(Number(input.imageWidth) || 0));
    var h = Math.max(0, Math.floor(Number(input.imageHeight) || 0));
    if (!original || w <= 0 || h <= 0 || original.length < w * h * 4) {
      throw new Error('compositeBox: 原图 RGBA 数据不足');
    }
    var out = new Uint8ClampedArray(original.length);
    out.set(original);
    var b = clampBounds(input.box, w, h);
    if (b.w <= 0 || b.h <= 0) return { data: out, box: b, changedPixels: 0 };
    if (!edited || edited.length < b.w * b.h * 4) throw new Error('compositeBox: 编辑结果 RGBA 数据不足');
    if (!maskAlpha || maskAlpha.length < b.w * b.h) throw new Error('compositeBox: 蒙版数据不足');
    var alpha = inwardFeatherAlpha(maskAlpha, b.w, b.h, input.feather);
    var changed = 0;
    for (var y = 0; y < b.h; y++) {
      var outRow = (b.y + y) * w;
      var srcRow = y * b.w;
      for (var x = 0; x < b.w; x++) {
        var mi = srcRow + x;
        var a = alpha[mi];
        if (!a) continue;
        var di = (outRow + b.x + x) * 4;
        var si = mi * 4;
        var f = a / 255;
        out[di] = original[di] + (edited[si] - original[di]) * f;
        out[di + 1] = original[di + 1] + (edited[si + 1] - original[di + 1]) * f;
        out[di + 2] = original[di + 2] + (edited[si + 2] - original[di + 2]) * f;
        out[di + 3] = original[di + 3] + (edited[si + 3] - original[di + 3]) * f;
        changed++;
      }
    }
    return { data: out, box: b, changedPixels: changed };
  }
  // MIRROR:regionmath:end

  var REGION_CROP_PROMPT = '这是从原图裁出的局部区域。保持主体数量、身份、面部、姿态、服装轮廓、透视、光线方向和可见文字不变；只修改指定局部，不改变裁切，不新增主体：';

  function regionFeatherPx(box) {
    return Math.max(1, Math.min(12, Math.round(Math.min(box.w, box.h) / 8)));
  }

  function regionCanvas(width, height, readback) {
    var canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    return {
      canvas: canvas,
      ctx: canvas.getContext('2d', readback ? { willReadFrequently: true } : undefined),
    };
  }

  function loadRegionImage(src) {
    return new Promise(function (resolve, reject) {
      var image = new Image();
      image.onload = function () { resolve(image); };
      image.onerror = function () { reject(new Error('区域编辑：图片读取失败')); };
      image.src = src;
    });
  }

  // 把原图与蒙版裁到同一个像素框；裁剪框在蒙版 bbox 基础上加 12% 上下文（16–96px）。
  async function cropForRefineMask(sourceUrl) {
    var bbox = refine.mask.bbox;
    if (!refine.mask.painted || !bbox) throw new Error('蒙版为空，无法裁剪区域');
    var image = await loadRegionImage(sourceUrl);
    var w = image.naturalWidth || image.width;
    var h = image.naturalHeight || image.height;
    if (!w || !h) throw new Error('区域编辑：原图尺寸无效');
    var box = regionBox(bbox, w, h);
    if (box.w < 1 || box.h < 1) throw new Error('区域编辑：蒙版区域太小');
    var crop = regionCanvas(box.w, box.h);
    crop.ctx.drawImage(image, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
    var maskImage = await loadRegionImage(refine.mask.dataUrl);
    var mw = maskImage.naturalWidth || maskImage.width;
    var mh = maskImage.naturalHeight || maskImage.height;
    if (!mw || !mh) throw new Error('区域编辑：蒙版读取失败');
    var maskCrop = regionCanvas(box.w, box.h, true);
    maskCrop.ctx.drawImage(
      maskImage,
      (box.x * mw) / w, (box.y * mh) / h, (box.w * mw) / w, (box.h * mh) / h,
      0, 0, box.w, box.h,
    );
    var overlay = maskCrop.ctx.getImageData(0, 0, box.w, box.h).data;
    var alphaRaw = new Uint8Array(box.w * box.h);
    for (var i = 0; i < alphaRaw.length; i++) alphaRaw[i] = overlay[i * 4 + 3];
    return {
      cropDataUrl: crop.canvas.toDataURL('image/jpeg', 0.95),
      cropMaskDataUrl: maskCrop.canvas.toDataURL('image/png'),
      bboxPx: box,
      cropW: box.w,
      cropH: box.h,
      maskAlpha: normalizeMaskAlpha(alphaRaw, alphaRaw.length),
    };
  }

  // 把 provider 返回的裁剪图按蒙版羽化合成回原图；蒙版外像素保持原图字节。
  async function compositeRefineResult(sourceUrl, resultUrl, crop) {
    var image = await loadRegionImage(sourceUrl);
    var w = image.naturalWidth || image.width;
    var h = image.naturalHeight || image.height;
    if (!w || !h) throw new Error('区域编辑：原图尺寸无效');
    var box = crop.bboxPx;
    var base = regionCanvas(w, h, true);
    base.ctx.drawImage(image, 0, 0, w, h);
    var original = base.ctx.getImageData(0, 0, w, h);
    var editedImage = await loadRegionImage(resultUrl);
    var editedCanvas = regionCanvas(box.w, box.h, true);
    editedCanvas.ctx.drawImage(editedImage, 0, 0, box.w, box.h);
    var edited = editedCanvas.ctx.getImageData(0, 0, box.w, box.h);
    var composed = compositeBox({
      original: original.data,
      edited: edited.data,
      maskAlpha: crop.maskAlpha,
      imageWidth: w,
      imageHeight: h,
      box: box,
      feather: regionFeatherPx(box),
    });
    base.ctx.putImageData(new ImageData(composed.data, w, h), 0, 0);
    var keepAlpha = /^data:image\/png/i.test(sourceUrl) || /\.png(\?|$)/i.test(sourceUrl);
    return {
      dataUrl: base.canvas.toDataURL(keepAlpha ? 'image/png' : 'image/jpeg', keepAlpha ? undefined : 0.95),
      w: w,
      h: h,
      changedPixels: composed.changedPixels,
    };
  }

  async function uploadComposite(composed, prompt) {
    var res = await apiFetch('/composite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dataUrl: composed.dataUrl,
        w: composed.w,
        h: composed.h,
        prompt: prompt,
        parentId: refine.parentId || null,
      }),
    });
    var saved = await res.json().catch(function () { return null; });
    if (!res.ok || !saved || !saved.id || !saved.url) {
      throw new Error((saved && saved.error) || '区域合成结果保存失败');
    }
    return saved;
  }

  async function compositeAndUpload(sourceUrl, result, crop, prompt) {
    $('#refineStatus').textContent = '合成回原图…';
    var composed = await compositeRefineResult(sourceUrl, result.url, crop);
    var saved = await uploadComposite(composed, prompt);
    refine.parentId = saved.id;
    return { id: saved.id, url: saved.url, w: saved.w, h: saved.h };
  }

  // 区域裁剪后按裁剪比例请求尺寸；provider 只接受 1:3–3:1，极端细长图会被收窄。
  function regionTargetSize(width, height) {
    var size = refineTargetSize(width, height);
    var match = /^(\d+)x(\d+)$/.exec(size);
    if (!match) return size;
    var nw = Number(match[1]);
    var nh = Number(match[2]);
    var ratio = Math.max(nw, nh) / Math.max(1, Math.min(nw, nh));
    if (ratio <= 3) return size;
    if (nw > nh) nh = Math.max(128, Math.round(nw / 3));
    else nw = Math.max(128, Math.round(nh / 3));
    return nw + 'x' + nh;
  }

  function refineMaskContext() {
    var canvas = $('#refineMaskCanvas');
    if (!canvas) return null;
    return canvas.getContext('2d', { willReadFrequently: true });
  }

  function resetRefineMask() {
    var canvas = $('#refineMaskCanvas');
    var ctx = refineMaskContext();
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    refine.mask = { dataUrl: '', bbox: null, painted: false };
    refine.brush = { size: 32, mode: 'paint' };
    var size = $('#refineBrushSize');
    if (size) size.value = '32';
    var out = $('#refineBrushSizeValue');
    if (out) out.textContent = '32 px';
    $$('#refineBrushMode button').forEach(function (b) {
      b.classList.toggle('on', b.dataset.brushMode === 'paint');
    });
    updateRefineMaskState();
  }

  function syncRefineCanvas() {
    var img = $('#refineSource');
    var canvas = $('#refineMaskCanvas');
    if (!img || !canvas) return;
    var nw = img.naturalWidth || 0;
    var nh = img.naturalHeight || 0;
    if (!nw || !nh) return;
    var ratio = Math.min(1, 4096 / Math.max(nw, nh));
    var cw = Math.max(1, Math.round(nw * ratio));
    var ch = Math.max(1, Math.round(nh * ratio));
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }
    resetRefineMask();
  }

  function showEmptyRefineMask(label) {
    if (!label) return;
    label.textContent = '蒙版：空';
    label.dataset.maskPainted = '0';
    delete label.dataset.maskBbox;
    delete label.dataset.maskDataUrlLength;
  }

  function updateRefineMaskState() {
    var canvas = $('#refineMaskCanvas');
    var ctx = refineMaskContext();
    var label = $('#refineMaskState');
    if (!canvas || !ctx || !canvas.width || !canvas.height) {
      refine.mask = { dataUrl: '', bbox: null, painted: false };
      showEmptyRefineMask(label);
      return;
    }
    var data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    var alpha = new Uint8Array(canvas.width * canvas.height);
    var filled = 0;
    for (var i = 0; i < alpha.length; i++) {
      var a = data[i * 4 + 3];
      alpha[i] = a;
      if (a > 0) filled++;
    }
    var bounds = maskBoundsFromAlpha(alpha, canvas.width, canvas.height);
    if (!bounds) {
      refine.mask = { dataUrl: '', bbox: null, painted: false };
      showEmptyRefineMask(label);
      return;
    }
    var bbox = maskNormalizeBounds(bounds, canvas.width, canvas.height);
    refine.mask = { dataUrl: canvas.toDataURL('image/png'), bbox: bbox, painted: true };
    if (label) {
      var pct = (filled / alpha.length) * 100;
      label.textContent = '蒙版：已选 ' + pct.toFixed(1) + '% · 归一化 bbox ' +
        'x ' + bbox.x.toFixed(3) + ' · y ' + bbox.y.toFixed(3) +
        ' · w ' + bbox.w.toFixed(3) + ' · h ' + bbox.h.toFixed(3);
      label.dataset.maskPainted = '1';
      label.dataset.maskBbox = JSON.stringify(bbox);
      label.dataset.maskDataUrlLength = String(refine.mask.dataUrl.length);
    }
  }

  function refineBrushWidth(canvas) {
    var rect = canvas.getBoundingClientRect();
    var scale = rect.width > 0 ? canvas.width / rect.width : 1;
    return Math.max(1, refine.brush.size * scale);
  }

  function paintRefinePoint(x, y) {
    var canvas = $('#refineMaskCanvas');
    var ctx = refineMaskContext();
    if (!canvas || !ctx) return;
    var erase = refine.brush.mode === 'erase';
    ctx.save();
    ctx.globalCompositeOperation = erase ? 'destination-out' : 'source-over';
    ctx.fillStyle = erase ? 'rgba(0,0,0,1)' : 'rgba(210,59,46,.45)';
    ctx.beginPath();
    ctx.arc(x, y, refineBrushWidth(canvas) / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function strokeRefineSegment(x0, y0, x1, y1) {
    var canvas = $('#refineMaskCanvas');
    var ctx = refineMaskContext();
    if (!canvas || !ctx) return;
    var erase = refine.brush.mode === 'erase';
    ctx.save();
    ctx.globalCompositeOperation = erase ? 'destination-out' : 'source-over';
    ctx.strokeStyle = erase ? 'rgba(0,0,0,1)' : 'rgba(210,59,46,.45)';
    ctx.lineWidth = refineBrushWidth(canvas);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.restore();
  }

  function clearRefineMask() {
    var canvas = $('#refineMaskCanvas');
    var ctx = refineMaskContext();
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    updateRefineMaskState();
  }

  function invertRefineMask() {
    var canvas = $('#refineMaskCanvas');
    var ctx = refineMaskContext();
    if (!canvas || !ctx || !canvas.width || !canvas.height) return;
    var img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    var d = img.data;
    for (var i = 0; i < d.length; i += 4) {
      d[i] = 210;
      d[i + 1] = 59;
      d[i + 2] = 46;
      // Keep the overlay semi-transparent: invert into the same ~45% display alpha.
      d[i + 3] = Math.round((1 - d[i + 3] / 255) * 115);
    }
    ctx.putImageData(img, 0, 0);
    updateRefineMaskState();
  }

  function syncRefineCost() {
    var size = refineTargetSize(refine.w, refine.h);
    var seedream = refine.model === 'seedream';
    var cost = seedream ? 0.28 : (Number(cloudUnitPrice()) || 0);
    $('#refineCost').textContent = (seedream ? 'Seedream 5.5' : 'MiniMax H3') + ' · ' + size + ' · 约 ¥' + cost.toFixed(2);
    $$('#refineModel button').forEach(function (b) { b.classList.toggle('on', b.dataset.refineModel === refine.model); });
    var layerOpt = $('#refineLayers');
    if (layerOpt) {
      layerOpt.disabled = !seedream;
      if (!seedream) layerOpt.checked = false;
    }
    var note = $('#refineNote');
    if (note) note.textContent = seedream ? 'Seedream 5.5 直接基于当前图片和提示词编辑。' : 'MiniMax 图片编辑会强制执行一次 Prompt 增强；这里输入你的原始编辑要求。';
  }

  function renderRefineThread() {
    var box = $('#refineThread');
    if (!box) return;
    box.hidden = !refine.thread.length;
    box.innerHTML = refine.thread.map(function (m) {
      if (m.role === 'user') return '<div class="rturn user"><span class="bubble">' + escapeHTML(m.text) + '</span></div>';
      return '<div class="rturn"><img src="' + escapeHTML(m.url) + '" alt="编辑结果"><span class="bubble">已按这一轮要求编辑。可继续输入。</span></div>';
    }).join('');
    box.scrollTop = box.scrollHeight;
  }

  function finishRefineResult(result) {
    refine.result = { url: result.url, w: result.w, h: result.h };
    refine.url = result.url;
    refine.w = result.w;
    refine.h = result.h;
    $('#refineSource').src = result.url;
    resetRefineMask();
    $('#refineMeta').textContent = '二次编辑 · ' + result.w + ' × ' + result.h;
    $('#refineStatus').textContent = '完成 · 已加入最近生成';
    $('#refineStatus').className = 'refine-status';
    refine.thread.push({ role: 'assistant', url: result.url });
    renderRefineThread();
    $('#refineStart').hidden = false;
    $('#refineStart').disabled = false;
    $('#refineStart').textContent = '继续编辑';
    $('#refinePrompt').value = '';
    $('#refineView').hidden = false;
    $('#refineDownload').hidden = false;
    loadAllHistory(true);
    toast('这一轮编辑完成');
  }

  function openRefine() {
    if (!bigState || !bigState.url) return;
    var sourceStyle = bigState.styleId;
    var sourceParentId = bigState.hostId || null;
    var source = { url: bigState.url, title: bigState.title || '生成图片', w: bigState.w || 0, h: bigState.h || 0 };
    closeResultBig();
    var sourceModel = sourceStyle === 'seedream' ? 'seedream' : 'minimax';
    refine = { url: source.url, title: source.title, w: source.w, h: source.h, model: sourceModel, parentId: sourceParentId, busy: false, result: null, thread: [], mask: { dataUrl: '', bbox: null, painted: false }, brush: { size: 32, mode: 'paint' } };
    $('#refineMeta').textContent = (refine.title || '生成图片') + ' · ' + (refine.w && refine.h ? refine.w + ' × ' + refine.h : '');
    $('#refineSource').src = refine.url;
    resetRefineMask();
    requestAnimationFrame(syncRefineCanvas);
    $('#refinePrompt').value = REFINE_PROMPT;
    $('#refineLayerGrid').hidden = true;
    $('#refineLayerGrid').innerHTML = '';
    $('#refineLayerZip').hidden = true;
    $('#refineRegion').value = '';
    $('#refineLayers').checked = false;
    renderRefineThread();
    $('#refineStatus').textContent = '';
    $('#refineStatus').className = 'refine-status';
    $('#refineView').hidden = true;
    $('#refineDownload').hidden = true;
    $('#refineAgain').hidden = true;
    $('#refineStart').hidden = false;
    $('#refineStart').disabled = false;
    $('#refineStart').textContent = '开始编辑';
    syncRefineCost();
    $('#refineLayer').inert = false;
    $('#refineLayer').classList.add('open');
    $('#refineLayer').setAttribute('aria-hidden', 'false');
    $('#refinePrompt').focus();
  }

  function closeRefine() {
    var layer = $('#refineLayer');
    if (!layer) return;
    layer.classList.remove('open');
    layer.inert = true;
    layer.setAttribute('aria-hidden', 'true');
    $('#refineSource').removeAttribute('src');
  }

  async function downloadLayerZip() {
    var imgs = Array.prototype.slice.call(document.querySelectorAll('#refineLayerGrid img'));
    if (!imgs.length) return;
    try {
      var files = [];
      for (var i = 0; i < imgs.length; i++) {
        var res = await fetch(imgs[i].src);
        var blob = await res.blob();
        var dataUrl = await new Promise(function (resolve) {
          var r = new FileReader(); r.onload = function () { resolve(r.result); }; r.readAsDataURL(blob);
        });
        files.push({ name: 'layer-' + String(i + 1).padStart(2, '0') + '.png', dataUrl: dataUrl });
      }
      var zr = await apiFetch('/export', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: files, manifest: { kind: 'seedream-layers', count: files.length, createdAt: new Date().toISOString() } }),
      });
      if (!zr.ok) throw new Error('打包失败');
      var zblob = await zr.blob();
      var url = URL.createObjectURL(zblob);
      var a = document.createElement('a'); a.href = url; a.download = 'seedream-layers-' + Date.now() + '.zip'; a.click();
      setTimeout(function () { URL.revokeObjectURL(url); }, 3000);
      toast('图层 ZIP 已下载');
    } catch (err) { toast(err.message || '图层打包失败'); }
  }

  async function startRefine() {
    if (refine.busy) return;
    var seedream = refine.model === 'seedream';
    if (seedream ? !state.settings.hasSeedreamKey : !cloudReady()) {
      toast(seedream ? '先在设置里保存 Seedream Key' : '先在设置里保存 API Key 启用云端');
      openSettings();
      return;
    }
    var prompt = $('#refinePrompt').value.trim();
    if (!prompt) { toast('填写二次编辑要求'); $('#refinePrompt').focus(); return; }
    var region = $('#refineRegion').value.trim();
    var layerMode = seedream && $('#refineLayers').checked;
    if (layerMode) {
      refine.busy = true;
      $('#refineStatus').textContent = '拆分图层…';
      try {
        var src = await refineDataUrl(refine.url);
        var lr = await apiFetch('/seedream/decompose', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageDataUrl: src, maxImages: Number($('#refineLayerMax').value) || 30 }),
        });
        var ld = await lr.json().catch(function () { return {}; });
        if (!lr.ok) throw cloudError(ld.error || '图层拆分失败', ld.code);
        $('#refineLayerGrid').hidden = false;
        $('#refineLayerZip').hidden = false;
        $('#refineLayerGrid').innerHTML = ld.images.map(function (im) {
          var ocr = im.textRecognition && im.textRecognition.text ? ' · OCR: ' + im.textRecognition.text.slice(0, 40) : '';
          return '<img src="' + escapeHTML(im.url) + '" alt="' + escapeHTML(im.name || '图层') + '" title="' + escapeHTML((im.name || '图层') + ocr) + '" data-layer-url="' + escapeHTML(im.url) + '">';
        }).join('');
        $('#refineStatus').textContent = '已拆出 ' + ld.images.length + ' 层';
        toast('图层拆分完成');
      } catch (err) {
        $('#refineStatus').textContent = err.message || '图层拆分失败';
        $('#refineStatus').className = 'refine-status error';
      } finally {
        refine.busy = false;
      }
      return;
    }
    if (region) prompt = '只修改指定位置：' + region + '；其余区域保持像素不变。' + prompt;
    var masked = refine.mask.painted === true && !!refine.mask.bbox;
    refine.busy = true;
    var startBtn = $('#refineStart');
    startBtn.disabled = true;
    startBtn.textContent = '生成中…';
    $('#refineStatus').textContent = masked ? '裁剪蒙版区域…' : '读取原图…';
    $('#refineStatus').className = 'refine-status';
    var regionCrop = null;
    try {
      var sourceData;
      var size;
      if (masked) {
        regionCrop = await cropForRefineMask(refine.url);
        prompt = REGION_CROP_PROMPT + prompt;
        size = regionTargetSize(regionCrop.cropW, regionCrop.cropH);
        sourceData = regionCrop.cropDataUrl;
      } else {
        sourceData = await refineDataUrl(refine.url);
        size = refineTargetSize(refine.w, refine.h);
      }
      if (seedream) prompt = '参考图1是底图。' + prompt;
      refine.thread.push({ role: 'user', text: prompt });
      renderRefineThread();
      if (seedream) {
        var sr = await apiFetch('/seedream/edit', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: prompt, size: size, imageDataUrl: sourceData, model: 'doubao-seedream-5-5-261028' }),
        });
        var sd = await sr.json().catch(function () { return {}; });
        if (!sr.ok) throw cloudError(sd.error || ('Seedream 请求失败 ' + sr.status), sd.code);
        var sdResult = sd;
        if (regionCrop) sdResult = await compositeAndUpload(refine.url, sd, regionCrop, prompt);
        finishRefineResult(sdResult);
        return;
      }
      var sourceW = regionCrop ? regionCrop.cropW : refine.w;
      var sourceH = regionCrop ? regionCrop.cropH : refine.h;
      var assetId = await uploadRefineSource(sourceData, sourceW, sourceH, regionCrop ? 'region-crop.jpg' : 'refine-source.jpg');
      $('#refineStatus').textContent = '上传完成，提交作业…';
      var body = {
        assetId: assetId,
        styleId: 'h3-refine',
        prompt: prompt,
        size: size,
        params: {},
      };
      var res = await fetch(API + '/cloud/jobs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      var data = await res.json().catch(function () { return {}; });
      if (res.status === 402 && data.code === 'budget_exceeded') {
        var msg = '今日云端预算不足。\n预计 ¥' + Number(data.estimatedYuan || 0).toFixed(2) +
          ' · 已用 ¥' + Number(data.spentTodayYuan || 0).toFixed(2) +
          ' · 预算 ¥' + Number(data.budgetYuan || 0).toFixed(2) +
          '。\n\n仍要继续二次优化吗？';
        if (!window.confirm(msg)) throw cloudError('已取消二次优化', 'budget_cancelled');
        body.allowOverBudget = true;
        res = await fetch(API + '/cloud/jobs', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        });
        data = await res.json().catch(function () { return {}; });
      }
      if (!res.ok) throw cloudError(data.error || ('云端请求失败 ' + res.status), data.code);
      $('#refineStatus').textContent = '生成中…';
      var job = await waitCloudJob(data.id);
      if (job.status !== 'succeeded' || !job.output) {
        throw cloudError((job.error && job.error.message) || ('云端作业 ' + job.status), (job.error && job.error.code) || job.status);
      }
      var output = job.output;
      if (regionCrop) output = await compositeAndUpload(refine.url, job.output, regionCrop, prompt);
      finishRefineResult(output);
    } catch (err) {
      $('#refineStatus').textContent = err.message || '二次优化失败';
      $('#refineStatus').className = 'refine-status error';
      startBtn.disabled = false;
      startBtn.textContent = '重试编辑';
    } finally {
      refine.busy = false;
      if (!refine.result) startBtn.disabled = false;
    }
  }

    /* ————— 示例放大 ————— */
  var previewReturnFocus = null;
  var previewRenderToken = 0;
  var previewIds = [];
  var previewIndex = 0;

  function previewCardSrc(id) {
    var s = styleById(id);
    return (s && (s.preview || state.thumbs[id])) || '';
  }

  function previewFullSrc(id) {
    var s = styleById(id);
    if (s && s.renderer === 'model') return API + '/style-preview/' + id + '-full.jpg';
    return previewCardSrc(id);
  }

  function renderStylePreview() {
    var id = previewIds[previewIndex];
    var s = styleById(id);
    if (!s) return;
    var img = $('#previewImg');
    img.onerror = function () {
      var fallback = previewCardSrc(id);
      if (fallback) { this.onerror = null; this.src = fallback; }
    };
    img.src = previewFullSrc(id);
    img.alt = s.name + ' 示例';
    var inspiration = ['h3-sacred', 'h3-mystic', 'h3-observer', 'h3-west1960', 'h3-blackgold', 'h3-ramayana', 'h3-cosmic'].indexOf(id) >= 0;
    $('#previewTitle').textContent = s.name;
    $('#previewMeta').textContent = (inspiration ? '参考示例' : s.renderer === 'model' ? '官方示例' : '当前预览') + ' · ' + (previewIndex + 1) + ' / ' + previewIds.length;
    if (s.renderer !== 'model') {
      var token = ++previewRenderToken;
      var w = 1600;
      var h = Math.round(w * frameRatio());
      renderStyleAsync(id, w, h).then(function (c) {
        if (!c || token !== previewRenderToken || previewIds[previewIndex] !== id) return;
        img.onerror = null;
        img.src = c.toDataURL('image/jpeg', 0.92);
      }).catch(function () {});
    }
    $('#previewPrev').disabled = previewIndex <= 0;
    $('#previewNext').disabled = previewIndex >= previewIds.length - 1;
  }

  function openStylePreview(id) {
    var list = filteredStyles();
    previewIds = list.map(function (s) { return s.id; });
    previewIndex = previewIds.indexOf(id);
    if (previewIndex < 0) { previewIds.unshift(id); previewIndex = 0; }
    var layer = $('#previewLayer');
    if (!layer) return;
    previewReturnFocus = document.activeElement;
    layer.inert = false;
    layer.classList.add('open');
    layer.setAttribute('aria-hidden', 'false');
    renderStylePreview();
    $('#previewClose').focus();
  }

  function closeStylePreview() {
    var layer = $('#previewLayer');
    if (!layer) return;
    layer.classList.remove('open');
    layer.setAttribute('aria-hidden', 'true');
    layer.inert = true;
    if (previewReturnFocus && previewReturnFocus.isConnected) previewReturnFocus.focus();
    previewReturnFocus = null;
  }

  function moveStylePreview(delta) {
    var next = previewIndex + delta;
    if (next < 0 || next >= previewIds.length) return;
    previewIndex = next;
    renderStylePreview();
  }

  /* ————— 批量矩阵 ————— */
  /* ————— 队列 ————— */
  // 只在抽屉打开时轮询；关闭即停，工作台其他位置不做后台轮询。
  var QUEUE_POLL_MS = 2000;
  var QUEUE_LIMIT = 100;
  var QUEUE_ACTIVE = { queued: true, preparing: true, running: true, submitting: true, generating: true, fetching_asset: true, saving_original: true, splitting_layers: true, saving_layers: true };
  var QUEUE_LABELS = {
    queued: '排队中',
    preparing: '准备中',
    running: '生成中',
    succeeded: '已完成',
    failed: '失败',
    canceled: '已取消',
    unknown: '状态不明',
    submitting: '提交任务', generating: '生成中', fetching_asset: '取回图片', saving_original: '保存原图', splitting_layers: '拆分图层', saving_layers: '保存图层', partial_success: '部分完成', cancelled: '已取消'
  };
  var queueLayerEl = $('#queueLayer');

  function queueJobActive(job) {
    return !!(job && QUEUE_ACTIVE[job.status]);
  }
  function queueActiveCount() {
    var n = 0;
    for (var i = 0; i < queueUi.jobs.length; i++) if (queueJobActive(queueUi.jobs[i])) n += 1;
    return n;
  }
  function queueJobById(id) {
    for (var i = 0; i < queueUi.jobs.length; i++) if (queueUi.jobs[i].id === id) return queueUi.jobs[i];
    return null;
  }
  function queueStatusLabel(status) {
    return QUEUE_LABELS[status] || status || '未知';
  }
  function queueProviderLabel(job) {
    return job && job.provider === 'seedream' ? 'Seedream' : 'H3';
  }
  function queueStyleLabel(job) {
    if (!job) return '';
    if (job.snapshot?.styleId) return styleById(job.snapshot.styleId)?.name || job.snapshot.styleId;
    if (job.provider === 'seedream') return '';
    var style = styleById(job.styleId);
    if (style && style.name) return style.name;
    if (job.styleId === 'h3-text') return '文生图';
    return job.styleId || '';
  }
  function queueModelLabel(job) {
    if (!job || job.provider !== 'seedream') return '';
    var model = String(job.model || '');
    if (model.indexOf('5-5') >= 0) return 'Seedream 5.5';
    if (model.indexOf('4-5') >= 0) return 'Seedream 4.5';
    if (model.indexOf('4-0') >= 0) return 'Seedream 4.0';
    return model || 'Seedream';
  }
  function queueCostLabel(job) {
    var raw = job && job.output ? job.output.costYuan : null;
    if (raw === null || raw === undefined) raw = job && job.usage ? job.usage.costYuan : null;
    var value = Number(raw);
    if (raw === null || raw === undefined || !Number.isFinite(value) || value <= 0) return '';
    return '¥' + value.toFixed(2);
  }
  function queueTimeLabel(at) {
    var date = new Date(at);
    if (isNaN(date.getTime())) return '--:--';
    try {
      var now = new Date();
      var sameDay = date.toDateString() === now.toDateString();
      return sameDay
        ? date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
        : date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch (err) { return '--:--'; }
  }
  function queueExcerpt(text, max) {
    var value = String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
    if (!value) return '';
    return value.length > max ? value.slice(0, max) + '…' : value;
  }
  function mergeQueueJobs(cloudJobs, seedreamJobs, v2Jobs) {
    var seen = {};
    var rows = [];
    (cloudJobs || []).concat(seedreamJobs || [], v2Jobs || []).forEach(function (job) {
      if (!job || typeof job.id !== 'string' || !job.id || seen[job.id]) return;
      seen[job.id] = true;
      rows.push(job);
    });
    rows.sort(function (a, b) {
      var byTime = String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
      if (byTime !== 0) return byTime;
      return String(b.id || '').localeCompare(String(a.id || ''));
    });
    return rows;
  }
  function queueSignature(jobs) {
    return (jobs || []).map(function (job) {
      return [
        job.id,
        job.status,
        job.updatedAt || '',
        job.output && job.output.url ? job.output.url : '',
        job.error && job.error.code ? job.error.code : ''
      ].join(':');
    }).join('|');
  }
  // 后端只返回错误文本；402 的预算明细在 details 里，这里合成一句人话。
  function queueApiError(status, data) {
    var message = data && data.error ? String(data.error) : '';
    if (status === 402 && data && data.code === 'budget_exceeded') {
      return '超出每日预算，需要手动放行（预计 ¥' + Number(data.estimatedYuan || 0).toFixed(2) +
        ' · 已用 ¥' + Number(data.spentTodayYuan || 0).toFixed(2) +
        ' · 预算 ¥' + Number(data.budgetYuan || 0).toFixed(2) + '）';
    }
    if (status === 409) return message || '当前状态不能执行这个操作';
    return message || ('请求失败 ' + status);
  }

  async function loadQueue(options) {
    options = options || {};
    var silent = options.silent === true;
    if (queueUi.loading) {
      if (!silent) queueUi.refreshAgain = true;
      return;
    }
    if (disposed) return;
    var beforeSignature = queueSignature(queueUi.jobs);
    var beforeError = queueUi.error;
    queueUi.loading = true;
    if (!silent) renderQueue();
    var errors = [];
    async function fetchSide(path) {
      try {
        var res = await apiFetch(path, { cache: 'no-store' });
        var data = await res.json().catch(function () { return {}; });
        if (!res.ok) throw new Error(data.error || ('读取队列失败 ' + res.status));
        return Array.isArray(data.jobs) ? data.jobs : [];
      } catch (err) {
        errors.push(err && err.message ? err.message : String(err));
        return [];
      }
    }
    var parts = await Promise.all([
      fetchSide('/cloud/jobs?limit=' + QUEUE_LIMIT),
      fetchSide('/seedream/jobs?limit=' + QUEUE_LIMIT),
      fetchSide('/v2/jobs')
    ]);
    if (disposed) { queueUi.loading = false; return; }
    queueUi.jobs = mergeQueueJobs(parts[0], parts[1], parts[2]);
    queueUi.error = errors.length ? errors.join('；') : '';
    queueUi.loading = false;
    var changed = queueSignature(queueUi.jobs) !== beforeSignature || queueUi.error !== beforeError;
    if (changed || !silent) renderQueue();
    else renderQueueBadge();
    if (queueUi.error && !silent) toast('队列刷新失败：' + queueUi.error);
    if (queueUi.refreshAgain) {
      queueUi.refreshAgain = false;
      loadQueue({ silent: true });
    }
  }

  function queueItemHTML(job) {
    var active = queueJobActive(job);
    var meta = [];
    var styleLabel = queueStyleLabel(job);
    var modelLabel = queueModelLabel(job);
    var costLabel = queueCostLabel(job);
    if (styleLabel) meta.push('<span>' + escapeHTML(styleLabel) + '</span>');
    if (modelLabel) meta.push('<span>' + escapeHTML(modelLabel) + '</span>');
    if (job.size || job.snapshot?.size) meta.push('<span>' + escapeHTML(String(job.size || job.snapshot.size)) + '</span>');
    if (costLabel) meta.push('<span>费用 <b>' + escapeHTML(costLabel) + '</b></span>');
    var prompt = queueExcerpt(job.snapshot?.prompt || job.prompt, 96);
    var errorText = job.error && job.error.message ? queueExcerpt(job.error.message, 160) : '';
    var actions = [];
    if (active && (!job.snapshot || job.status === 'queued')) {
      actions.push('<button type="button" class="queue-action danger" data-queue-cancel="' + escapeHTML(job.id) + '">取消</button>');
    }
    if (job.status === 'failed') {
      if (job.provider === 'minimax') {
        actions.push('<button type="button" class="queue-action" data-queue-retry="' + escapeHTML(job.id) + '">重试</button>');
      } else {
        actions.push('<button type="button" class="queue-action" data-queue-retry="' + escapeHTML(job.id) + '" disabled title="Seedream 作业暂不支持重试：源图数据未持久化">重试</button>');
        actions.push('<span class="queue-blocked">源图未持久化，不能重试</span>');
      }
    }
    return '<article class="queue-item" data-queue-id="' + escapeHTML(job.id) + '">' +
      '<div class="queue-item-head">' +
      '<span class="queue-provider' + (job.provider === 'seedream' ? ' seedream' : '') + '">' + escapeHTML(queueProviderLabel(job)) + '</span>' +
      '<span class="queue-state' + (active ? ' active' : (job.status === 'failed' ? ' failed' : '')) + '">' + escapeHTML(queueStatusLabel(job.status)) + '</span>' +
      '<span class="queue-time">' + escapeHTML(queueTimeLabel(job.createdAt)) + '</span>' +
      '</div>' +
      '<p class="queue-prompt' + (prompt ? '' : ' muted') + '">' + escapeHTML(prompt || '（无提示词）') + '</p>' +
      (meta.length ? '<div class="queue-meta">' + meta.join('') + '</div>' : '') +
      (errorText ? '<p class="queue-error">' + escapeHTML(errorText) + '</p>' : '') +
      (actions.length ? '<div class="queue-actions">' + actions.join('') + '</div>' : '') +
      '</article>';
  }

  function renderQueueStatus() {
    var el = $('#queueStatus');
    if (!el) return;
    var active = queueActiveCount();
    var text;
    if (queueUi.loading && !queueUi.jobs.length) text = '载入中…';
    else if (queueUi.loading) text = '刷新中… · ' + (active ? active + ' 个进行中' : '队列空闲');
    else if (queueUi.error) text = '读取失败：' + queueUi.error;
    else if (queueUi.jobs.length) text = queueUi.jobs.length + ' 个作业' + (active ? ' · ' + active + ' 个进行中' : ' · 无进行中');
    else text = '队列为空 · 每次生成或编辑都会留下作业记录';
    el.textContent = text;
    el.classList.toggle('err', !!queueUi.error);
  }

  function renderQueue() {
    var list = $('#queueList');
    if (!list) return;
    renderQueueStatus();
    var total = $('#queueTotal');
    if (total) total.textContent = queueUi.jobs.length + ' 个作业';
    if (!queueUi.jobs.length) {
      var emptyText = queueUi.loading ? '载入中…' : (queueUi.error ? '暂时读不到队列。点「刷新」重试。' : '队列为空。<br>生成或编辑后会出现在这里。');
      list.innerHTML = '<div class="queue-empty">' + emptyText + '</div>';
    } else {
      list.innerHTML = queueUi.jobs.map(queueItemHTML).join('');
    }
    renderQueueBadge();
  }

  function renderQueueBadge() {
    var badge = $('#queueBadge');
    var button = $('#queueBtn');
    if (!badge || !button) return;
    var active = queueActiveCount();
    badge.textContent = String(active);
    badge.hidden = active === 0;
    button.setAttribute('aria-label', active ? '打开队列 · ' + active + ' 个进行中' : '打开队列');
    button.title = active ? '队列 · ' + active + ' 个进行中' : '队列';
    renderStamp();
  }

  function startQueuePolling() {
    stopQueuePolling();
    queueUi.timer = setInterval(function () {
      if (!queueUi.open) { stopQueuePolling(); return; }
      loadQueue({ silent: true });
    }, QUEUE_POLL_MS);
  }
  function stopQueuePolling() {
    if (queueUi.timer !== null) {
      clearInterval(queueUi.timer);
      queueUi.timer = null;
    }
  }
  function openQueue() {
    if (!queueLayerEl || queueUi.open) return;
    queueUi.open = true;
    queueUi.returnFocus = document.activeElement;
    queueLayerEl.inert = false;
    queueLayerEl.classList.add('open');
    queueLayerEl.setAttribute('aria-hidden', 'false');
    $('#queueBtn').setAttribute('aria-expanded', 'true');
    renderQueue();
    loadQueue();
    startQueuePolling();
    setTimeout(function () {
      var refresh = $('#queueRefresh');
      if (refresh) refresh.focus();
    }, 0);
  }
  function closeQueue() {
    queueUi.open = false;
    stopQueuePolling();
    if (!queueLayerEl) return;
    queueLayerEl.classList.remove('open');
    queueLayerEl.setAttribute('aria-hidden', 'true');
    queueLayerEl.inert = true;
    var button = $('#queueBtn');
    if (button) button.setAttribute('aria-expanded', 'false');
    if (queueUi.returnFocus && queueUi.returnFocus.isConnected) queueUi.returnFocus.focus();
    queueUi.returnFocus = null;
  }

  async function cancelQueueJob(id) {
    var job = queueJobById(id);
    if (!job) return;
    var path = job.snapshot ? '/v2/jobs/' : (job.provider === 'seedream' ? '/seedream/jobs/' : '/cloud/jobs/');
    try {
      var res = await apiFetch(path + encodeURIComponent(id) + '/cancel', { method: 'POST' });
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok) throw new Error(queueApiError(res.status, data));
      toast('已取消');
    } catch (err) {
      toast(err && err.message ? err.message : '取消失败');
    }
    loadQueue();
  }

  async function retryQueueJob(id) {
    var job = queueJobById(id);
    if (!job) return;
    if (!job.snapshot && job.provider !== 'minimax') {
      toast('Seedream 作业暂不支持重试：源图数据未持久化');
      return;
    }
    try {
      var path = job.snapshot ? '/v2/jobs/' : '/cloud/jobs/';
      var res = await apiFetch(path + encodeURIComponent(id) + '/retry', { method: 'POST' });
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok) throw new Error(queueApiError(res.status, data));
      toast('已重新排队');
    } catch (err) {
      toast(err && err.message ? err.message : '重试失败');
    }
    loadQueue();
  }

  /* ————— 提示 ————— */
  function toast(msg) {
    var el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('on'); }, 2200);
  }

  function listen(target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    cleanups.push(function () { target.removeEventListener(type, fn, opts); });
  }

  /* ————— 事件 ————— */
  function bind() {
    $('#go').addEventListener('click', function () { generate(false); });

    $('#styleGrid').addEventListener('click', function (e) {
      var zoom = e.target.closest('[data-zoom]');
      if (zoom) { openStylePreview(zoom.dataset.zoom); return; }
      var el = e.target.closest('.card');
      if (el) toggleStyle(el.dataset.id);
    });

    $$('[data-preview-close]').forEach(function (el) { el.addEventListener('click', closeStylePreview); });
    $('#previewPrev').addEventListener('click', function () { moveStylePreview(-1); });
    $('#previewNext').addEventListener('click', function () { moveStylePreview(1); });
    $('#chips').addEventListener('click', function (e) {
      var el = e.target.closest('[data-remove]');
      if (el) { removeStyle(el.dataset.remove); return; }
      var chip = e.target.closest('[data-focus]');
      if (!chip) return;
      state.focus = chip.dataset.focus;
      renderChips();
      renderPromptPanel();
      updateUI();
    });

    $('#proofGrid').addEventListener('click', function (e) {
      var retry = e.target.closest('[data-retry]');
      if (retry) { retryCloud(retry.dataset.retry); return; }
      var zoom = e.target.closest('[data-result-zoom]');
      if (zoom) { openResultBig(zoom.dataset.resultZoom); return; }
      var dl = e.target.closest('[data-download]');
      if (dl) { downloadOne(dl.dataset.download); return; }
      var el = e.target.closest('[data-result]');
      if (el) showResult(el.dataset.result);
    });
    $('#borderOptions').addEventListener('click', function (e) {
      var b = e.target.closest('[data-border]');
      if (!b) return;
      state.border = b.dataset.border;
      updateUI();
      renderProof();
      if ($('#resultLayer') && $('#resultLayer').classList.contains('open') && bigState && bigState.resultId) openResultBig(bigState.resultId);
    });
    $$('[data-result-close]').forEach(function (el) { el.addEventListener('click', closeResultBig); });
    $('#resultDownload').addEventListener('click', function () {
      if (!bigState) return;
      if (bigState.resultId) downloadOne(bigState.resultId);
      else triggerDownload(bigState.url, '收藏-' + (bigState.styleId || 'image') + '.jpg');
    });
    $('#resultLike').addEventListener('click', function () { toggleFeedback('up'); });
    $('#resultDislike').addEventListener('click', function () { toggleFeedback('down'); });
    $('#resultFavorite').addEventListener('click', toggleFavoriteBig);
    $('#resultArchive').addEventListener('click', async function () {
      if (!bigState || !bigState.archiveKey) return;
      var item = allRecentItems().find(function (x) { return resultKey(x.result) === bigState.archiveKey; });
      if (!item) return;
      var archivedNow = await setItemArchived(item, !isItemArchived(item));
      if (archivedNow === null) return;
      bigState.archived = archivedNow;
      syncBigActions();
      renderRecentPage();
      toast(archivedNow ? '已归档，文件仍保留在本机' : '已取消归档');
    });
    $$('[data-multi-close]').forEach(function (el) { el.addEventListener('click', function () { $('#multiLayer').classList.remove('open'); $('#multiLayer').inert = true; $('#multiLayer').setAttribute('aria-hidden', 'true'); }); });
    $('#multiMode').addEventListener('click', function (e) {
      var b = e.target.closest('[data-multi-mode]');
      if (!b) return;
      multiState.mode = b.dataset.multiMode;
      $$('#multiMode button').forEach(function (x) { x.classList.toggle('on', x === b); });
    });
    $('#multiGenerate').addEventListener('click', startMulti);
    $('#multiResults').addEventListener('click', function (e) {
      var img = e.target.closest('[data-multi-view]');
      if (!img) return;
      var r = multiState.results[Number(img.dataset.multiView)];
      if (!r) return;
      var st = styleById(r.styleId) || { name: r.styleId };
      openBig({ key: r.url, url: r.url, title: st.name, meta: r.w + ' × ' + r.h, info: '', w: r.w, h: r.h, border: 'none', resultId: null, styleId: r.styleId, cloud: true });
    });
    $('#resultRefine').addEventListener('click', openRefine);
    $$('[data-refine-close]').forEach(function (el) { el.addEventListener('click', closeRefine); });
    $('#refineSource').addEventListener('load', syncRefineCanvas);
    $('#refineBrushSize').addEventListener('input', function () {
      refine.brush.size = Math.max(4, Math.min(96, Number(this.value) || 32));
      var out = $('#refineBrushSizeValue');
      if (out) out.textContent = refine.brush.size + ' px';
    });
    $('#refineBrushMode').addEventListener('click', function (e) {
      var b = e.target.closest('[data-brush-mode]');
      if (!b) return;
      refine.brush.mode = b.dataset.brushMode;
      $$('#refineBrushMode button').forEach(function (x) { x.classList.toggle('on', x === b); });
    });
    $('#refineMaskClear').addEventListener('click', clearRefineMask);
    $('#refineMaskInvert').addEventListener('click', invertRefineMask);
    (function () {
      var canvas = $('#refineMaskCanvas');
      if (!canvas) return;
      var stroke = null;

      function point(e) {
        var rect = canvas.getBoundingClientRect();
        if (!rect.width || !rect.height || !canvas.width || !canvas.height) return null;
        return {
          x: Math.max(0, Math.min(canvas.width, ((e.clientX - rect.left) / rect.width) * canvas.width)),
          y: Math.max(0, Math.min(canvas.height, ((e.clientY - rect.top) / rect.height) * canvas.height)),
        };
      }

      canvas.addEventListener('pointerdown', function (e) {
        if (e.button !== 0) return;
        var p = point(e);
        if (!p) return;
        stroke = p;
        paintRefinePoint(p.x, p.y);
        if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
        e.preventDefault();
      });

      canvas.addEventListener('pointermove', function (e) {
        if (!stroke) return;
        var p = point(e);
        if (!p) return;
        strokeRefineSegment(stroke.x, stroke.y, p.x, p.y);
        stroke = p;
        e.preventDefault();
      });

      function endStroke(e) {
        if (!stroke) return;
        stroke = null;
        if (canvas.hasPointerCapture && canvas.hasPointerCapture(e.pointerId)) {
          canvas.releasePointerCapture(e.pointerId);
        }
        updateRefineMaskState();
      }

      canvas.addEventListener('pointerup', endStroke);
      canvas.addEventListener('pointercancel', endStroke);
    })();
    $('#refineStart').addEventListener('click', startRefine);
    $('#refineLayerZip').addEventListener('click', downloadLayerZip);
    $('#refineLayerGrid').addEventListener('click', function (e) {
      var img = e.target.closest('[data-layer-url]');
      if (!img) return;
      window.open(img.dataset.layerUrl, '_blank', 'noopener');
    });
    $('#refineModel').addEventListener('click', function (e) {
      var b = e.target.closest('[data-refine-model]');
      if (!b) return;
      refine.model = b.dataset.refineModel;
      syncRefineCost();
    });
    $('#refineView').addEventListener('click', function () {
      if (!refine.result) return;
      var result = refine.result;
      closeRefine();
      openBig({
        key: resultKey({ id: 'h3-refine', cloud: true, url: result.url }),
        url: result.url,
        title: '多轮编辑',
        meta: '多轮编辑 · ' + result.w + ' × ' + result.h,
        info: '二次编辑结果 · ' + result.w + ' × ' + result.h,
        w: result.w, h: result.h, border: 'none', resultId: null, styleId: 'h3-refine', cloud: true,
      });
    });
    $('#refineDownload').addEventListener('click', function () {
      if (refine.result) triggerDownload(refine.result.url, '二次编辑-' + Date.now() + '.jpg');
    });
    $('#favoritesBtn').addEventListener('click', openFavorites);
    $$('[data-favorites-close]').forEach(function (el) { el.addEventListener('click', closeFavorites); });
    $('#favoritesGrid').addEventListener('click', function (e) {
      var remove = e.target.closest('[data-favorite-remove]');
      if (remove) {
        var idx = Number(remove.dataset.favoriteRemove);
        var snapshot = favorites.slice();
        favorites.splice(idx, 1);
        if (!writeJsonStore(FAVORITES_KEY, favorites)) { favorites = snapshot; toast('取消收藏失败'); return; }
        renderFavorites();
        if (bigState && favoriteIndex(bigState.key) < 0) syncBigActions();
        updateFavoriteCount();
        return;
      }
      var open = e.target.closest('[data-favorite-open]');
      if (open) openFavorite(Number(open.dataset.favoriteOpen));
    });

    bindWorkflow();
    $('#workflowHistory').addEventListener('click', function () {
      switchView(currentView === 'recent' ? startupView : 'recent');
    });
    $('#viewTabs').addEventListener('click', function (e) {
      var b = e.target.closest('[data-view]');
      if (b) switchView(b.dataset.view);
    });
    $('#recentRefresh').addEventListener('click', function () { loadAllHistory(true); });
    $('#textPrompt').addEventListener('input', renderTextPage);
    $('#textModel').addEventListener('click', function (e) {
      var b = e.target.closest('[data-model]');
      if (!b) return;
      textState.model = b.dataset.model;
      renderTextPage();
    });
    $('#textTemplates').addEventListener('click', function (e) {
      var b = e.target.closest('[data-text-template]');
      if (!b) return;
      var t = TEXT_TEMPLATES[Number(b.dataset.textTemplate)];
      if (!t) return;
      $('#textPrompt').value = t.prompt;
      $('#textPrompt').focus();
      renderTextPage();
    });
    $$('#seedreamMode button').forEach(function (b) {
      b.addEventListener('click', function () { seedreamState.mode = b.dataset.seedreamMode; renderSeedreamPage(); });
    });
    $('#seedreamModel').addEventListener('click', function (e) {
      var b = e.target.closest('[data-seedream-model]');
      if (!b) return;
      seedreamState.model = b.dataset.seedreamModel;
      renderSeedreamPage();
    });
    $('#seedreamPrompt').addEventListener('input', renderSeedreamPage);
    $('#seedreamAspect').addEventListener('click', function (e) {
      var b = e.target.closest('[data-aspect]');
      if (!b) return;
      seedreamState.aspect = b.dataset.aspect;
      renderSeedreamPage();
    });
    $('#seedreamQuality').addEventListener('click', function (e) {
      var b = e.target.closest('[data-quality]');
      if (!b) return;
      seedreamState.quality = b.dataset.quality;
      renderSeedreamPage();
    });
    $('#seedreamPick').addEventListener('click', function () { $('#seedreamFile').click(); });
    $('#seedreamFile').addEventListener('change', function () {
      var file = this.files && this.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          seedreamState.source = { url: reader.result, w: img.naturalWidth, h: img.naturalHeight, name: file.name };
          renderSeedreamPage();
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
      this.value = '';
    });
    $('#seedreamGenerate').addEventListener('click', startSeedream);
    $('#seedreamView').addEventListener('click', viewSeedreamResult);
    $('#seedreamDownload').addEventListener('click', function () {
      if (seedreamState.result) triggerDownload(seedreamState.result.url, 'seedream-' + Date.now() + '.jpg');
    });
    $('#textAspect').addEventListener('click', function (e) {
      var b = e.target.closest('[data-aspect]');
      if (!b) return;
      textState.aspect = b.dataset.aspect;
      renderTextPage();
    });
    $('#textQuality').addEventListener('click', function (e) {
      var b = e.target.closest('[data-quality]');
      if (!b) return;
      textState.quality = b.dataset.quality;
      renderTextPage();
    });
    $('#textGenerate').addEventListener('click', startTextJob);
    $('#textView').addEventListener('click', viewTextResult);
    $('#textDownload').addEventListener('click', function () {
      if (textState.result) triggerDownload(textState.result.url, '文生图-' + Date.now() + '.jpg');
    });
    $('#recentGrid').addEventListener('load', function (e) {
      var img = e.target;
      if (!img || img.tagName !== 'IMG' || !img.dataset.recentKey) return;
      var w = img.naturalWidth, h = img.naturalHeight;
      if (!w || !h) return;
      var card = img.closest('.recent-card');
      var meta = card && card.querySelector('.rc-meta');
      if (meta) meta.textContent = meta.textContent.replace(/0 × 0/g, w + ' × ' + h);
    }, true);
    $('#recentGrid').addEventListener('click', function (e) {
      var action = e.target.closest('[data-recent-action]');
      if (action) {
        recentAction(action.dataset.recentAction, Number(action.dataset.recentIndex));
        return;
      }
      var card = e.target.closest('[data-recent-open]');
      if (card) openRecentImage(Number(card.dataset.recentOpen));
    });
    $('#recentArchiveToggle').addEventListener('click', function () {
      showArchived = !showArchived;
      renderRecentPage();
    });

    $('#queueBtn').addEventListener('click', openQueue);
    $$('[data-queue-close]').forEach(function (el) { el.addEventListener('click', closeQueue); });
    $('#queueRefresh').addEventListener('click', function () { loadQueue(); });
    $('#queueList').addEventListener('click', function (e) {
      var cancel = e.target.closest('[data-queue-cancel]');
      if (cancel) { cancelQueueJob(cancel.dataset.queueCancel); return; }
      var retry = e.target.closest('[data-queue-retry]');
      if (retry && !retry.disabled) { retryQueueJob(retry.dataset.queueRetry); return; }
    });

    $$('#sizeGroup button').forEach(function (el) {
      el.addEventListener('click', function () {
        state.params.size = el.dataset.size;
        if (state.results.length) state.dirty = true;
        updateUI();
        renderGrid();
        renderProof();
      });
    });

    $$('#swatches .sw').forEach(function (el) {
      el.addEventListener('click', function () {
        setParam('ink', el.dataset.ink);
        if (state.results.length) state.dirty = true;
        updateUI();
        renderGrid();
        renderProof();
        schedulePreview();
      });
    });

    $('#strength').addEventListener('input', function (e) {
      setParam('strength', +e.target.value / 100);
      if (state.results.length) state.dirty = true;
      updateUI();
      renderProof();
      schedulePreview();
    });
    $('#grain').addEventListener('input', function (e) {
      setParam('grain', +e.target.value / 100);
      if (state.results.length) state.dirty = true;
      updateUI();
      renderProof();
      schedulePreview();
    });
    $$('#cloudQualityGroup button').forEach(function (el) {
      el.addEventListener('click', function () {
        state.cloudQuality = el.dataset.quality;
        if (state.results.length) state.dirty = true;
        updateUI();
        renderGrid();
        renderProof();
      });
    });
    $$('#frameGroup button').forEach(function (el) {
      el.addEventListener('click', function () {
        state.frame = el.dataset.frame;
        if (state.results.length) state.dirty = true;
        applyFrame();
        updateUI();
        renderProof();
        schedulePreview();
      });
    });

    $('#zipBtn').addEventListener('click', zipAll);
    $('#compareBtn').addEventListener('click', function () {
      state.comparing = !state.comparing;
      $('#print').classList.toggle('compare', state.comparing);
      $('#compareBtn').setAttribute('aria-pressed', state.comparing ? 'true' : 'false');
    });

    $('#replaceBtn').addEventListener('click', function () { $('#fileInput').click(); });
    $('#cropBtn').addEventListener('click', openCrop);
    $('#genModel').addEventListener('click', function (e) {
      var b = e.target.closest('[data-gen-model]');
      if (!b) return;
      state.genModel = b.dataset.genModel;
      updateUI();
      toast(state.genModel === 'seedream' ? '生成模型：Seedream 5.5' : '生成模型：MiniMax H3');
    });
    $$('[data-crop-close]').forEach(function (el) { el.addEventListener('click', closeCrop); });
    $('#cropRatios').addEventListener('click', function (e) {
      var b = e.target.closest('[data-crop-ratio]');
      if (b) setCropRatio(b.dataset.cropRatio);
    });
    $('#cropReset').addEventListener('click', function () { setCropRatio(crop.ratio); });
    $('#cropRestore').addEventListener('click', restoreOriginalSource);
    $('#cropApply').addEventListener('click', applyCrop);
    bindCropDrag();
    $('#libList').addEventListener('click', function (e) {
      var del = e.target.closest('[data-hide-style]');
      if (del) hideStyleFromLibrary(del.dataset.hideStyle);
    });
    $('#hiddenList').addEventListener('click', function (e) {
      var restore = e.target.closest('[data-restore-style]');
      if (restore) restoreStyleToLibrary(restore.dataset.restoreStyle);
    });
    $('#restoreAll').addEventListener('click', restoreAllStyles);
    $('#pickEmpty').addEventListener('click', function () { $('#fileInput').click(); });
    $('#useSample').addEventListener('click', useSample);
    $$('#scopeGroup button').forEach(function (el) {
      el.addEventListener('click', function () {
        state.scope = el.dataset.scope;
        updateUI();
      });
    });
    $('#resetOverride').addEventListener('click', function () {
      if (!state.focus) return;
      delete state.overrides[state.focus];
      updateUI();
      renderProof();
      schedulePreview();
    });
    $$('#variantGroup button').forEach(function (el) {
      el.addEventListener('click', function () {
        state.text.variant = el.dataset.variant;
        if (state.results.length) state.dirty = true;
        updateUI();
        buildThumbs(SRC);
        renderProof();
        schedulePreview();
      });
    });
    [['textTitle', 'title'], ['textSubtitle', 'subtitle'], ['textDate', 'date'], ['textHandle', 'handle']].forEach(function (pair) {
      var el = $('#' + pair[0]);
      if (!el) return;
      el.addEventListener('input', function () {
        state.text[pair[1]] = el.value;
        if (state.results.length) state.dirty = true;
        updateUI();
        renderProof();
        schedulePreview();
      });
    });
    $('#fileInput').addEventListener('change', function (e) {
      var files = Array.prototype.slice.call(e.target.files || []);
      if (files.length > 1) openMulti(files); else if (files[0]) loadFile(files[0]);
      e.target.value = '';
    });

    $('#stage').addEventListener('dragover', function (e) { e.preventDefault(); $('#stage').classList.add('drag'); });
    $('#stage').addEventListener('dragleave', function () { $('#stage').classList.remove('drag'); });
    $('#stage').addEventListener('drop', function (e) {
      e.preventDefault();
      e.stopPropagation();
      $('#stage').classList.remove('drag');
      loadFile(e.dataTransfer.files[0]);
    });
    listen(document, 'dragover', function (e) { e.preventDefault(); });
    listen(document, 'drop', function (e) {
      if (e.defaultPrevented) return;
      e.preventDefault();
      var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) loadFile(file);
    });

    listen(document, 'paste', function (e) {
      var items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      for (var i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image/') === 0) {
          loadFile(items[i].getAsFile());
          break;
        }
      }
    });

    $('#searchInput').addEventListener('input', function (e) {
      state.query = e.target.value;
      renderGrid();
      updateUI();
    });

    $$('.seg button').forEach(function (el) {
      el.addEventListener('click', function () {
        state.filter = el.dataset.filter;
        $$('.seg button').forEach(function (b) { b.classList.toggle('on', b === el); });
        renderGrid();
      });
    });

    var print = $('#print');
    var splitEl = $('#split');
    var dragging = false;
    function setSplitPct(pct) {
      var value = Math.min(96, Math.max(4, pct));
      print.style.setProperty('--split', value + '%');
      if (splitEl) splitEl.setAttribute('aria-valuenow', String(Math.round(value)));
    }
    function setSplit(clientX) {
      var r = print.getBoundingClientRect();
      setSplitPct(((clientX - r.left) / r.width) * 100);
    }
    if (splitEl) {
      splitEl.addEventListener('keydown', function (e) {
        var current = parseFloat(print.style.getPropertyValue('--split')) || 50;
        if (e.key === 'ArrowLeft') { e.preventDefault(); setSplitPct(current - 2); }
        if (e.key === 'ArrowRight') { e.preventDefault(); setSplitPct(current + 2); }
        if (e.key === 'Home') { e.preventDefault(); setSplitPct(4); }
        if (e.key === 'End') { e.preventDefault(); setSplitPct(96); }
      });
    }
    print.addEventListener('pointerdown', function (e) {
      if (!state.comparing) return;
      dragging = true;
      print.setPointerCapture(e.pointerId);
      setSplit(e.clientX);
    });
    print.addEventListener('pointermove', function (e) {
      if (dragging) setSplit(e.clientX);
    });
    print.addEventListener('pointerup', function () { dragging = false; });

    $('#settingsBtn').addEventListener('click', openSettings);
    $$('[data-close]').forEach(function (el) { el.addEventListener('click', closeSettings); });
    $('#storageApply').addEventListener('click', applyStorage);
    $('#saveSettings').addEventListener('click', saveSettings);
    $('#keyChange').addEventListener('click', function () {
      var box = $('#keyEdit');
      box.hidden = !box.hidden;
      if (!box.hidden) $('#keyInput').focus();
    });
    $('#keySave').addEventListener('click', saveKeyOnly);
    $('#seedreamKeyChange').addEventListener('click', function () {
      var box = $('#seedreamKeyEdit');
      box.hidden = !box.hidden;
      if (!box.hidden) $('#seedreamKeyInput').focus();
    });
    $('#seedreamKeySave').addEventListener('click', saveSeedreamKeyOnly);
    $('#cloudPromptReset').addEventListener('click', resetPrompt);
    $('#cloudPromptSelect').addEventListener('change', function (e) {
      state.focus = e.target.value;
      renderChips();
      updateUI();
    });
    $('#cloudPrompt').addEventListener('input', function () {
      var id = currentCloudStyleId();
      if (!id) return;
      var val = this.value;
      var key = promptKey(id);
      if (val.trim() === basePromptFor(id).trim()) delete state.promptOverrides[key];
      else state.promptOverrides[key] = val;
      var stateEl = $('#promptState');
      if (stateEl) stateEl.textContent = state.promptOverrides[key] !== undefined ? '已修改' : '默认';
      if (state.results.length) state.dirty = true;
    });
    $('#clearHistory').addEventListener('click', function () {
      if (!window.confirm('清空全部历史试印记录？此操作不可撤销。')) return;
      apiFetch('/history', { method: 'DELETE' }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          if (!res.ok) throw new Error(data.error || '清空失败');
          hostHistory = [];
          hostHistoryReady = true;
          historyTotal = 0;
          try { localStorage.removeItem(HISTORY_KEY); } catch (e) {}
          recentLoaded = false;
          renderRecentPage();
          toast('历史已清空');
        });
      }).catch(function (err) { toast(err.message || '清空失败'); });
    });
    $('#billingLink').addEventListener('click', function () { loadUsage(); toast('已刷新云端用量'); });
    $('#cleanupBtn').addEventListener('click', function () {
      if (!window.confirm('清理 90 天前的原图、结果和作业？样式包与账本保留，此操作不可撤销。')) return;
      apiFetch('/cleanup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ days: 90 })
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          if (!res.ok) throw new Error(data.error || '清理失败');
          hostHistory = [];
          historyTotal = 0;
          try { localStorage.removeItem(HISTORY_KEY); } catch (e) {}
          recentLoaded = false;
          loadAllHistory(true);
          loadUsage();
          toast('已清理 ' + (data.batches || 0) + ' 批 · ' + (data.assets || 0) + ' 原图');
        });
      }).catch(function (err) { toast(err.message || '清理失败'); });
    });
    $$('.mini-seg').forEach(function (group) {
      group.addEventListener('click', function (e) {
        var b = e.target.closest('button');
        if (!b) return;
        $$('button', group).forEach(function (x) { x.classList.toggle('on', x === b); });
      });
    });

    listen(document, 'keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        $('#searchInput').focus();
      }
      var trapLayer = setLayer.classList.contains('open')
        ? setLayer
        : (queueLayerEl && queueLayerEl.classList.contains('open') ? queueLayerEl : null);
      if (e.key === 'Tab' && trapLayer) {
        var focusables = $$('button:not([disabled]), input:not([disabled])', trapLayer).filter(function (el) {
          return el.offsetParent !== null;
        });
        if (focusables.length) {
          var first = focusables[0], last = focusables[focusables.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
      if (e.key === 'Escape' && queueLayerEl && queueLayerEl.classList.contains('open')) { closeQueue(); return; }
      if (e.key === 'Escape' && $('#refineLayer')?.classList.contains('open')) { closeRefine(); return; }
      if (e.key === 'Escape' && $('#favoritesLayer')?.classList.contains('open')) { closeFavorites(); return; }
      if (e.key === 'Escape' && $('#cropLayer')?.classList.contains('open')) { closeCrop(); return; }
      if (e.key === 'Escape' && $('#resultLayer')?.classList.contains('open')) { closeResultBig(); return; }
      if (e.key === 'Escape' && $('#previewLayer')?.classList.contains('open')) { closeStylePreview(); return; }
      if (($('#previewLayer')?.classList.contains('open')) && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault(); moveStylePreview(e.key === 'ArrowLeft' ? -1 : 1); return;
      }
      if (e.key === 'Escape' && setLayer.classList.contains('open')) closeSettings();
      if (e.key === 'Escape' && state.comparing) {
        state.comparing = false;
        $('#print').classList.remove('compare');
        $('#compareBtn').setAttribute('aria-pressed', 'false');
      }
    });
  }

  function dispose() {
    disposed = true;
    stopQueuePolling();
    cleanups.forEach(function (fn) { try { fn(); } catch (e) {} });
    cleanups = [];
    clearTimeout(previewTimer);
    clearTimeout(toastTimer);
    root.innerHTML = '';
  }

  /* ————— 启动 ————— */
  function loadSampleThumbs() {
    apiFetch('/sample', { cache: 'no-store' }, 'image').then(function (res) {
      if (!res.ok) throw new Error('sample');
      return res.blob();
    }).then(blobToDataURL).then(function (url) {
      if (disposed) return;
      SAMPLE_URL = url;
      var im = new Image();
      im.onload = function () {
        if (disposed) return;
        SAMPLE_IMG = im;
        buildThumbs(im);
        renderGrid();
        renderChips();
      };
      im.src = url;
    }).catch(function () {});
  }

  function useSample() {
    if (!SAMPLE_URL || !SAMPLE_IMG) { toast('示例图还没载入好'); return; }
    setSource(SAMPLE_URL, 'sample-still.jpg', true).then(function () {
      if (disposed) return;
      state.assetId = null;
      saveAsset(SAMPLE_URL, 'sample-still.jpg', SRC.naturalWidth, SRC.naturalHeight);
      buildThumbs(SRC);
      renderGrid();
      renderChips();
      showPreview();
      renderProof();
      updateUI();
      toast('已载入示例图；点「生成 3 版」开始');
    }).catch(function () { toast('示例图载入失败'); });
  }

  function boot() {
    bind();
    switchView(startupView);
    flowResume();
    showEmpty();
    renderHistory();
    loadSettings();
    loadStyles();
    loadAllHistory();
    loadSampleThumbs();
    loadQueue({ silent: true });
    applyFrame();
    if (typeof ResizeObserver === 'function') {
      var ro = new ResizeObserver(function () { applyFrame(); });
      ro.observe($('#stage'));
      cleanups.push(function () { ro.disconnect(); });
    }
    listen(window, 'resize', applyFrame);
  }

  boot();
  return dispose;

    }

    function Page() {
      var ref = React.useRef(null);
      React.useEffect(function () {
        if (!ref.current) return;
        return mountPage(ref.current);
      }, []);
      return h('div', { className: 'iw-root', ref: ref });
    }

    function SidebarIcon(props) {
      var size = (props && props.size) || 16;
      return h('svg', {
        width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
        'aria-hidden': true, style: { display: 'block' },
      },
        h('rect', { x: 3.2, y: 4.2, width: 17.6, height: 15.6, rx: 2, stroke: 'currentColor', strokeWidth: 1.5 }),
        h('circle', { cx: 8, cy: 9, r: 1.05, fill: 'currentColor' }),
        h('circle', { cx: 12, cy: 9, r: 1.35, fill: 'currentColor' }),
        h('circle', { cx: 16, cy: 9, r: 1.65, fill: 'currentColor' }),
        h('circle', { cx: 8, cy: 13, r: 1.25, fill: 'currentColor' }),
        h('circle', { cx: 12, cy: 13, r: 1.55, fill: 'currentColor' }),
        h('circle', { cx: 16, cy: 13, r: 1.85, fill: 'currentColor' }),
        h('path', { d: 'M4.8 17.6l4.2-4.2 3.2 3.2 2.8-2.8 4 4', stroke: 'currentColor', strokeWidth: 1.5, strokeLinejoin: 'round' })
      );
    }

    function mountCss() {
      var old = document.getElementById(CSS_ID);
      if (old) old.remove();
      var style = document.createElement('style');
      style.id = CSS_ID;
      style.textContent = CSS;
      document.head.appendChild(style);
    }
    function unmountCss() {
      var el = document.getElementById(CSS_ID);
      if (el) el.remove();
    }

    function apply(ctx) {
      mountCss();
      if (ctx.effect) ctx.effect(function () { return function () { unmountCss(); }; }, 'dsh-image-workbench: styles');

      ctx.slots.inject('main', function () {
        return ctx.slots.register({ name: 'main', key: PANEL_ID, inject: function () { return {}; } }, Page);
      });

      ctx.slots.inject('sidebar.panellist', function () {
        return ctx.slots.register(
          { name: 'sidebar.panellist', id: PANEL_ID, order: 45, label: function () { return '图像风格'; } },
          SidebarIcon
        );
      });
    }

    exports.PANEL_ID = PANEL_ID;
    exports.inject = ['slots'];
    exports.apply = apply;
    return module.exports;
  },
});
