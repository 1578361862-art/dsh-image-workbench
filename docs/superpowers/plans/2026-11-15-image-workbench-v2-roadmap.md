# Image Workbench v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the current curated style generator into a controllable, reproducible editing tool without copying ComfyUI's node graph.

**Architecture:** Keep the current DSH plugin shape (`plugin/index.js` host + single `plugin/client.js` client). Add four host-level primitives — unified jobs, region edits, layer sets, and pipeline recipes — then expose them through the existing workbench UI. Advanced graph execution is a later adapter, not the main UI.

**Tech Stack:** DSH plugin (Cordis), Node 22 ESM, existing `plugin/lib/*`, browser Canvas, `node:test`. No new native dependency in Phase 0–2.

---

## Current baseline

- Version: `0.36.12`, branch `main`, tests **17 pass**.
- Client: `plugin/client.js` — one ESM file with embedded HTML/CSS/JS.
- Host: `plugin/index.js` — `webServer` routes, storage, H3 cloud jobs, Seedream synchronous calls.
- Libraries:
  - `plugin/lib/cloud.js` — H3 job orchestration, budget, ledger.
  - `plugin/lib/jobs.js` — in-memory job state machine, persisted JSON under `jobs/`.
  - `plugin/lib/storage.js` — assets, `index.jsonl`, history, archive, cleanup, export ZIP.
  - `plugin/lib/minimax.js` — H3 edit/text.
  - `plugin/lib/seedream.js` — Seedream text/edit/layer decomposition.
  - `plugin/lib/zip.js` — host ZIP.
- Data root: `~/Data/dsh-image-workbench/`:
  - `library/` assets
  - `outputs/` generated results
  - `index.jsonl` history
  - `jobs/` H3 job snapshots
  - `ledger.jsonl` cost/usage
- Tests: `plugin/tests/host.test.mjs`.

## Non-goals

- No full node editor in the primary UI.
- No arbitrary ComfyUI custom-node execution in Phase 0–3.
- No local GPU/model runtime in this plan.
- No new cloud provider in Phase 0–3.

## Target architecture

```text
Workbench (curated UI)
  ├─ Pipeline Recipe (ordered steps + params)
  ├─ Region Editor (mask, bbox, crop/composite)
  ├─ Queue (jobs, cancel, retry, progress)
  └─ Layer Editor (base + z-ordered layers)
        │
        ▼
DSH host API (plugin/index.js)
  ├─ /jobs/*           unified job contract
  ├─ /edit/region      region-edit job
  ├─ /layers/*         layer sets + composite + zip
  ├─ /history/*        metadata, archive, fork
  └─ /recipes/*        save/load/export
        │
        ▼
Provider adapters
  ├─ MiniMax H3 (async jobs)
  └─ Seedream 5.5 (sync -> job wrapper)
```

### Design principles

1. **Curated first, graph second.** Advanced graph/JSON is a separate mode.
2. **Everything reproducible.** Every result stores prompt, model, size, seed (when supported), references, mask, recipe.
3. **Mask is deterministic.** Do not trust a text prompt to constrain pixels. Crop to the masked bounding box, edit, then composite back with feather.
4. **One job contract.** H3 and Seedream return the same `EditJob` shape.
5. **File-first.** Keep JSONL + files; no database migration in Phase 0.
6. **No hidden cost.** Every job carries estimated and actual cost.

## Data contracts

### EditJob

```json
{
  "id": "job_...",
  "kind": "generate | region | upscale",
  "provider": "minimax | seedream",
  "model": "doubao-seedream-5-5-261028",
  "status": "queued | preparing | running | succeeded | failed | canceled | unknown",
  "assetId": "source asset",
  "maskAssetId": "optional mask",
  "referenceAssetIds": ["optional", "multiple"],
  "styleId": "h3-illus",
  "prompt": "final sent prompt",
  "negativePrompt": "",
  "size": "2048x2048",
  "seed": 123456,
  "seedSupported": true,
  "bbox": { "x": 0.12, "y": 0.3, "w": 0.4, "h": 0.25 },
  "paramsHash": "sha256",
  "requestSentAt": "ISO",
  "costYuan": 0.28,
  "output": { "url": "/image-workbench/result/...", "w": 2048, "h": 2048 },
  "recipeId": "optional",
  "parentId": "optional previous result",
  "error": null
}
```

### HistoryEntry additions

```json
{
  "id": "batch or job id",
  "createdAt": "ISO",
  "archived": false,
  "source": { "id": "asset", "name": "source.jpg", "url": "..." },
  "model": "minimax-h3 | seedream-5.5",
  "seed": 123456,
  "size": "2048x2048",
  "params": {},
  "recipeId": "optional",
  "parentId": "optional",
  "results": [
    { "styleId": "h3-illus", "url": "...", "w": 2048, "h": 2048, "costYuan": 0.17, "layerSetId": null }
  ]
}
```

### RegionEdit payload

```json
{
  "assetId": "source",
  "maskDataUrl": "data:image/png;base64,...",
  "bbox": { "x": 0.12, "y": 0.3, "w": 0.4, "h": 0.25 },
  "prompt": "replace the sign with ...",
  "provider": "seedream",
  "model": "doubao-seedream-5-5-261028",
  "size": "2048x2048",
  "seed": 123456,
  "feather": 12
}
```

### LayerSet

```json
{
  "id": "layers_...",
  "baseUrl": "/image-workbench/result/...",
  "width": 2048,
  "height": 2048,
  "layers": [
    { "assetId": "layer asset", "name": "sign", "z": 1, "url": "...", "x": 0, "y": 0, "w": 400, "h": 300, "ocr": null }
  ]
}
```

## Workstreams and order

| Phase | Workstream | Outcome | Est. |
|---|---|---|---|
| 0 | Metadata + unified job | Every result carries model/seed/size/recipe; Seedream becomes a job | 2–3 d |
| 1 | Region editor | Brush mask, crop, composite, outside pixels preserved | 4–5 d |
| 2 | Queue + reproducibility | Queue UI, cancel/retry, seed reuse, fork | 3–4 d |
| 3 | Layer editor | Layer visibility/order/recompose, project ZIP/PSD | 4–6 d |
| 4 | ComfyUI interop | Recipe export, optional ComfyUI backend | 5–8 d |

Do not start Phase 2 before Phase 0’s job contract is stable. Do not start Phase 3 before Phase 1’s composite pipeline is stable.

## Phase 0 — Metadata + unified job

### Task 0.1: Add metadata to the history schema

**Files:**
- Modify: `plugin/lib/storage.js` (`historyEntry`, `indexCloudJob`)
- Modify: `plugin/lib/cloud.js` (`persistResult`)
- Modify: `plugin/index.js` (`/history` response)
- Test: `plugin/tests/host.test.mjs`

**Steps:**
- [ ] Add `model`, `seed`, `size`, `params`, `parentId`, `recipeId` to `indexCloudJob` input and history entry output.
- [ ] In `persistResult`, write them into `batch.json` and `index.jsonl`.
- [ ] Preserve `costYuan`, `w`, `h`, `archived` in history rows.
- [ ] Add a host test that indexes a cloud job with seed/model and asserts `/history` returns them.
- [ ] Run `node --test plugin/tests/`; expect 17 pass + new test pass.
- [ ] Commit: `feat: persist model seed and recipe metadata`.

### Task 0.2: Wrap Seedream in the job contract

**Files:**
- Modify: `plugin/lib/seedream.js`
- Modify: `plugin/lib/jobs.js`
- Modify: `plugin/index.js`
- Test: `plugin/tests/host.test.mjs`

**Steps:**
- [ ] Add `runSeedreamJob` in `index.js` using `jobs.create`, `jobs.start`, `jobs.update`, `jobs.failBeforeRequest`.
- [ ] Add `POST /seedream/jobs` that returns `{ id, status }`; keep `/seedream/edit` for compatibility.
- [ ] Job output must be `{ url, w, h, model, costYuan, seed }`.
- [ ] Add test: mock Seedream fetch, create job, poll until `succeeded`, assert output and cost.
- [ ] Run tests, commit `feat: unify Seedream under job contract`.

## Phase 1 — Region editor (highest user value)

### Task 1.1: Add mask state and brush UI

**Files:**
- Modify: `plugin/client.js` (refine modal, CSS, pointer handlers)
- Test: manual browser acceptance + one pure test for geometry

**Steps:**
- [ ] Add a `maskCanvas` over `#refineSource` at natural resolution.
- [ ] Add brush size, erase, clear, invert controls.
- [ ] Store mask as a PNG data URL in `refine.maskDataUrl`.
- [ ] Add a pure function `maskBBox(maskAlpha, width, height)` in `plugin/lib/mask.js` with unit tests for empty/full/edge masks.
- [ ] Browser acceptance: draw a mask, clear it, invert it; no pageerror.

### Task 1.2: Crop + edit + composite

**Files:**
- Create: `plugin/lib/mask.js` (pure geometry, bbox padding, feather math)
- Modify: `plugin/client.js` (`startRefine`)
- Modify: `plugin/index.js` (`POST /composite`)
- Test: `plugin/tests/mask.test.mjs`

**Steps:**
- [ ] `mask.js`: `bboxToPixels`, `expandBox`, `clampBox`, `featherAlpha`; test edge cases.
- [ ] Client crops source + mask to bbox, sends the crop to the existing H3/Seedream edit path.
- [ ] Client composites the returned crop back into the original at the same bbox with feather; pixels outside bbox remain byte-identical.
- [ ] `POST /composite` accepts `{ dataUrl, sourceHistoryId, region }`, saves `outputs/<id>/composite.png`, indexes history with `kind: "region"`.
- [ ] Acceptance: edit only a sign; assert outside region pixel hash is unchanged before/after composition (Canvas test in browser or Node with PNG decode).
- [ ] Commit: `feat: region crop edit and composite`.

### Task 1.3: Region UI polish

- [ ] Show bbox dimensions and zoom preview.
- [ ] Add "expand 16px / 32px" context padding.
- [ ] Add outpainting mode: expand canvas, mask new area, composite.
- [ ] Browser acceptance: crop 16:9, edit, composite, download; no seams.

## Phase 2 — Queue + reproducibility

### Task 2.1: Host queue

**Files:**
- Modify: `plugin/lib/jobs.js`
- Modify: `plugin/index.js`
- Modify: `plugin/lib/cloud.js`
- Test: `plugin/tests/host.test.mjs`

**Steps:**
- [ ] Add `listJobs({status,limit})`, `cancelJob(id)`, `retryJob(id)`.
- [ ] Enforce concurrency 2 at the host, not the client.
- [ ] Persist queue order in `jobs/*.json`.
- [ ] Add `/jobs`, `/jobs/:id/cancel`, `/jobs/:id/retry`.
- [ ] Test cancel before start and retry after deterministic failure.
- [ ] Commit: `feat: host queue and retry`.

### Task 2.2: Seed and "use these params"

- [ ] Add seed input to workbench and refine.
- [ ] Adapter declares `supportsSeed`; if false, store `seed=null` and show a warning.
- [ ] Add "use this result's params" action in recent viewer.
- [ ] Add fork: `parentId` + recipe clone.
- [ ] Test history round-trip of seed/model/size.

### Task 2.3: Queue panel

- [ ] Add a queue drawer with status, provider, prompt excerpt, cost, cancel/retry.
- [ ] Keep recent generation, queue, and archive as separate views.
- [ ] Browser acceptance: enqueue 3, cancel one, retry one, all statuses settle.

## Phase 3 — Layer editor

### Task 3.1: Layer set storage

**Files:**
- Modify: `plugin/lib/storage.js`
- Modify: `plugin/index.js`
- Test: `plugin/tests/host.test.mjs`

- [ ] Add `putLayerSet`, `getLayerSet`, `listLayerSets`, `deleteLayerSet`.
- [ ] Store `layers/<id>/meta.json` and PNGs.
- [ ] Index layer set in history with `layerSetId`.
- [ ] Test round-trip + cleanup.

### Task 3.2: Layer UI

- [ ] Replace the current layer grid with a layer list: eye toggle, drag order, rename, z-index.
- [ ] Add canvas composite preview; ensure transparent background.
- [ ] Add "export project ZIP" (base + layers + meta).
- [ ] PSD export is a later task; do not block ZIP.

### Task 3.3: Recompose

- [ ] Add `/layers/:id/composite` returning a flattened PNG.
- [ ] Test hidden layer excludes, order changes visual output.
- [ ] Save composite as a new history result.

## Phase 4 — ComfyUI interop

### Task 4.1: Pipeline recipe JSON

**Files:**
- Create: `plugin/lib/recipe.js`
- Modify: `plugin/index.js`
- Test: `plugin/tests/recipe.test.mjs`

```json
{
  "version": 1,
  "source": "asset://...",
  "steps": [
    { "type": "style", "styleId": "h3-illus", "provider": "seedream", "prompt": "..." },
    { "type": "region", "bbox": {}, "prompt": "..." },
    { "type": "upscale", "factor": 2 }
  ],
  "params": { "seed": 123456, "size": "2048x2048" }
}
```

- [ ] Validate/normalize recipe.
- [ ] Save/load/export recipe; attach to history.
- [ ] Test invalid step/version rejection.

### Task 4.2: ComfyUI export

- [ ] Export **API-format JSON** for a small set of supported nodes only: LoadImage, CheckpointLoader, CLIPTextEncode, KSampler, VAEDecode, SaveImage, ImageScale.
- [ ] Do not claim arbitrary workflow compatibility.
- [ ] Add mapping table and tests for generated node IDs.
- [ ] Export PNG metadata (`parameters`/`workflow`) alongside image.

### Task 4.3: Optional ComfyUI backend

- [ ] Add provider adapter `ComfyUIProvider` with `submit`, `poll`, `cancel`.
- [ ] Keep cloud providers first; ComfyUI is opt-in.
- [ ] Never execute untrusted workflow JSON automatically.

## Testing and acceptance

- Unit: `node --test plugin/tests/`; add `mask.test.mjs`, `recipe.test.mjs`.
- Browser: current `dsh_verify` or Playwright with the existing GUI cookie; no new test framework.
- Visual: `/tmp` screenshots via `scripts/shot` for static, Playwright for interaction.
- Every phase must have:
  - no pageerror
  - exact host test count
  - one real browser acceptance path
  - one cost/reproducibility assertion
- Real API acceptance is separate and billable; never run automatically in tests.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| No native mask in H3/Seedream | Crop-to-bbox + composite, never rely on prompt-only mask |
| Seed unsupported by provider | Adapter `supportsSeed`; report unknown, do not fake |
| Seedream sync migration breaks | Keep `/seedream/edit`; add `/seedream/jobs` side-by-side |
| Client monolith grows | New pure helpers in `plugin/lib/mask.js`/`recipe.js`; defer client build split |
| Layer PNG storage growth | ZIP + cleanup with layer-set references |
| ComfyUI JSON incompatible | Support a small node subset, version the recipe, fail closed |
| Cost surprises | Every job stores estimate/actual; queue shows total before start |

## Execution order

1. Phase 0.1 metadata
2. Phase 0.2 Seedream jobs
3. Phase 1 mask + composite
4. Phase 2 queue + seed
5. Phase 3 layer editor
6. Phase 4 recipe + ComfyUI export

Stop after each phase for browser review and a commit. Do not combine Phase 1 and Phase 2 in one change.
