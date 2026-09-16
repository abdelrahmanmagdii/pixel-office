# Furniture Spec v2b (detail pass) — Grok Bot Pixel Office (CHARACTER SCALE)

**ORIGINAL Pillow art.** Inspired by cute GBA / Pokémon-office vibe.  
**No Nintendo tiles.** `agent-*.png` are **LOCKED** — this pack does not change them.

## Scale rule (hard)

Agents are **48×48**. Desks must feel ~same WIDTH as a character is TALL.  
**Desks are 96×64** (≈3×2 tiles), not the rejected 64×32 dollhouse size.

## Folder

Canonical: `public/assets/furniture/`  
Legacy drop-ins also under `public/assets/` for existing keys.

## Tileset — `tileset.png` — 224×32 (indices unchanged; art v5)

| Index | Key | v5 look |
|------:|-----|---------|
| 0 | floor | Deep mahogany / espresso vertical planks + nails |
| 1 | gray | Dark gray polished hallway tiles (TL highlight) |
| 2 | wall | Nearly-black / dark navy solid (no brick/neon stripe) |
| 3 | glass | glass |
| 4 | door | door |
| 5 | carpet | carpet |
| 6 | shadow | shadow |

## Props (v2 sizes)

| File | Size | Key | Notes |
|------|------|-----|-------|
| `desk.png` | **96×64** | `desk` | Chunky wood + BIG monitor (~1/3 face) + keyboard + mouse + mug + papers |
| `desk-laptop.png` | **96×64** | `desk-laptop` | Chunky wood + large silver laptop |
| `stool.png` | **48×48** | `stool` | Round light-beige wooden stool |
| `chair.png` | **48×48** | `chair` | Chunky office chair (CoS) |
| `plant.png` | **64×64** | `plant` | Bushy leafy pot (v5) |
| `plant-tall.png` | **64×64** | `plant-tall` | Tall leafy pot (v5) |
| `plant-large.png` | **64×64** | `plant-large` | Extra-bushy corner plant (v5) |
| `plant-succulent.png` | **48×48** | `plant-succulent` | Small succulent |
| `desk-empty.png` | **96×64** | `desk-empty` | Optional bare wood desk (no monitor) |
| `boxes.png` | **48×48** | `boxes` | Cardboard stack |
| `bookshelf.png` | **48×64** | `bookshelf` | Tall shelf |
| `cooler.png` | **40×64** | `cooler` | Water cooler |
| `coffee-station.png` | **64×64** | `coffee-station` | Counter + machine |
| `filing-cabinet.png` | **40×64** | `filing-cabinet` | Metal drawers |
| `whiteboard.png` | **64×40** | `whiteboard` | Wall board |
| `trash.png` | **40×48** | `trash` | Bin |

## Phaser / layout notes for SWE

- Desk footprint is larger: treat as **3×2 tiles** (96×64). Update hitboxes / blocked tiles.
- Prefer `stool` (48×48) at agent desks; `chair` for CoS.
- Origin: desks feet near bottom of sprite; sit agents at desk front edge.
- Thick dark outlines — nearest-neighbor / pixelArt mode.

## Regenerate

Re-run the furniture v2 generator used for this pass (Pixel Designer). Does **not** rewrite characters.

## v2b detail notes

- Monitor desks: **white** keyboard + **white** mouse + yellow mug; gray/white chunky bezel; thick black legs; darker wood
- Laptop desks: clear **silver** laptop (not blue slab)
- Plants: leafier clusters (less green cube)
- Sizes unchanged from v2 (96×64 desks, 48×48 stools)
- Preview: `refs/furniture-preview-v2b.png`

## v3 polish (characters + desks locked)

- **stool.png 48×48**: truly ROUND light-tan seat + short dark legs (target look)
- **tileset floor**: warmer medium-brown vertical planks (not washed pale)
- **tileset carpet**: CoS teal/navy + gold border accents
- **wall**: punchier navy + teal accent stripe
- **chair.png**: executive teal chair for CoS
- richer bookshelf spines, cooler, coffee, filing, whiteboard, leafier plants
- **desk.png / desk-laptop.png UNCHANGED** (v2b approved)
- Preview: `refs/furniture-preview-v3-color.png`

## desk-boss.png (command desk)

| File | Size | Key | Notes |
|------|------|-----|-------|
| `desk-boss.png` | **128×64** | `desk-boss` | Standing-height wide command desk. Chief stands **in front** (toward camera), not sit-behind. Chunky v2b wood, thick black legs, optional monitor, blotter + gold nameplate + papers + mug. Footprint ≈ **4×2 tiles**. |

Preview: `refs/furniture-preview-boss-desk.png`

## v4 border / floor polish

- **tileset floor**: darker medium-deep brown vertical planks (warmer/richer)
- **tileset wall**: clean dark GBA brick/solid wall — **no neon stripe**
- carpet/glass/door indices unchanged
- New edge props: `side-table.png` (48×32), `bench.png` (64×24)
- **desk.png / desk-boss.png / agent-*.png UNCHANGED**
- Edge fill preference: props (plants, boxes, cooler, whiteboard, filing, bench, side-table) over empty desks
- Preview: `refs/furniture-preview-v4-border.png`


## v5 edge / floor / plants (characters + desks locked)

Target: `refs/edge-floor-plants-target-user.jpeg`

- **Edges**: thick dark navy wall strips (`wall` idx 2) + dark gray hallway corridor (`gray` idx 1) beside wood — sharp vertical transition. Kill blue-gray brick stripe borders.
- **Wood floor**: much darker than v4 — deep mahogany / espresso planks + nails (`floor` idx 0).
- **Plants**: `plant.png` / `plant-tall.png` now **64×64**; new `plant-large.png` **64×64**. Origin still feet at bottom.
- **Optional** `desk-empty.png` 96×64 bare wood (no computer) for empty desks. SWE may also reuse `desk.png` / `desk-laptop.png` without sitters.
- **LOCKED**: `agent-*.png`, `desk.png`, `desk-laptop.png`, `desk-boss.png`
- Preview: `refs/furniture-preview-v5-edges.png`
- Regenerate: `python3 scripts/generate_furniture_v5.py`

### SWE notes

- Map left/right borders: col 0 = wall, col 1 = hallway gray, then wood floor (mirror on right).
- Plant sprites grew 48→64: keep `setOrigin(0.5, 1)`; may need 1-tile nudge so pots sit cleanly.
- To wire `plant-large` / `desk-empty`, add keys in preload (Pixel Designer does not ship code).


## Speech bubbles (UI art — characters/furniture LOCKED)

Original cream RPG comic bubbles for `Agent.showBubble` (replace plain white roundedRect).

| File | Size | Notes |
|------|------|-------|
| `bubble-9slice.png` | **48×48** | Cream fill, dark 2px outline, soft shadow. **Corner inset 8px** for Phaser NineSlice |
| `bubble-9slice-idle.png` | 48×48 | Green top accent |
| `bubble-9slice-waiting.png` | 48×48 | Purple top accent |
| `bubble-9slice-working.png` | 48×48 | Red top accent |
| `bubble-frame.png` | **96×28** | Fixed short-line frame (~12–28 chars) if not using 9-slice |
| `bubble-tail.png` | **16×12** | Down-pointing tail (cream + dark outline) |
| `bubble-tail-{idle,waiting,working}.png` | 16×12 | Tail with status tip tint |

Preview: `refs/bubble-preview.png`  
Regenerate: `python3 scripts/generate_bubbles.py`

### SWE wire notes

- Prefer NineSlice from `bubble-9slice.png` with left/right/top/bottom = **8**.
- Stack `bubble-tail.png` centered under the panel; text dark `#1c1814` on cream.
- Optional: swap sheet by agent status (idle/waiting/working accents).
- Characters + desk/furniture sprites **unchanged**.
