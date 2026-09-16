# Character Art Spec — Grok Bot Pixel Office

**ORIGINAL Pillow art only.** Inspired by GBA Pokémon Fire Red top-down chibi proportions and Pixel Agents office vibe — never copy Nintendo or Pixel Agents proprietary pixels.

## Frame / sheet size (LOCKED)

| Property | Value |
|----------|-------|
| Frame size | **48×48** px |
| Sheet size | **480×48** px (10 frames × 48) |
| Phaser `frameWidth` / `frameHeight` | **48** (do not change) |

## Column animation map

| Cols | Animation | Frames |
|-----:|-----------|--------|
| 0–1 | walk-down | 2 |
| 2–3 | walk-up | 2 |
| 4–5 | walk-left | 2 |
| 6–7 | walk-right | 2 |
| 8–9 | sit/type (seated from behind, facing up) | 2 |

## File naming

- Primary: `agent-<id>.png`
- Folder: `public/assets/characters/`
- Legacy copies also at `public/assets/agent-<id>.png` until loader repoints

## Id → outfit

| id | Outfit |
|----|--------|
| `cos` | Blazer + tie |
| `github` | Hoodie + baseball cap |
| `linkedin` | Button-up |
| `x` | Streetwear jacket over graphic tee |
| `reddit` | Casual tee |
| `gmail` | Sweater (stripes) |
| `travel` | Jacket + sunglasses |
| `deal` | Hoodie + beanie |
| `flight` | Aviator jacket + shades + shoulder patches |
| `optimizer` | Glasses + polo |
| `swe` | Paint-splatter hoodie |

## Suggested Phaser load path

```ts
// preferred
`/assets/characters/agent-${id}.png`
// legacy still works
`/assets/agent-${id}.png`
```

Spritesheet config: `{ frameWidth: 48, frameHeight: 48 }`.

## Origin tip

Feet sit near the bottom of each 48×48 frame. Use display origin ≈ `(0.5, 0.88)` so characters plant on floor tiles.

## Regenerate

```bash
python3 scripts/generate_assets.py
```

Writes sheets to both `public/assets/` and `public/assets/characters/`, plus this `ART_SPEC.md`.
