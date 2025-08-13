# Overview
A tiny TypeScript engine built for size-constrained games. It ships really small engine-level features out of the box: hybrid canvas + shader rendering (with shader masking), AABB rectangle physics with tile colliders, embedded sprite/tile atlases with TexturePacker strip animation, Tiled-style tile maps, a procedural graphics stack, a minimal scene system, ZzFX/ZzFXM audio, and a Terser + Roadroller build with a stats.html bundle report.

# quick mental model

* **Boot**: `main.ts` → canvases + input → wait for anim atlas → show **MenuScene** → on first pointer, start **BackgroundScene** + music.
* **Scene contract**: `{ setCanvas, start, stop, update, draw }`.
* **Render order (BackgroundScene)**
  gradient → stars → moon → **vapor mountains** → clouds → neon haze → buildings (far) → terrainBehind → buildings (mid, near) → terrainFront.
* **Two atlases**: `"anim"` (sprites) and `"tile"` (map tiles), both loaded via `SharedAtlas`.
* **Audio**: zzfx (SFX) + zzfxM (music) prebuffered, started on user gesture.

---

# where things live (current files)

* **Background**: `src/engine/scenes/BackgroundScene.ts`
* **Effects**: `src/engine/scenes/effects/*` (Stars, Clouds, NeonHaze, Moon, Terrain)
* **Buildings**: `src/engine/scenes/objects/*` (drawBuilding + subparts)
* **Atlases**:

  * sprites: `src/atlas/animationAtlas.ts` (+ `animation/AtlasAnimator.ts`)
  * tiles: `src/atlas/tileAtlas.ts`
  * loader: `src/engine/renderer/SharedAtlas.ts`
* **Map**: `src/engine/renderer/{render.ts, level-loader.ts, MapContext.ts}`
* **Text**: `src/engine/font/{procFont.ts, fontEngine.ts}`
* **Audio**: `src/engine/audio/SoundEngine.ts`
* **Input**: `src/engine/input/input.ts`
* **Canvas**: `src/engine/renderer/initCanvas.ts`
* **Entry**: `src/main.ts`

---

# backgroundscene tuning cheats

* **Rows**: `layers` array (far/mid/near):

  * `minHeight/maxHeight` → building height range
  * `scale` → perceived size (also impacts spacing math)
  * `scrollSpeed` → parallax factor
  * each row has a `buildings: Map()` cache keyed by segment index
* **Bias helpers**:

  * `apparentBias[]` → multiplier used when generating building variants (compensates for `scale`)
  * `layerBaseLiftApp[]` → baseline lift so silhouettes sit nicely over terrain/haze
* **Camera + drift**: `cameraX` follows left/right; `starScroll`/`cloudScroll` tick independently for subtle motion.

---

# terrain & fractal backdrop (what knobs do)

* **Classic terrain passes**: `drawTerrainBehind/Front` in `effects/terrain/Terrain`.
* **Spawnable fractal layer**: `createFractalBackdropLayer(seed, parallax, base, amp, color, step)`

  * `seed`: phase for noise field
  * `parallax`: scroll factor (smaller = farther)
  * `base`: vertical anchor (0..1 of screen height)
  * `amp`: vertical amplitude in px
  * `color`: fill color for silhouettes
  * `step`: horizontal sampling step (bigger = chunkier, cheaper)

Place it **after** Moon and **before** Clouds/Haze to get the “vaporwave silhouettes behind weather” vibe.

---

# buildings—what to remember

* **Generation**: `generateBuildingVariants(count, minH, maxH, heightMultiplier)`
  cached per segment in `layers[li].buildings`.
* **Draw**: `drawBuilding(ctx, x, by, variant, time)`; y-base (`by`) is computed per-row using height, ground offset, and row lift.
* **Ordering**: building rows are drawn **after** mountains but **before/after** terrain depending on pass (Behind vs Front) to ground them.

---

# sprites & animation

* **Atlas metadata**: `animationAtlas.ts`

  * `atlasMeta`: `{ name: {x,y,w,h} }` per *strip*
  * `animations`: `{ name, frameCount, fps, dx, dy }` for the demo board
* **Animator**: `AtlasAnimator`

  * `drawFrame(ctx, name, i, dx, dy)` → blit frame i from the strip
  * `drawAll(ctx, t)` → cycles each configured strip at its fps (good for test boards)
* **When atlas is ready**: `waitForAtlas("anim").then(...)` in `createAnimator()`.

---

# tiles & map

* **Tile blit**: `drawMapAndColliders(ctx, map, tileSize)` uses `tileAtlasMeta[id]` to draw and anchors the map to the **bottom** of the canvas.
* **Load level**: `level-loader.ts`

  * inflates RLE base64 constants from `levels/level1.ts`
  * registers with `MapContext` via `setCurrentMap(map)`
  * sets **solid tile IDs** in the Physics system (`setSolidTiles`).

---

# text & UI

* **Font**: 5×7 base36-compressed.

  * `procFont.ts`: `glyphs` & `data`
  * `fontEngine.ts`: `drawChar`, `drawText(scale, color)`
* **Components**:

  * **BouncingTitle**: physics-driven drop/bounce; `update(t, ctx, map)` uses your physics against the tile map.
  * **FloatingTitle**: sine hover + shadow; `drawShadow` then `drawMain`.

---

# audio

* **SFX**: `zzfx(...)` (params match ZzFXMicro; volume is `zzfxV`).
* **Music**:

  * `zzfxM(instruments, patterns, sequence, bpm)` → `[L, R] Float32Array`
  * `playZzfxMSong(L, R, loop?)` starts a `BufferSource` (looping by default).
* **Unlocking**: call `zzfx()` once after a user gesture to start the AudioContext.

---

# input

* **Mapping**: `input.ts`

  * A/← = left, D/→ = right, W/↑ = up, S/↓ = down, Space = jump
  * `getInputState()` returns booleans you can poll each frame.

---

# canvases

* **Pair**: `setupCanvasPair(w,h,maskW,maskH)` → `{ canvas, glCanvas, mask, ctx, maskCtx }`

  * Main canvas + overlay GL canvas stacked (`position:absolute`)
  * Pixel-perfect resize (integer scale)
  * `mask` is a detached canvas you can use for shader sprites or effects.

---

# common “how do I add \_\_\_?” recipes

## add a new background effect layer

1. Put a `drawX(ctx,w,h,t,scrollOrCamX)` in `effects/`.
2. Call it from `BackgroundScene.draw()` in the right **order** (use the stack at top).
3. If it parallax-scrolls, feed `cameraX * factor (+ optional drift)`.

## add another parallax building row

1. Add an entry to `layers` in `BackgroundScene.ts` with `minHeight/maxHeight/scale/scrollSpeed`.
2. Optionally extend `apparentBias[]` and `layerBaseLiftApp[]` with a matching index.
3. Duplicate the `drawRow(index)` call in the right place (consider terrain passes).

## add a new tile graphic

1. Extend `tileAtlasMeta` with a new numeric ID → `{x,y,w,h}` rect in the tile atlas.
2. Use that ID in your level data; `render.drawMapAndColliders()` will pick it up.
3. If the tile is **solid**, include its ID in `setSolidTiles([...])`.

## load another level

1. Create `levels/levelN.ts` exporting `{ BASE64, WIDTH, HEIGHT }`.
2. Add a loader like `loadLevelN()` mirroring `loadLevel1()`; call it before gameplay.
3. Update solid tile IDs if the set changes.

## add a sprite animation strip

1. Pack the strip into the **anim** atlas (48×48 frames side-by-side).
2. Add an entry in `atlasMeta` and `animations` (frameCount = strip.w / 48).
3. Use `AtlasAnimator.drawFrame()` or add to `drawAll()` for quick testing.

## add a sound effect or music pattern

* **SFX**: call `zzfx(...)` with parameters (instrument-like).
* **Music**: update your song arrays (`retro1Song`), then rebuild `[L,R]` with `zzfxM(...)`.

## add a new glyph

1. Append the character to `glyphs` and its 7-char base36 chunk to `data`.
2. `drawText()` will render it immediately (uppercase is normalized in `drawText`).

## tweak the fractal mountains

* Adjust `createFractalBackdropLayer(seed, parallax, base, amp, color, step)` in `BackgroundScene.start()`.
* For **farther** feel: lower `parallax`, raise `base`, lower `amp`, increase `step`.

---

# tiny tuning cribsheet

* **Depth feel** = low `scrollSpeed`, low `scale`, subtle alpha in overlays.
* **Avoid parallax “pogo”**: when you change `scale`, revisit `apparentBias[]` and per-row lifts.
* **Tile map anchoring**: map draws from **bottom**; if text/physics looks off, check `offsetY`.
* **Audio silence**: needs a **user gesture** before `playZzfxMSong()` can be heard.
* **Atlas “nothing draws”**: ensure `isAtlasReady(key)` is true (or use `waitForAtlas` once).

---

# quick extension checklist (copy next to your editor)

* [ ] Put new effect in **effects/**; wire it in **BackgroundScene** at the right layer.
* [ ] If parallaxed, multiply cameraX by a sensible factor.
* [ ] New building row? Extend `layers`, `apparentBias`, `layerBaseLiftApp`, and call `drawRow`.
* [ ] New tile? Add to `tileAtlasMeta` (+ solid list if needed).
* [ ] New animation? Add strip rect + animation config.
* [ ] New level? Add base64 RLE + dimensions, `setCurrentMap`, `setSolidTiles`.
* [ ] New glyph? Append glyphs/data.
* [ ] New sound/music? Use `zzfx` / `zzfxM`, start after pointer.
