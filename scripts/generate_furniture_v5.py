#!/usr/bin/env python3
"""v5 edge/floor/plants — ORIGINAL Pillow art. Does NOT touch agent-*.png or locked desks."""
from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path("/workspace/grok-bot-pixel-office")
FURN = ROOT / "public/assets/furniture"
LEGACY = ROOT / "public/assets"
REFS = ROOT / "refs"
TILE = 32


def px(im: Image.Image, x: int, y: int, c):
    if 0 <= x < im.width and 0 <= y < im.height:
        im.putpixel((x, y), c)


def rect(im, x0, y0, x1, y1, c):
    for y in range(y0, y1):
        for x in range(x0, x1):
            px(im, x, y, c)


def outline_rect(im, x0, y0, x1, y1, c):
    for x in range(x0, x1):
        px(im, x, y0, c)
        px(im, x, y1 - 1, c)
    for y in range(y0, y1):
        px(im, x0, y, c)
        px(im, x1 - 1, y, c)


# --- Colors (v5) ---
# Espresso / mahogany floor (much darker than v4 ~111,73,43)
FLOOR_BASE = (58, 32, 20, 255)
FLOOR_MID = (72, 40, 24, 255)
FLOOR_HI = (88, 50, 30, 255)
FLOOR_LINE = (28, 14, 8, 255)
FLOOR_NAIL = (18, 10, 6, 255)

# Dark gray hallway tiles (polished)
HALL_BASE = (62, 66, 74, 255)
HALL_MID = (78, 82, 90, 255)
HALL_HI = (110, 116, 126, 255)
HALL_LINE = (40, 42, 48, 255)
HALL_CORNER = (130, 136, 146, 255)

# Nearly-black / dark navy wall (no brick stripe)
WALL = (18, 20, 32, 255)
WALL_MID = (28, 32, 48, 255)
WALL_LIP = (48, 56, 78, 255)
WALL_EDGE = (8, 10, 16, 255)

# Keep other tiles readable (from prior vibe, slightly darkened)
GLASS = (70, 110, 140, 180)
DOOR_WOOD = (90, 55, 32, 255)
CARPET = (36, 58, 72, 255)
CARPET_GOLD = (180, 150, 70, 255)
SHADOW = (0, 0, 0, 90)

OUT = (12, 10, 14, 255)
POT = (48, 50, 56, 255)
POT_HI = (78, 82, 90, 255)
LEAF1 = (46, 130, 62, 255)
LEAF2 = (34, 98, 48, 255)
LEAF3 = (72, 168, 88, 255)
LEAF_DK = (22, 64, 32, 255)


def make_floor() -> Image.Image:
    im = Image.new("RGBA", (TILE, TILE), (0, 0, 0, 0))
    # vertical planks ~6–7 px wide
    widths = [5, 6, 5, 6, 5, 5]
    x = 0
    for i, w in enumerate(widths):
        base = FLOOR_MID if i % 2 == 0 else FLOOR_BASE
        rect(im, x, 0, x + w, TILE, base)
        # subtle grain
        for gy in range(2, TILE, 4):
            px(im, x + 1, gy, FLOOR_HI if i % 2 else FLOOR_MID)
            px(im, x + w - 2, gy + 1, FLOOR_BASE)
        # nails near top/bottom
        nx = x + w // 2
        px(im, nx, 3, FLOOR_NAIL)
        px(im, nx, TILE - 4, FLOOR_NAIL)
        # plank divider
        if x + w < TILE:
            for y in range(TILE):
                px(im, x + w - 1, y, FLOOR_LINE)
        x += w
    return im


def make_hallway() -> Image.Image:
    """Dark gray polished square floor tiles with TL highlight."""
    im = Image.new("RGBA", (TILE, TILE), HALL_BASE)
    # 2x2 grid of 16px tiles
    for ty in (0, 16):
        for tx in (0, 16):
            rect(im, tx, ty, tx + 16, ty + 16, HALL_MID if (tx + ty) % 32 == 0 else HALL_BASE)
            # top-left highlight corner
            for i in range(5):
                px(im, tx + 1 + i, ty + 1, HALL_CORNER if i < 2 else HALL_HI)
                px(im, tx + 1, ty + 1 + i, HALL_CORNER if i < 2 else HALL_HI)
            # soft edge shade
            for i in range(16):
                px(im, tx + 15, ty + i, HALL_LINE)
                px(im, tx + i, ty + 15, HALL_LINE)
    outline_rect(im, 0, 0, TILE, TILE, HALL_LINE)
    return im


def make_wall() -> Image.Image:
    """Solid nearly-black / dark navy — clean, no brick stripe."""
    im = Image.new("RGBA", (TILE, TILE), WALL)
    for y in range(TILE):
        for x in range(2, TILE - 2):
            if x % 8 == 3:
                px(im, x, y, WALL_MID)
    for x in range(TILE):
        px(im, x, 0, WALL_LIP)
        px(im, x, 1, WALL_MID)
    for y in range(TILE):
        px(im, 0, y, WALL_EDGE)
        px(im, TILE - 1, y, WALL_EDGE)
    return im


def make_glass() -> Image.Image:
    im = Image.new("RGBA", (TILE, TILE), (90, 130, 160, 100))
    for y in range(TILE):
        for x in range(TILE):
            if (x + y) % 7 == 0:
                px(im, x, y, (140, 180, 210, 140))
    outline_rect(im, 0, 0, TILE, TILE, (40, 60, 80, 200))
    return im


def make_door() -> Image.Image:
    im = Image.new("RGBA", (TILE, TILE), DOOR_WOOD)
    rect(im, 4, 2, 28, 30, (110, 70, 42, 255))
    outline_rect(im, 4, 2, 28, 30, OUT)
    px(im, 24, 16, (200, 180, 80, 255))
    return im


def make_carpet() -> Image.Image:
    im = Image.new("RGBA", (TILE, TILE), CARPET)
    outline_rect(im, 1, 1, TILE - 1, TILE - 1, CARPET_GOLD)
    outline_rect(im, 0, 0, TILE, TILE, OUT)
    return im


def make_shadow() -> Image.Image:
    return Image.new("RGBA", (TILE, TILE), SHADOW)


def leaf_blob(im, cx, cy, r, c):
    for y in range(cy - r, cy + r + 1):
        for x in range(cx - r, cx + r + 1):
            if (x - cx) ** 2 + (y - cy) ** 2 <= r * r + (r // 2):
                px(im, x, y, c)


def draw_pot(im, cx, top, bot, w):
    # pot trapezoid-ish
    for y in range(top, bot):
        t = (y - top) / max(1, bot - top - 1)
        half = int(w // 2 - t * 2)
        for x in range(cx - half, cx + half + 1):
            px(im, x, y, POT_HI if y == top else POT)
    outline_rect(im, cx - w // 2, top, cx + w // 2 + 1, bot, OUT)
    # rim
    for x in range(cx - w // 2 - 1, cx + w // 2 + 2):
        px(im, x, top, POT_HI)
        px(im, x, top - 1, OUT)


def make_plant(size=64, style="bush") -> Image.Image:
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    cx = size // 2
    if style == "bush":
        pot_top, pot_bot, pot_w = size - 18, size - 2, 22
        draw_pot(im, cx, pot_top, pot_bot, pot_w)
        # big leafy clusters
        clusters = [
            (cx - 14, size // 2 - 4, 9, LEAF2),
            (cx + 12, size // 2 - 2, 9, LEAF1),
            (cx, size // 2 - 14, 11, LEAF3),
            (cx - 6, size // 2 + 2, 8, LEAF1),
            (cx + 6, size // 2 + 4, 8, LEAF2),
            (cx, size // 2 - 2, 10, LEAF3),
        ]
        for x, y, r, c in clusters:
            leaf_blob(im, x, y, r, c)
            leaf_blob(im, x - 2, y - 2, max(3, r // 2), LEAF_DK)
            # soft top crescent (no full black chords through foliage)
            for a in range(-r + 1, r):
                if abs(a) < r - 1:
                    px(im, x + a, y - r + 1, OUT)
    elif style == "tall":
        pot_top, pot_bot, pot_w = size - 16, size - 2, 18
        draw_pot(im, cx, pot_top, pot_bot, pot_w)
        # stem
        for y in range(10, pot_top):
            px(im, cx, y, LEAF_DK)
            px(im, cx - 1, y, LEAF2)
        clusters = [
            (cx, 14, 10, LEAF3),
            (cx - 10, 22, 8, LEAF1),
            (cx + 10, 24, 8, LEAF2),
            (cx - 6, 34, 7, LEAF3),
            (cx + 8, 36, 7, LEAF1),
            (cx, 28, 9, LEAF2),
        ]
        for x, y, r, c in clusters:
            leaf_blob(im, x, y, r, c)
    else:  # large extra bushy
        pot_top, pot_bot, pot_w = size - 16, size - 2, 26
        draw_pot(im, cx, pot_top, pot_bot, pot_w)
        clusters = [
            (cx - 18, size // 2 - 6, 11, LEAF2),
            (cx + 16, size // 2 - 4, 11, LEAF1),
            (cx, size // 2 - 18, 13, LEAF3),
            (cx - 8, size // 2 + 2, 10, LEAF1),
            (cx + 8, size // 2 + 4, 10, LEAF2),
            (cx - 14, size // 2 + 8, 8, LEAF3),
            (cx + 14, size // 2 + 10, 8, LEAF1),
            (cx, size // 2 - 4, 12, LEAF2),
        ]
        for x, y, r, c in clusters:
            leaf_blob(im, x, y, r, c)
            leaf_blob(im, x + 1, y - 3, max(3, r // 3), LEAF3)
    return im


def make_desk_empty() -> Image.Image:
    """96×64 bare wood top, no monitor/laptop — optional for empty desks."""
    w, h = 96, 64
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    # legs
    leg = (18, 16, 20, 255)
    for lx in (8, w - 14):
        rect(im, lx, 40, lx + 6, 62, leg)
        outline_rect(im, lx, 40, lx + 6, 62, OUT)
    # top
    wood = (92, 58, 34, 255)
    wood_dk = (68, 42, 24, 255)
    wood_hi = (118, 78, 48, 255)
    rect(im, 4, 18, w - 4, 44, wood)
    rect(im, 4, 18, w - 4, 22, wood_hi)
    rect(im, 4, 40, w - 4, 44, wood_dk)
    outline_rect(im, 4, 18, w - 4, 44, OUT)
    # subtle grain lines
    for gx in range(10, w - 10, 8):
        for gy in range(24, 40):
            if gy % 3 == 0:
                px(im, gx, gy, wood_dk)
    # tiny papers optional (bare-ish)
    rect(im, 14, 26, 28, 34, (230, 230, 220, 255))
    outline_rect(im, 14, 26, 28, 34, OUT)
    return im


def build_tileset() -> Image.Image:
    tiles = [
        make_floor(),
        make_hallway(),
        make_wall(),
        make_glass(),
        make_door(),
        make_carpet(),
        make_shadow(),
    ]
    sheet = Image.new("RGBA", (TILE * len(tiles), TILE), (0, 0, 0, 0))
    for i, t in enumerate(tiles):
        sheet.paste(t, (i * TILE, 0), t)
    return sheet


def build_preview(tileset, plant, plant_tall, plant_large, desk_empty) -> Image.Image:
    """Show edge wall | hallway | wood + plants at scale."""
    cols, rows = 18, 8
    preview = Image.new("RGBA", (cols * TILE, rows * TILE), (12, 12, 18, 255))
    wall = tileset.crop((2 * TILE, 0, 3 * TILE, TILE))
    hall = tileset.crop((1 * TILE, 0, 2 * TILE, TILE))
    floor = tileset.crop((0, 0, TILE, TILE))

    for r in range(rows):
        for c in range(cols):
            if c in (0, cols - 1):
                tile = wall
            elif c in (1, cols - 2):
                tile = hall
            else:
                tile = floor
            preview.paste(tile, (c * TILE, r * TILE))

    # plants along edges
    preview.paste(plant, (2 * TILE + 0, 2 * TILE), plant)
    preview.paste(plant_tall, (3 * TILE, 1 * TILE), plant_tall)
    preview.paste(plant_large, (cols * TILE // 2 - 32, 3 * TILE), plant_large)
    preview.paste(plant, ((cols - 4) * TILE, 2 * TILE), plant)
    # empty desk mid
    preview.paste(desk_empty, (6 * TILE, 4 * TILE), desk_empty)
    # label strip
    d = ImageDraw.Draw(preview)
    d.rectangle([0, 0, cols * TILE, 14], fill=(0, 0, 0, 180))
    d.text((4, 2), "v5 edges: wall | hallway | espresso floor + large plants", fill=(220, 220, 230, 255))
    return preview


def save(im: Image.Image, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, "PNG")
    print("wrote", path, im.size)


def main():
    tileset = build_tileset()
    save(tileset, FURN / "tileset.png")
    save(tileset, LEGACY / "tileset.png")

    plant = make_plant(64, "bush")
    plant_tall = make_plant(64, "tall")
    plant_large = make_plant(64, "large")
    for name, im in [("plant.png", plant), ("plant-tall.png", plant_tall), ("plant-large.png", plant_large)]:
        save(im, FURN / name)
        save(im, LEGACY / name)

    desk_empty = make_desk_empty()
    save(desk_empty, FURN / "desk-empty.png")
    save(desk_empty, LEGACY / "desk-empty.png")

    preview = build_preview(tileset, plant, plant_tall, plant_large, desk_empty)
    # also save 2x nearest for readability
    preview2 = preview.resize((preview.width * 2, preview.height * 2), Image.NEAREST)
    save(preview, REFS / "furniture-preview-v5-edges.png")
    save(preview2, REFS / "furniture-preview-v5-edges@2x.png")

    # upscaled tileset strip for QA
    save(tileset.resize((tileset.width * 8, tileset.height * 8), Image.NEAREST), REFS / "tileset-v5-up.png")


if __name__ == "__main__":
    main()
