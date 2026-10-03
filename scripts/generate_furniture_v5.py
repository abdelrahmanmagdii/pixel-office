#!/usr/bin/env python3
"""v5 edge/floor/plants — ORIGINAL Pillow art. Does NOT touch agent-*.png or locked desks."""
from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
FURN = ROOT / "public/assets/furniture"
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
FLOOR_BASE = (74, 45, 28, 255)
FLOOR_MID = (80, 49, 31, 255)
FLOOR_HI = (90, 56, 35, 255)
FLOOR_LINE = (56, 33, 20, 255)
FLOOR_JOINT = (50, 29, 18, 255)

# Painted north wall face + wood wainscot
WFACE = (58, 68, 92, 255)
WFACE_HI = (68, 79, 105, 255)
WFACE_DK = (44, 52, 72, 255)
WAINSCOT = (70, 44, 28, 255)
WAINSCOT_HI = (92, 60, 38, 255)
BASEBOARD = (30, 20, 14, 255)
SKY = (132, 186, 226, 255)
SKY_HI = (196, 228, 248, 255)
SKY_LO = (104, 160, 206, 255)
FRAME = (226, 222, 210, 255)
FRAME_DK = (150, 146, 136, 255)

# Dark gray hallway tiles (polished)
HALL_BASE = (50, 54, 62, 255)
HALL_MID = (54, 58, 66, 255)
HALL_LINE = (40, 43, 50, 255)

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
    """Calm vertical planks: low-contrast seams, staggered end joints, no nails."""
    im = Image.new("RGBA", (TILE, TILE), (0, 0, 0, 0))
    widths = [8, 8, 8, 8]
    joints = [5, 21, 13, 28]
    x = 0
    for i, w in enumerate(widths):
        base = FLOOR_MID if i % 2 == 0 else FLOOR_BASE
        rect(im, x, 0, x + w, TILE, base)
        for gy in range(1, TILE, 6):
            px(im, x + 2 + (gy // 6) % 3, (gy + i * 3) % TILE, FLOOR_HI)
        for jx in range(x, x + w - 1):
            px(im, jx, joints[i], FLOOR_JOINT)
        for y in range(TILE):
            px(im, x + w - 1, y, FLOOR_LINE)
        x += w
    return im


def make_hallway() -> Image.Image:
    """Flat slate runner, faint grout only."""
    im = Image.new("RGBA", (TILE, TILE), HALL_BASE)
    rect(im, 0, 0, TILE, 16, HALL_MID)
    for i in range(TILE):
        px(im, i, 15, HALL_LINE)
        px(im, i, 31, HALL_LINE)
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


def make_wallface() -> Image.Image:
    """North wall face: painted upper wall, wood wainscot, dark baseboard."""
    im = Image.new("RGBA", (TILE, TILE), WFACE)
    rect(im, 0, 0, TILE, 2, WFACE_DK)
    for x in range(0, TILE, 4):
        px(im, x + 1, 6 + (x // 4) % 3, WFACE_HI)
    rect(im, 0, 20, TILE, 29, WAINSCOT)
    rect(im, 0, 20, TILE, 21, WAINSCOT_HI)
    for x in (7, 15, 23, 31):
        rect(im, x, 21, x + 1, 29, BASEBOARD)
    rect(im, 0, 29, TILE, TILE, BASEBOARD)
    return im


def make_window() -> Image.Image:
    """Wall face with a framed window (sky glass + diagonal glare)."""
    im = make_wallface()
    rect(im, 3, 2, 29, 19, FRAME)
    rect(im, 5, 4, 27, 17, SKY)
    rect(im, 5, 13, 27, 17, SKY_LO)
    for i in range(6):
        px(im, 8 + i, 10 - i, SKY_HI)
        px(im, 9 + i, 10 - i, SKY_HI)
    rect(im, 15, 4, 17, 17, FRAME)
    rect(im, 2, 18, 30, 20, FRAME_DK)
    outline_rect(im, 3, 2, 29, 19, FRAME_DK)
    return im


def make_rug() -> Image.Image:
    """24×24 nine-slice rug (8px corners); light neutral so Phaser tint sets the zone colour."""
    im = Image.new("RGBA", (24, 24), (210, 210, 210, 255))
    outline_rect(im, 0, 0, 24, 24, (120, 120, 120, 255))
    outline_rect(im, 2, 2, 22, 22, (250, 250, 250, 255))
    outline_rect(im, 3, 3, 21, 21, (160, 160, 160, 255))
    for i in range(5, 19, 2):
        px(im, i, 1, (250, 250, 250, 255))
        px(im, i, 22, (250, 250, 250, 255))
        px(im, 1, i, (250, 250, 250, 255))
        px(im, 22, i, (250, 250, 250, 255))
    return im


def make_clock() -> Image.Image:
    """16×16 wall clock face (hands are drawn live in the scene)."""
    im = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse([0, 0, 15, 15], fill=OUT)
    d.ellipse([1, 1, 14, 14], fill=(200, 160, 70, 255))
    d.ellipse([2, 2, 13, 13], fill=(246, 242, 230, 255))
    for x, y in ((7, 3), (12, 7), (7, 12), (3, 7)):
        px(im, x, y, OUT)
        px(im, x + 1 if x in (7,) else x, y + 1 if y in (7,) else y, OUT)
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


def make_desk_back(w: int, kind: str) -> Image.Image:
    """Desk seen from the visitor side: agent sits north, screen backs face the camera."""
    im = Image.new("RGBA", (w, 64), (0, 0, 0, 0))
    top, top_hi, edge, leg = (150, 98, 58, 255), (172, 118, 72, 255), (104, 64, 36, 255), (38, 30, 28, 255)
    rect(im, 1, 16, w - 1, 44, top)
    rect(im, 1, 16, w - 1, 18, top_hi)
    for x in range(8, w - 8, 22):
        rect(im, x, 24, x + 10, 25, (138, 90, 52, 255))
    rect(im, 1, 44, w - 1, 51, edge)
    outline_rect(im, 0, 15, w, 52, OUT)
    for lx in (4, w - 10):
        rect(im, lx, 52, lx + 6, 62, leg)
        outline_rect(im, lx - 1, 51, lx + 7, 63, OUT)
    # desk clutter
    rect(im, 7, 30, 19, 38, (236, 232, 220, 255))
    outline_rect(im, 6, 29, 20, 39, OUT)
    rect(im, w - 17, 28, w - 10, 37, (236, 186, 64, 255))
    outline_rect(im, w - 18, 27, w - 9, 38, OUT)

    def monitor(cx: int, mw: int) -> None:
        x0, x1 = cx - mw // 2, cx + mw // 2
        rect(im, x0, 1, x1, 21, (74, 82, 98, 255))
        rect(im, x0 + 1, 2, x1 - 1, 3, (104, 114, 132, 255))
        for vy in (8, 11, 14):
            rect(im, cx - 6, vy, cx + 6, vy + 1, (58, 64, 78, 255))
        outline_rect(im, x0 - 1, 0, x1 + 1, 22, OUT)
        rect(im, cx - 2, 22, cx + 2, 28, (60, 66, 80, 255))
        rect(im, cx - 7, 27, cx + 7, 30, (60, 66, 80, 255))
        outline_rect(im, cx - 8, 26, cx + 8, 31, OUT)
        px(im, x1 - 3, 18, (110, 231, 183, 255))

    cx = w // 2
    if kind == "monitor":
        monitor(cx, 34)
    elif kind == "laptop":
        rect(im, cx - 15, 8, cx + 15, 27, (176, 182, 194, 255))
        rect(im, cx - 14, 9, cx + 14, 10, (206, 212, 222, 255))
        rect(im, cx - 2, 15, cx + 2, 19, (236, 240, 246, 255))
        outline_rect(im, cx - 16, 7, cx + 16, 28, OUT)
        rect(im, cx - 17, 28, cx + 17, 31, (140, 146, 158, 255))
        outline_rect(im, cx - 18, 27, cx + 18, 32, OUT)
    else:  # dual
        monitor(cx - 20, 34)
        monitor(cx + 20, 34)
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
        make_wallface(),
        make_window(),
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

    plant = make_plant(64, "bush")
    plant_tall = make_plant(64, "tall")
    plant_large = make_plant(64, "large")
    for name, im in [("plant.png", plant), ("plant-tall.png", plant_tall), ("plant-large.png", plant_large)]:
        save(im, FURN / name)

    save(make_rug(), FURN / "rug.png")
    save(make_clock(), FURN / "clock.png")

    save(make_desk_back(96, "monitor"), FURN / "desk-back.png")
    save(make_desk_back(96, "laptop"), FURN / "desk-laptop-back.png")
    save(make_desk_back(128, "dual"), FURN / "desk-boss-back.png")

    desk_empty = make_desk_empty()
    save(desk_empty, FURN / "desk-empty.png")

    preview = build_preview(tileset, plant, plant_tall, plant_large, desk_empty)
    # also save 2x nearest for readability
    preview2 = preview.resize((preview.width * 2, preview.height * 2), Image.NEAREST)
    save(preview, REFS / "furniture-preview-v5-edges.png")
    save(preview2, REFS / "furniture-preview-v5-edges@2x.png")

    # upscaled tileset strip for QA
    save(tileset.resize((tileset.width * 8, tileset.height * 8), Image.NEAREST), REFS / "tileset-v5-up.png")


if __name__ == "__main__":
    main()
