#!/usr/bin/env python3
"""Generate ORIGINAL pixel-art assets for Grok Bot Pixel Office.
Style inspiration: GBA top-down / Pixel Agents office vibe — NO copied sprites.
"""
from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[1] / "public" / "assets"
OUT_CHARS = OUT / "characters"
REFS = Path(__file__).resolve().parents[1] / "refs"
TILE = 32
CHAR = 48  # locked: Phaser frameWidth=48; sheets are 480×48

# --- helpers ---------------------------------------------------------------

def new_rgba(w: int, h: int) -> Image.Image:
    return Image.new("RGBA", (w, h), (0, 0, 0, 0))


def px(img: Image.Image, x: int, y: int, color: tuple) -> None:
    if 0 <= x < img.width and 0 <= y < img.height:
        img.putpixel((x, y), color)


def fill_rect(img: Image.Image, x: int, y: int, w: int, h: int, color: tuple) -> None:
    for yy in range(y, y + h):
        for xx in range(x, x + w):
            px(img, xx, yy, color)


def outline_rect(img: Image.Image, x: int, y: int, w: int, h: int, color: tuple) -> None:
    for xx in range(x, x + w):
        px(img, xx, y, color)
        px(img, xx, y + h - 1, color)
    for yy in range(y, y + h):
        px(img, x, yy, color)
        px(img, x + w - 1, yy, color)



def fill_ellipse(img: Image.Image, x: int, y: int, w: int, h: int, color: tuple) -> None:
    """Filled pixel ellipse (inclusive bounding box x..x+w-1, y..y+h-1)."""
    if w <= 0 or h <= 0:
        return
    # Midpoint ellipse: paint any pixel whose center is inside the ellipse
    cx = x + (w - 1) / 2.0
    cy = y + (h - 1) / 2.0
    rx = max(0.5, w / 2.0)
    ry = max(0.5, h / 2.0)
    for yy in range(y, y + h):
        for xx in range(x, x + w):
            dx = (xx - cx) / rx
            dy = (yy - cy) / ry
            if dx * dx + dy * dy <= 1.05:
                px(img, xx, yy, color)


def outline_ellipse(img: Image.Image, x: int, y: int, w: int, h: int, color: tuple) -> None:
    """1px dark outline around an ellipse by ring difference."""
    if w <= 0 or h <= 0:
        return
    cx = x + (w - 1) / 2.0
    cy = y + (h - 1) / 2.0
    rx = max(0.5, w / 2.0)
    ry = max(0.5, h / 2.0)
    # slightly larger ring, then punch inner
    for yy in range(y - 1, y + h + 1):
        for xx in range(x - 1, x + w + 1):
            dx = (xx - cx) / (rx + 0.55)
            dy = (yy - cy) / (ry + 0.55)
            outer = dx * dx + dy * dy <= 1.08
            dx2 = (xx - cx) / max(0.4, rx - 0.35)
            dy2 = (yy - cy) / max(0.4, ry - 0.35)
            inner = dx2 * dx2 + dy2 * dy2 <= 1.0
            if outer and not inner:
                px(img, xx, yy, color)


def soft_shadow(img: Image.Image, cx: int, cy: int, w: int = 22, h: int = 5) -> None:
    """Soft ground ellipse under feet."""
    fill_ellipse(img, cx - w // 2, cy - h // 2, w, h, (0, 0, 0, 50))
    fill_ellipse(img, cx - w // 2 + 2, cy - h // 2 + 1, w - 4, max(2, h - 2), (0, 0, 0, 35))

def darken(c: tuple, amount: float = 0.7) -> tuple:
    r, g, b, a = c if len(c) == 4 else (*c, 255)
    return (int(r * amount), int(g * amount), int(b * amount), a)


def lighten(c: tuple, amount: float = 1.25) -> tuple:
    r, g, b, a = c if len(c) == 4 else (*c, 255)
    return (min(255, int(r * amount)), min(255, int(g * amount)), min(255, int(b * amount)), a)


def hex_to_rgba(h: int) -> tuple:
    return ((h >> 16) & 0xFF, (h >> 8) & 0xFF, h & 0xFF, 255)


# --- tiles -----------------------------------------------------------------

def tile_wood_floor() -> Image.Image:
    """Warm vertical wood planks — main open office."""
    img = new_rgba(TILE, TILE)
    base = (196, 148, 98, 255)
    plank_a = (186, 138, 88, 255)
    plank_b = (206, 158, 108, 255)
    seam = (150, 108, 68, 255)
    grain = (170, 124, 78, 255)
    fill_rect(img, 0, 0, TILE, TILE, base)
    # three vertical planks
    for i, col in enumerate([0, 11, 22]):
        c = plank_a if i % 2 == 0 else plank_b
        fill_rect(img, col, 0, 10 if i < 2 else 10, TILE, c)
        fill_rect(img, col + 10 if i < 2 else 31, 0, 1, TILE, seam)
    # grain dots
    for gy in (4, 12, 20, 28):
        px(img, 3, gy, grain)
        px(img, 14, gy + 2, grain)
        px(img, 25, gy + 1, grain)
    return img


def tile_gray_office() -> Image.Image:
    """Large gray office tile with grout."""
    img = new_rgba(TILE, TILE)
    fill_rect(img, 0, 0, TILE, TILE, (168, 176, 188, 255))
    fill_rect(img, 1, 1, TILE - 2, TILE - 2, (190, 198, 210, 255))
    # grout
    fill_rect(img, 0, 0, TILE, 1, (140, 148, 160, 255))
    fill_rect(img, 0, 0, 1, TILE, (140, 148, 160, 255))
    fill_rect(img, 0, TILE - 1, TILE, 1, (120, 128, 140, 255))
    fill_rect(img, TILE - 1, 0, 1, TILE, (120, 128, 140, 255))
    # subtle center highlight
    fill_rect(img, 10, 10, 4, 4, (200, 208, 220, 255))
    return img


def tile_wall() -> Image.Image:
    img = new_rgba(TILE, TILE)
    fill_rect(img, 0, 0, TILE, TILE, (40, 48, 64, 255))
    fill_rect(img, 2, 2, TILE - 4, TILE - 4, (58, 70, 92, 255))
    # top highlight strip (wall top edge feel)
    fill_rect(img, 2, 2, TILE - 4, 4, (78, 92, 118, 255))
    # brick-ish mid lines
    fill_rect(img, 2, 14, TILE - 4, 1, (48, 58, 76, 255))
    fill_rect(img, 16, 2, 1, TILE - 4, (48, 58, 76, 255))
    return img


def tile_glass() -> Image.Image:
    img = new_rgba(TILE, TILE)
    fill_rect(img, 0, 0, TILE, TILE, (30, 55, 90, 220))
    fill_rect(img, 2, 2, TILE - 4, TILE - 4, (120, 190, 230, 110))
    outline_rect(img, 1, 1, TILE - 2, TILE - 2, (148, 163, 184, 255))
    # specular
    fill_rect(img, 6, 4, 10, 3, (224, 242, 254, 90))
    fill_rect(img, 8, 18, 6, 2, (224, 242, 254, 60))
    return img


def tile_door() -> Image.Image:
    img = new_rgba(TILE, TILE)
    # floor peek under door
    fill_rect(img, 0, 0, TILE, TILE, (196, 148, 98, 255))
    fill_rect(img, 5, 1, 22, 30, (120, 72, 32, 255))
    fill_rect(img, 7, 3, 18, 26, (160, 98, 42, 255))
    # panel lines
    fill_rect(img, 9, 5, 14, 10, (140, 85, 35, 255))
    fill_rect(img, 9, 17, 14, 10, (140, 85, 35, 255))
    # knob
    fill_rect(img, 21, 14, 3, 3, (251, 191, 36, 255))
    outline_rect(img, 5, 1, 22, 30, (80, 48, 20, 255))
    return img


def tile_carpet() -> Image.Image:
    """Warm CoS office carpet with subtle weave."""
    img = new_rgba(TILE, TILE)
    fill_rect(img, 0, 0, TILE, TILE, (110, 58, 48, 255))
    for x in range(0, TILE, 4):
        fill_rect(img, x, 0, 2, TILE, (128, 72, 58, 255))
    for y in range(0, TILE, 8):
        for x in range(0, TILE, 8):
            px(img, x + 1, y + 2, (140, 82, 68, 255))
    fill_rect(img, 0, TILE - 1, TILE, 1, (90, 45, 38, 255))
    return img


def tile_shadow() -> Image.Image:
    img = new_rgba(TILE, TILE)
    fill_rect(img, 4, 22, 24, 8, (0, 0, 0, 55))
    return img


def make_tileset() -> None:
    tiles = [
        ("wood", tile_wood_floor()),
        ("gray", tile_gray_office()),
        ("wall", tile_wall()),
        ("glass", tile_glass()),
        ("door", tile_door()),
        ("carpet", tile_carpet()),
        ("shadow", tile_shadow()),
    ]
    sheet = new_rgba(TILE * len(tiles), TILE)
    for i, (_name, t) in enumerate(tiles):
        sheet.paste(t, (i * TILE, 0), t)
    sheet.save(OUT / "tileset.png")
    print(f"Wrote tileset.png ({sheet.width}x{sheet.height})")


# --- furniture -------------------------------------------------------------

def make_desk() -> Image.Image:
    """64x32 wooden desk with monitor + keyboard."""
    img = new_rgba(64, 32)
    # surface
    fill_rect(img, 2, 10, 60, 16, (150, 110, 70, 255))
    fill_rect(img, 2, 10, 60, 4, (180, 140, 95, 255))
    outline_rect(img, 2, 10, 60, 16, (90, 60, 35, 255))
    # legs
    fill_rect(img, 4, 26, 5, 5, (100, 70, 40, 255))
    fill_rect(img, 55, 26, 5, 5, (100, 70, 40, 255))
    # monitor bezel
    fill_rect(img, 20, 0, 24, 14, (30, 35, 48, 255))
    fill_rect(img, 22, 2, 20, 10, (100, 200, 230, 255))
    # screen glow lines
    fill_rect(img, 24, 4, 8, 1, (180, 240, 255, 255))
    fill_rect(img, 24, 7, 12, 1, (60, 140, 180, 255))
    fill_rect(img, 24, 9, 6, 1, (60, 140, 180, 255))
    # stand
    fill_rect(img, 30, 14, 4, 3, (50, 55, 70, 255))
    # keyboard
    fill_rect(img, 18, 20, 20, 4, (40, 45, 58, 255))
    fill_rect(img, 19, 21, 18, 2, (70, 78, 95, 255))
    # mouse
    fill_rect(img, 42, 21, 4, 3, (55, 60, 75, 255))
    return img


def make_chair() -> Image.Image:
    img = new_rgba(TILE, TILE)
    # seat
    fill_rect(img, 8, 16, 16, 8, (55, 70, 95, 255))
    outline_rect(img, 8, 16, 16, 8, (25, 35, 50, 255))
    # back
    fill_rect(img, 9, 6, 14, 12, (70, 90, 120, 255))
    outline_rect(img, 9, 6, 14, 12, (30, 40, 55, 255))
    # cushion highlight
    fill_rect(img, 11, 8, 10, 3, (90, 115, 145, 255))
    # legs / stem
    fill_rect(img, 14, 24, 4, 5, (35, 40, 55, 255))
    fill_rect(img, 10, 28, 12, 2, (35, 40, 55, 255))
    return img


def make_plant() -> Image.Image:
    img = new_rgba(TILE, TILE)
    # pot
    fill_rect(img, 11, 20, 10, 10, (170, 90, 45, 255))
    fill_rect(img, 10, 20, 12, 3, (190, 110, 60, 255))
    outline_rect(img, 11, 20, 10, 10, (110, 55, 25, 255))
    # soil
    fill_rect(img, 12, 21, 8, 2, (80, 50, 30, 255))
    # leaves bushy
    fill_rect(img, 10, 10, 12, 12, (40, 140, 70, 255))
    fill_rect(img, 8, 8, 6, 8, (50, 170, 85, 255))
    fill_rect(img, 18, 7, 6, 9, (34, 160, 75, 255))
    fill_rect(img, 13, 4, 6, 8, (60, 190, 95, 255))
    # leaf outline accents
    px(img, 9, 9, (20, 100, 50, 255))
    px(img, 22, 8, (20, 100, 50, 255))
    return img


def make_boxes() -> Image.Image:
    """Cardboard box stack."""
    img = new_rgba(TILE, TILE)
    # bottom box
    fill_rect(img, 4, 16, 24, 14, (180, 140, 90, 255))
    outline_rect(img, 4, 16, 24, 14, (110, 80, 45, 255))
    fill_rect(img, 4, 16, 24, 3, (200, 160, 110, 255))
    # tape
    fill_rect(img, 14, 16, 4, 14, (210, 180, 100, 255))
    # top box (smaller / offset)
    fill_rect(img, 8, 6, 18, 12, (190, 150, 100, 255))
    outline_rect(img, 8, 6, 18, 12, (110, 80, 45, 255))
    fill_rect(img, 8, 6, 18, 2, (210, 170, 120, 255))
    fill_rect(img, 15, 6, 3, 12, (210, 180, 100, 255))
    return img


def make_bookshelf() -> Image.Image:
    """32x48 tall bookshelf with colorful spines."""
    img = new_rgba(32, 48)
    fill_rect(img, 1, 0, 30, 48, (120, 80, 45, 255))
    outline_rect(img, 1, 0, 30, 48, (70, 45, 25, 255))
    shelves = [2, 16, 30]
    spine_colors = [
        (200, 70, 70, 255),
        (70, 120, 200, 255),
        (60, 160, 90, 255),
        (220, 180, 60, 255),
        (160, 90, 200, 255),
        (220, 120, 60, 255),
        (80, 180, 180, 255),
        (200, 100, 140, 255),
    ]
    for si, sy in enumerate(shelves):
        fill_rect(img, 2, sy + 12, 28, 2, (90, 60, 35, 255))  # shelf board
        x = 3
        for i in range(6):
            c = spine_colors[(si * 3 + i) % len(spine_colors)]
            w = 3 + (i % 2)
            h = 9 + (i % 3)
            fill_rect(img, x, sy + 12 - h, w, h, c)
            px(img, x, sy + 12 - h, darken(c, 0.75))
            x += w + 1
    return img


def make_cooler() -> Image.Image:
    """Water cooler 32x48."""
    img = new_rgba(32, 48)
    # jug (top)
    fill_rect(img, 8, 2, 16, 16, (140, 200, 230, 200))
    fill_rect(img, 10, 4, 12, 12, (100, 180, 220, 180))
    outline_rect(img, 8, 2, 16, 16, (80, 130, 160, 255))
    # water level
    fill_rect(img, 10, 10, 12, 6, (60, 150, 200, 160))
    # body
    fill_rect(img, 6, 18, 20, 26, (230, 235, 240, 255))
    outline_rect(img, 6, 18, 20, 26, (140, 150, 160, 255))
    # buttons
    fill_rect(img, 10, 24, 4, 4, (70, 140, 220, 255))
    fill_rect(img, 18, 24, 4, 4, (220, 90, 70, 255))
    # drip tray
    fill_rect(img, 10, 36, 12, 4, (180, 190, 200, 255))
    # cup niche
    fill_rect(img, 12, 30, 8, 6, (200, 210, 220, 255))
    return img


def make_furniture() -> None:
    pieces = {
        "desk.png": make_desk(),
        "chair.png": make_chair(),
        "plant.png": make_plant(),
        "boxes.png": make_boxes(),
        "bookshelf.png": make_bookshelf(),
        "cooler.png": make_cooler(),
    }
    for name, img in pieces.items():
        img.save(OUT / name)
        print(f"Wrote {name} ({img.width}x{img.height})")


# --- agents ----------------------------------------------------------------
# Fire Red–inspired ORIGINAL chibis: 48×48 frames, sheet 480×48 (Phaser-locked).
# Unique outfits / hair / skin / accessories — never copy Nintendo sheets.

OUTLINE = (20, 24, 32, 255)
PANTS_NAVY = (30, 41, 59, 255)
PANTS_DENIM = (55, 85, 140, 255)
PANTS_BLACK = (28, 28, 36, 255)
PANTS_KHAKI = (140, 120, 80, 255)
SHOES_DARK = (25, 30, 40, 255)
SHOES_WHITE = (230, 232, 240, 255)
SHOES_BROWN = (90, 55, 30, 255)

# Per-agent look: skin, hair, primary outfit colors, style flags
# hair_style: bangs | short | neat | messy | long | undercut
LOOKS = {
    "cos": {
        "skin": (255, 220, 185, 255),
        "skin_s": (230, 185, 145, 255),
        "hair": (45, 32, 28, 255),
        "hair_style": "neat",
        "shirt": (245, 158, 11, 255),
        "shirt2": (180, 100, 20, 255),
        "accent": (200, 40, 40, 255),
        "pants": PANTS_NAVY,
        "shoes": SHOES_BROWN,
        "outfit": "blazer_tie",
    },
    "github": {
        "skin": (240, 195, 160, 255),
        "skin_s": (210, 160, 125, 255),
        "hair": (55, 45, 70, 255),
        "hair_style": "messy",
        "shirt": (96, 165, 250, 255),
        "shirt2": (50, 110, 190, 255),
        "accent": (30, 40, 55, 255),
        "pants": PANTS_DENIM,
        "shoes": SHOES_WHITE,
        "outfit": "hoodie_cap",
    },
    "linkedin": {
        "skin": (210, 160, 120, 255),
        "skin_s": (175, 125, 90, 255),
        "hair": (30, 25, 22, 255),
        "hair_style": "short",
        "shirt": (56, 189, 248, 255),
        "shirt2": (30, 140, 200, 255),
        "accent": (255, 255, 255, 255),
        "pants": PANTS_NAVY,
        "shoes": SHOES_DARK,
        "outfit": "buttonup",
    },
    "x": {
        "skin": (250, 225, 195, 255),
        "skin_s": (220, 185, 150, 255),
        "hair": (20, 20, 25, 255),
        "hair_style": "undercut",
        "shirt": (40, 42, 50, 255),
        "shirt2": (220, 225, 235, 255),
        "accent": (120, 80, 200, 255),
        "pants": PANTS_BLACK,
        "shoes": SHOES_WHITE,
        "outfit": "streetwear",
    },
    "reddit": {
        "skin": (255, 210, 175, 255),
        "skin_s": (230, 175, 135, 255),
        "hair": (90, 50, 30, 255),
        "hair_style": "bangs",
        "shirt": (251, 146, 60, 255),
        "shirt2": (210, 100, 30, 255),
        "accent": (255, 220, 180, 255),
        "pants": PANTS_DENIM,
        "shoes": SHOES_DARK,
        "outfit": "casual_tee",
    },
    "gmail": {
        "skin": (180, 125, 90, 255),
        "skin_s": (145, 95, 65, 255),
        "hair": (35, 28, 40, 255),
        "hair_style": "long",
        "shirt": (248, 113, 113, 255),
        "shirt2": (200, 60, 70, 255),
        "accent": (180, 50, 55, 255),
        "pants": PANTS_NAVY,
        "shoes": SHOES_BROWN,
        "outfit": "sweater",
    },
    "travel": {
        "skin": (235, 185, 145, 255),
        "skin_s": (200, 150, 110, 255),
        "hair": (70, 45, 25, 255),
        "hair_style": "short",
        "shirt": (52, 211, 153, 255),
        "shirt2": (30, 150, 110, 255),
        "accent": (20, 20, 25, 255),
        "pants": PANTS_KHAKI,
        "shoes": SHOES_BROWN,
        "outfit": "jacket_shades",
    },
    "deal": {
        "skin": (255, 228, 200, 255),
        "skin_s": (230, 190, 155, 255),
        "hair": (160, 90, 200, 255),
        "hair_style": "messy",
        "shirt": (167, 139, 250, 255),
        "shirt2": (110, 80, 200, 255),
        "accent": (80, 50, 140, 255),
        "pants": PANTS_BLACK,
        "shoes": SHOES_WHITE,
        "outfit": "hoodie_beanie",
    },
    "flight": {
        "skin": (220, 170, 130, 255),
        "skin_s": (185, 135, 100, 255),
        "hair": (40, 35, 50, 255),
        "hair_style": "neat",
        "shirt": (45, 180, 175, 255),
        "shirt2": (25, 120, 120, 255),
        "accent": (30, 30, 35, 255),
        "pants": PANTS_NAVY,
        "shoes": SHOES_DARK,
        "outfit": "aviator",
    },
    "optimizer": {
        "skin": (245, 205, 170, 255),
        "skin_s": (215, 170, 130, 255),
        "hair": (100, 70, 40, 255),
        "hair_style": "neat",
        "shirt": (74, 222, 128, 255),
        "shirt2": (40, 170, 90, 255),
        "accent": (60, 70, 90, 255),
        "pants": PANTS_KHAKI,
        "shoes": SHOES_BROWN,
        "outfit": "polo_glasses",
    },
    "swe": {
        "skin": (255, 215, 190, 255),
        "skin_s": (225, 175, 145, 255),
        "hair": (30, 90, 140, 255),
        "hair_style": "messy",
        "shirt": (244, 114, 182, 255),
        "shirt2": (200, 60, 140, 255),
        "accent": (120, 220, 255, 255),
        "pants": PANTS_DENIM,
        "shoes": SHOES_WHITE,
        "outfit": "paint_hoodie",
        "paint": [(120, 220, 255, 255), (255, 230, 80, 255), (100, 255, 140, 255)],
    },
}


def draw_hair(img, ox, oy, look, facing, hy, hx, hw, hh):
    """Visible hair variety around round head."""
    hair = look["hair"]
    hair_d = darken(hair, 0.68)
    hair_l = lighten(hair, 1.25)
    style = look["hair_style"]
    outfit = look["outfit"]
    cover = outfit in ("hoodie_cap", "hoodie_beanie")

    if facing == "up":
        # full back-of-head hair dome
        fill_ellipse(img, ox + hx - 1, oy + hy - 1, hw + 2, hh - 1, hair)
        fill_rect(img, ox + hx + 2, oy + hy + hh - 5, hw - 4, 3, look["skin"])
        if style == "long":
            fill_rect(img, ox + hx - 2, oy + hy + 6, 3, hh - 1, hair)
            fill_rect(img, ox + hx + hw - 1, oy + hy + 6, 3, hh - 1, hair)
            fill_rect(img, ox + hx - 1, oy + hy + hh + 2, 2, 4, hair)
            fill_rect(img, ox + hx + hw - 1, oy + hy + hh + 2, 2, 4, hair)
        if style == "messy":
            px(img, ox + hx + 3, oy + hy - 2, hair)
            px(img, ox + hx + 8, oy + hy - 3, hair)
            px(img, ox + hx + 13, oy + hy - 2, hair)
            fill_rect(img, ox + hx + 5, oy + hy - 2, 3, 2, hair)
        return

    if not cover:
        # top hair cap over oval head
        fill_ellipse(img, ox + hx - 1, oy + hy - 2, hw + 2, 9, hair)
        fill_rect(img, ox + hx, oy + hy + 4, hw, 2, hair)

        if style == "messy":
            # spikes
            for sx, sy, sw, sh in [
                (hx - 1, hy - 3, 4, 4),
                (hx + 4, hy - 4, 5, 4),
                (hx + 10, hy - 3, 4, 3),
                (hx + hw - 2, hy - 2, 4, 4),
                (hx + 7, hy - 5, 3, 3),
            ]:
                fill_rect(img, ox + sx, oy + sy, sw, sh, hair)
            px(img, ox + hx + 6, oy + hy - 4, hair_d)
            px(img, ox + hx + 12, oy + hy - 3, hair_l)
        elif style == "bangs":
            fill_rect(img, ox + hx + 1, oy + hy + 3, 6, 4, hair)
            fill_rect(img, ox + hx + 9, oy + hy + 3, 6, 4, hair)
            fill_rect(img, ox + hx + 7, oy + hy + 4, 3, 3, hair)
            # fringe tips
            px(img, ox + hx + 3, oy + hy + 6, hair_d)
            px(img, ox + hx + 12, oy + hy + 6, hair_d)
        elif style == "long":
            fill_rect(img, ox + hx - 2, oy + hy + 3, 3, hh + 3, hair)
            fill_rect(img, ox + hx + hw - 1, oy + hy + 3, 3, hh + 3, hair)
            fill_rect(img, ox + hx - 2, oy + hy + hh + 2, 3, 5, hair)
            fill_rect(img, ox + hx + hw - 1, oy + hy + hh + 2, 3, 5, hair)
            fill_ellipse(img, ox + hx - 1, oy + hy - 2, hw + 2, 8, hair)
        elif style == "undercut":
            # faded sides + longer top
            fill_rect(img, ox + hx - 1, oy + hy + 4, 3, 7, hair_d)
            fill_rect(img, ox + hx + hw - 2, oy + hy + 4, 3, 7, hair_d)
            fill_ellipse(img, ox + hx + 1, oy + hy - 3, hw - 2, 8, hair)
            fill_rect(img, ox + hx + 2, oy + hy + 1, hw - 4, 4, hair)
            # swoop
            fill_rect(img, ox + hx + 3, oy + hy - 1, 8, 3, hair_l)
        elif style == "neat":
            fill_ellipse(img, ox + hx - 1, oy + hy - 2, hw + 2, 8, hair)
            fill_rect(img, ox + hx + 2, oy + hy, 4, 2, hair_l)  # side part gleam
            fill_rect(img, ox + hx - 1, oy + hy + 4, 2, 5, hair)
            fill_rect(img, ox + hx + hw - 1, oy + hy + 4, 2, 5, hair)
        elif style == "short":
            fill_ellipse(img, ox + hx, oy + hy - 1, hw, 7, hair)
            fill_rect(img, ox + hx - 1, oy + hy + 3, 2, 4, hair)
            fill_rect(img, ox + hx + hw - 1, oy + hy + 3, 2, 4, hair)

    if facing == "left":
        fill_rect(img, ox + hx + hw - 4, oy + hy + 1, 5, 9, hair)
        if style == "long":
            fill_rect(img, ox + hx + hw - 3, oy + hy + 8, 4, 10, hair)
        if style == "messy":
            fill_rect(img, ox + hx + hw - 2, oy + hy - 2, 4, 4, hair)
    elif facing == "right":
        fill_rect(img, ox + hx - 1, oy + hy + 1, 5, 9, hair)
        if style == "long":
            fill_rect(img, ox + hx - 1, oy + hy + 8, 4, 10, hair)
        if style == "messy":
            fill_rect(img, ox + hx - 2, oy + hy - 2, 4, 4, hair)
    else:  # down
        if not cover:
            fill_rect(img, ox + hx - 2, oy + hy + 5, 3, 6, hair)
            fill_rect(img, ox + hx + hw - 1, oy + hy + 5, 3, 6, hair)


def draw_face(img, ox, oy, look, facing, hy, hx, hw):
    """Extra-readable sparkling anime eyes for office zoom (SWE QA)."""
    skin = look["skin"]
    if facing == "up":
        return
    outline = OUTLINE
    white = (255, 255, 255, 255)
    sclera = (250, 252, 255, 255)
    iris = (55, 95, 170, 255)
    pupil = (18, 22, 36, 255)
    cheek = (255, 140, 150, 230)
    mouth = darken(skin, 0.72)
    # Larger eye boxes so catchlights survive downscale / desk zoom
    ew, eh = 6, 6
    ly = oy + hy + 7
    lx = ox + hx + 3
    rx = ox + hx + hw - 3 - ew

    def sparkle_eye(ex, ey):
        # white sclera first so eyes read bright at distance
        fill_rect(img, ex, ey, ew, eh, sclera)
        outline_rect(img, ex, ey, ew, eh, outline)
        # iris + pupil
        fill_rect(img, ex + 1, ey + 1, 4, 4, iris)
        fill_rect(img, ex + 2, ey + 2, 2, 2, pupil)
        # bright catchlights (2–3 px)
        px(img, ex + 1, ey + 1, white)
        px(img, ex + 2, ey + 1, white)
        px(img, ex + 1, ey + 2, white)
        px(img, ex + 4, ey + 4, (200, 220, 255, 230))

    if facing == "down":
        sparkle_eye(lx, ly)
        sparkle_eye(rx, ly)
        fill_rect(img, ox + hx + 3, oy + hy + 14, 3, 2, cheek)
        fill_rect(img, ox + hx + hw - 6, oy + hy + 14, 3, 2, cheek)
        fill_rect(img, ox + hx + hw // 2 - 2, oy + hy + 16, 4, 1, mouth)
        px(img, ox + hx + hw // 2 - 3, oy + hy + 15, mouth)
        px(img, ox + hx + hw // 2 + 2, oy + hy + 15, mouth)
    elif facing == "left":
        sparkle_eye(ox + hx + 2, ly)
        fill_rect(img, ox + hx + 2, oy + hy + 14, 3, 2, cheek)
        fill_rect(img, ox + hx + 5, oy + hy + 16, 3, 1, mouth)
    else:
        sparkle_eye(ox + hx + hw - 8, ly)
        fill_rect(img, ox + hx + hw - 5, oy + hy + 14, 3, 2, cheek)
        fill_rect(img, ox + hx + hw - 8, oy + hy + 16, 3, 1, mouth)

    outfit = look["outfit"]
    if outfit == "polo_glasses" and facing != "up":
        frame = look["accent"]
        if facing == "down":
            outline_rect(img, lx - 1, ly - 1, ew + 2, eh + 2, frame)
            outline_rect(img, rx - 1, ly - 1, ew + 2, eh + 2, frame)
            fill_rect(img, lx + ew, ly + 2, max(1, rx - (lx + ew)), 1, frame)
            # light lens tint over eyes, keep catchlights
            fill_rect(img, lx + 1, ly + 1, ew - 2, eh - 2, (180, 200, 220, 55))
            fill_rect(img, rx + 1, ly + 1, ew - 2, eh - 2, (180, 200, 220, 55))
            px(img, lx + 1, ly + 1, white)
            px(img, rx + 1, ly + 1, white)
        elif facing == "left":
            outline_rect(img, ox + hx + 1, ly - 1, ew + 2, eh + 2, frame)
        else:
            outline_rect(img, ox + hx + hw - 9, ly - 1, ew + 2, eh + 2, frame)

    if outfit in ("jacket_shades", "aviator") and facing != "up":
        # Keep shades, but add a bright specular so faces still pop
        lens = (22, 24, 34, 220)
        frame = look["accent"]
        if facing == "down":
            fill_rect(img, lx - 1, ly - 1, ew + 2, eh + 1, lens)
            fill_rect(img, rx - 1, ly - 1, ew + 2, eh + 1, lens)
            bridge = (218, 180, 60, 255) if outfit == "aviator" else frame
            fill_rect(img, lx + ew, ly + 1, max(1, rx - (lx + ew)), 2, bridge)
            px(img, lx, ly - 1, white)
            px(img, lx + 1, ly, (160, 170, 190, 255))
            px(img, rx, ly - 1, white)
            px(img, rx + 1, ly, (160, 170, 190, 255))
        elif facing == "left":
            fill_rect(img, ox + hx + 1, ly - 1, ew + 2, eh + 1, lens)
            px(img, ox + hx + 2, ly - 1, white)
        else:
            fill_rect(img, ox + hx + hw - 9, ly - 1, ew + 2, eh + 1, lens)
            px(img, ox + hx + hw - 8, ly - 1, white)


def draw_hat(img, ox, oy, look, facing, hy, hx, hw, bob):
    outfit = look["outfit"]
    if outfit == "hoodie_cap":
        brim = look["accent"]
        crown = darken(look["shirt"], 0.8)
        # rounded crown
        fill_ellipse(img, ox + hx - 2, oy + hy - 4 + bob, hw + 4, 9, crown)
        fill_rect(img, ox + hx - 1, oy + hy + 1 + bob, hw + 2, 3, crown)
        outline_ellipse(img, ox + hx - 2, oy + hy - 4 + bob, hw + 4, 9, OUTLINE)
        if facing == "down":
            fill_rect(img, ox + hx - 3, oy + hy + 3 + bob, hw + 6, 2, brim)
            outline_rect(img, ox + hx - 3, oy + hy + 3 + bob, hw + 6, 2, OUTLINE)
        elif facing == "left":
            fill_rect(img, ox + hx - 5, oy + hy + 2 + bob, 6, 2, brim)
        elif facing == "right":
            fill_rect(img, ox + hx + hw - 1, oy + hy + 2 + bob, 6, 2, brim)
        elif facing == "up":
            fill_ellipse(img, ox + hx - 2, oy + hy - 4 + bob, hw + 4, 10, crown)
            outline_ellipse(img, ox + hx - 2, oy + hy - 4 + bob, hw + 4, 10, OUTLINE)
    elif outfit == "hoodie_beanie":
        beanie = look["accent"]
        fill_ellipse(img, ox + hx - 2, oy + hy - 5 + bob, hw + 4, 11, beanie)
        fill_rect(img, ox + hx - 1, oy + hy + 1 + bob, hw + 2, 4, beanie)
        fill_rect(img, ox + hx, oy + hy - 5 + bob, hw, 2, lighten(beanie, 1.2))
        # rib band
        fill_rect(img, ox + hx - 1, oy + hy + 3 + bob, hw + 2, 2, darken(beanie, 0.75))
        # pom
        fill_ellipse(img, ox + hx + hw // 2 - 2, oy + hy - 8 + bob, 5, 4, lighten(beanie, 1.35))
        outline_ellipse(img, ox + hx - 2, oy + hy - 5 + bob, hw + 4, 11, OUTLINE)
        # purple hair peek
        fill_rect(img, ox + hx + 1, oy + hy + 4 + bob, 3, 2, look["hair"])
        fill_rect(img, ox + hx + hw - 4, oy + hy + 4 + bob, 3, 2, look["hair"])


def draw_outfit_body(img, ox, oy, look, facing, by, bob, leg_off, pose):
    """Body + arms + strong outfit silhouettes."""
    shirt = look["shirt"]
    shirt_d = look["shirt2"]
    shirt_l = lighten(shirt, 1.12)
    outfit = look["outfit"]
    skin = look["skin"]
    bw, bh = 20, 15
    bx = 14

    # slightly wider shoulders for jackets / blazers
    if outfit in ("blazer_tie", "streetwear", "jacket_shades", "aviator"):
        fill_rect(img, ox + bx - 1, oy + by, bw + 2, bh, shirt)
        outline_rect(img, ox + bx - 1, oy + by, bw + 2, bh, OUTLINE)
        fill_rect(img, ox + bx - 1, oy + by, bw + 2, 2, shirt_l)
        fill_rect(img, ox + bx - 1, oy + by + bh - 3, bw + 2, 3, shirt_d)
    else:
        fill_rect(img, ox + bx, oy + by, bw, bh, shirt)
        fill_rect(img, ox + bx, oy + by, bw, 2, shirt_l)
        fill_rect(img, ox + bx, oy + by + bh - 3, bw, 3, shirt_d)
        outline_rect(img, ox + bx, oy + by, bw, bh, OUTLINE)

    if outfit == "blazer_tie":
        fill_rect(img, ox + bx - 1, oy + by + 1, 4, bh - 2, shirt_d)
        fill_rect(img, ox + bx + bw - 3, oy + by + 1, 4, bh - 2, shirt_d)
        fill_rect(img, ox + bx + 6, oy + by + 1, 4, 5, (245, 240, 230, 255))
        fill_rect(img, ox + bx + 7, oy + by + 2, 2, 9, look["accent"])
        px(img, ox + bx + 7, oy + by + 2, lighten(look["accent"], 1.2))
        # lapel notches
        px(img, ox + bx + 2, oy + by + 3, shirt_l)
        px(img, ox + bx + bw - 3, oy + by + 3, shirt_l)
    elif outfit == "buttonup":
        fill_rect(img, ox + bx + 7, oy + by + 1, 2, bh - 2, look["accent"])
        for yy in (3, 6, 9):
            px(img, ox + bx + 7, oy + by + yy, shirt_d)
        fill_rect(img, ox + bx + 4, oy + by, 3, 2, look["accent"])
        fill_rect(img, ox + bx + 9, oy + by, 3, 2, look["accent"])
        # pocket
        outline_rect(img, ox + bx + 10, oy + by + 5, 4, 3, shirt_d)
    elif outfit in ("hoodie_cap", "hoodie_beanie", "paint_hoodie"):
        fill_rect(img, ox + bx + 3, oy + by + 6, 10, 5, shirt_d)
        outline_rect(img, ox + bx + 3, oy + by + 6, 10, 5, darken(shirt_d, 0.85))
        if facing == "down" and pose == "walk":
            fill_rect(img, ox + bx - 1, oy + by - 1, 3, 4, shirt_d)
            fill_rect(img, ox + bx + bw - 2, oy + by - 1, 3, 4, shirt_d)
        if outfit == "paint_hoodie":
            for px_, py_, c in [
                (bx + 4, by + 3, look["paint"][0]),
                (bx + 10, by + 5, look["paint"][1]),
                (bx + 6, by + 9, look["paint"][2]),
                (bx + 12, by + 2, look["paint"][0]),
                (bx + 2, by + 7, look["paint"][1]),
            ]:
                fill_rect(img, ox + px_, oy + py_, 2, 2, c)
                px(img, ox + px_ + 1, oy + py_ - 1, c)
    elif outfit == "streetwear":
        fill_rect(img, ox + bx + 5, oy + by + 2, 6, bh - 3, look["shirt2"])
        fill_rect(img, ox + bx + 6, oy + by + 4, 4, 4, look["accent"])
        fill_rect(img, ox + bx - 1, oy + by, 6, bh, shirt)
        fill_rect(img, ox + bx + bw - 5, oy + by, 6, bh, shirt)
        # jacket hem
        fill_rect(img, ox + bx - 1, oy + by + bh - 2, 6, 2, shirt_d)
        fill_rect(img, ox + bx + bw - 5, oy + by + bh - 2, 6, 2, shirt_d)
    elif outfit == "casual_tee":
        # short sleeves drawn with arms; chest print hint
        fill_rect(img, ox + bx + 5, oy + by + 4, 6, 3, shirt_d)
        fill_rect(img, ox + bx + 6, oy + by + 5, 4, 1, lighten(shirt, 1.3))
    elif outfit == "sweater":
        fill_rect(img, ox + bx + 1, oy + by + 3, bw - 2, 2, shirt_d)
        fill_rect(img, ox + bx + 1, oy + by + 7, bw - 2, 2, darken(shirt, 0.85))
        fill_rect(img, ox + bx + 1, oy + by + 10, bw - 2, 1, shirt_d)
        # crew neck
        fill_rect(img, ox + bx + 6, oy + by, 4, 2, darken(skin, 0.95))
    elif outfit in ("jacket_shades", "aviator"):
        fill_rect(img, ox + bx + 7, oy + by + 1, 2, bh - 2, (200, 200, 210, 255))
        fill_rect(img, ox + bx + 3, oy + by, 4, 3, shirt_d)
        fill_rect(img, ox + bx + 9, oy + by, 4, 3, shirt_d)
        if outfit == "aviator":
            # gold shoulder patches
            fill_rect(img, ox + bx - 1, oy + by + 1, 4, 4, (218, 180, 60, 255))
            fill_rect(img, ox + bx + bw - 3, oy + by + 1, 4, 4, (218, 180, 60, 255))
            outline_rect(img, ox + bx - 1, oy + by + 1, 4, 4, OUTLINE)
            outline_rect(img, ox + bx + bw - 3, oy + by + 1, 4, 4, OUTLINE)
            px(img, ox + bx, oy + by + 2, (255, 220, 100, 255))
    elif outfit == "polo_glasses":
        fill_rect(img, ox + bx + 5, oy + by, 3, 2, shirt_d)
        fill_rect(img, ox + bx + 8, oy + by, 3, 2, shirt_d)
        fill_rect(img, ox + bx + 7, oy + by + 2, 2, 5, lighten(shirt, 1.2))
        px(img, ox + bx + 7, oy + by + 4, shirt_d)
        # sleeve cuff bands
        fill_rect(img, ox + bx, oy + by + 1, 2, bh - 2, shirt_d)

    # arms
    if pose in ("type", "sit"):
        # seated from behind: arms reach forward/down toward keyboard, slight bob
        reach = 1 if leg_off else 0
        arm_y = oy + by + 3 + reach
        # upper arms
        fill_rect(img, ox + bx - 5, arm_y, 5, 5, shirt)
        fill_rect(img, ox + bx + bw, arm_y, 5, 5, shirt)
        outline_rect(img, ox + bx - 5, arm_y, 5, 5, OUTLINE)
        outline_rect(img, ox + bx + bw, arm_y, 5, 5, OUTLINE)
        # forearms toward center/keyboard
        fill_rect(img, ox + bx - 4, arm_y + 4, 6, 4, shirt_d if outfit != "casual_tee" else shirt)
        fill_rect(img, ox + bx + bw - 2, arm_y + 4, 6, 4, shirt_d if outfit != "casual_tee" else shirt)
        # hands on keys
        fill_rect(img, ox + bx + 1, arm_y + 6, 4, 3, skin)
        fill_rect(img, ox + bx + bw - 5, arm_y + 6, 4, 3, skin)
        outline_rect(img, ox + bx + 1, arm_y + 6, 4, 3, OUTLINE)
        outline_rect(img, ox + bx + bw - 5, arm_y + 6, 4, 3, OUTLINE)
        return

    if facing == "down":
        if outfit == "casual_tee":
            fill_rect(img, ox + bx - 4, oy + by + 2, 4, 5, shirt)
            fill_rect(img, ox + bx + bw, oy + by + 2, 4, 5, shirt)
            fill_rect(img, ox + bx - 4, oy + by + 6, 4, 6, skin)
            fill_rect(img, ox + bx + bw, oy + by + 6, 4, 6, skin)
            outline_rect(img, ox + bx - 4, oy + by + 2, 4, 10, OUTLINE)
            outline_rect(img, ox + bx + bw, oy + by + 2, 4, 10, OUTLINE)
        else:
            fill_rect(img, ox + bx - 4, oy + by + 2, 4, 8, shirt)
            fill_rect(img, ox + bx + bw, oy + by + 2, 4, 8, shirt)
            fill_rect(img, ox + bx - 4, oy + by + 9, 4, 3, skin)
            fill_rect(img, ox + bx + bw, oy + by + 9, 4, 3, skin)
            outline_rect(img, ox + bx - 4, oy + by + 2, 4, 10, OUTLINE)
            outline_rect(img, ox + bx + bw, oy + by + 2, 4, 10, OUTLINE)
    elif facing == "up":
        fill_rect(img, ox + bx - 4, oy + by + 2, 4, 8, shirt)
        fill_rect(img, ox + bx + bw, oy + by + 2, 4, 8, shirt)
        outline_rect(img, ox + bx - 4, oy + by + 2, 4, 8, OUTLINE)
        outline_rect(img, ox + bx + bw, oy + by + 2, 4, 8, OUTLINE)
    elif facing == "left":
        fill_rect(img, ox + bx - 4, oy + by + 3 + leg_off, 4, 7, shirt)
        fill_rect(img, ox + bx - 4, oy + by + 9 + leg_off, 4, 3, skin)
        outline_rect(img, ox + bx - 4, oy + by + 3 + leg_off, 4, 9, OUTLINE)
    else:
        fill_rect(img, ox + bx + bw, oy + by + 3 + leg_off, 4, 7, shirt)
        fill_rect(img, ox + bx + bw, oy + by + 9 + leg_off, 4, 3, skin)
        outline_rect(img, ox + bx + bw, oy + by + 3 + leg_off, 4, 9, OUTLINE)


def draw_round_head(img, ox, oy, look, hy, hx, hw, hh, facing):
    """Round chibi head ~18–20×16–18 with dark outline."""
    skin = look["skin"]
    skin_s = look["skin_s"]
    # soft oval fill
    fill_ellipse(img, ox + hx, oy + hy, hw, hh, skin)
    # cheek shade
    fill_ellipse(img, ox + hx + 1, oy + hy + hh // 2, 4, 5, skin_s)
    fill_ellipse(img, ox + hx + hw - 5, oy + hy + hh // 2, 4, 5, skin_s)
    # ears when facing down
    if facing == "down":
        fill_ellipse(img, ox + hx - 3, oy + hy + 6, 4, 5, darken(skin, 0.95))
        fill_ellipse(img, ox + hx + hw - 1, oy + hy + 6, 4, 5, darken(skin, 0.95))
        outline_ellipse(img, ox + hx - 3, oy + hy + 6, 4, 5, OUTLINE)
        outline_ellipse(img, ox + hx + hw - 1, oy + hy + 6, 4, 5, OUTLINE)
    outline_ellipse(img, ox + hx, oy + hy, hw, hh, OUTLINE)


def draw_chibi(
    img: Image.Image,
    ox: int,
    oy: int,
    agent_id: str,
    facing: str,
    frame: int,
    pose: str = "walk",
) -> None:
    """Draw one 48×48 Fire Red–style chibi into img at (ox, oy)."""
    look = LOOKS[agent_id]
    skin = look["skin"]
    pants = look["pants"]
    shoes = look["shoes"]

    soft_shadow(img, ox + 24, oy + 44, 22, 5)

    bob = 0
    leg_off = 0
    if pose == "walk":
        bob = 0 if frame == 0 else -1
        leg_off = 1 if frame == 1 else 0
    elif pose == "type":
        bob = 0 if frame == 0 else 1
        leg_off = frame

    # Head ~19×17 within 48 frame
    hx, hw, hh = 12, 24, 20
    hy = 1 + bob

    if pose in ("type", "sit"):
        # clearly seated from behind: lower in frame, hips wide, arms to keyboard
        soft_shadow(img, ox + 24, oy + 45, 28, 5)
        # chair seat cushion peek
        fill_rect(img, ox + 12, oy + 31 + bob, 24, 4, (50, 65, 90, 220))
        outline_rect(img, ox + 12, oy + 31 + bob, 24, 4, OUTLINE)
        # thighs splayed on seat (wider than walk)
        fill_rect(img, ox + 11, oy + 30 + bob, 12, 7, pants)
        fill_rect(img, ox + 25, oy + 30 + bob, 12, 7, pants)
        outline_rect(img, ox + 11, oy + 30 + bob, 12, 7, OUTLINE)
        outline_rect(img, ox + 25, oy + 30 + bob, 12, 7, OUTLINE)
        # lower legs hanging / feet on floor
        fill_rect(img, ox + 13, oy + 36 + bob, 8, 5, pants)
        fill_rect(img, ox + 27, oy + 36 + bob, 8, 5, pants)
        fill_rect(img, ox + 13, oy + 40 + bob, 8, 3, shoes)
        fill_rect(img, ox + 27, oy + 40 + bob, 8, 3, shoes)
        outline_rect(img, ox + 13, oy + 40 + bob, 8, 3, OUTLINE)
        outline_rect(img, ox + 27, oy + 40 + bob, 8, 3, OUTLINE)

        # torso lower than walk-up
        by = 18 + bob
        draw_outfit_body(img, ox, oy, look, "up", by, bob, leg_off, "type")
        # head slightly lower, from behind
        shy = hy + 2
        draw_round_head(img, ox, oy, look, shy, hx, hw, hh - 1, "up")
        draw_hair(img, ox, oy, look, "up", shy, hx, hw, hh - 1)
        draw_hat(img, ox, oy, look, "up", shy, hx, hw, bob)
        return

    # --- standing / walking ---
    ly0 = oy + 33 + bob
    if facing in ("down", "up"):
        fill_rect(img, ox + 14, ly0, 8, 9 + leg_off, pants)
        fill_rect(img, ox + 26, ly0 + (1 - leg_off), 8, 9 + (1 - leg_off), pants)
        outline_rect(img, ox + 14, ly0, 8, 9 + leg_off, OUTLINE)
        outline_rect(img, ox + 26, ly0 + (1 - leg_off), 8, 9 + (1 - leg_off), OUTLINE)
        fill_rect(img, ox + 14, ly0 + 8 + leg_off, 8, 3, shoes)
        fill_rect(img, ox + 26, ly0 + 9 - leg_off, 8, 3, shoes)
        outline_rect(img, ox + 14, ly0 + 8 + leg_off, 8, 3, OUTLINE)
        outline_rect(img, ox + 26, ly0 + 9 - leg_off, 8, 3, OUTLINE)
    elif facing == "left":
        fill_rect(img, ox + 18 - leg_off, ly0, 7, 8, pants)
        fill_rect(img, ox + 24 + leg_off, ly0 + 1, 7, 7, pants)
        outline_rect(img, ox + 18 - leg_off, ly0, 7, 8, OUTLINE)
        fill_rect(img, ox + 17 - leg_off, ly0 + 7, 7, 3, shoes)
        outline_rect(img, ox + 17 - leg_off, ly0 + 7, 7, 3, OUTLINE)
    else:
        fill_rect(img, ox + 23 + leg_off, ly0, 7, 8, pants)
        fill_rect(img, ox + 17 - leg_off, ly0 + 1, 7, 7, pants)
        outline_rect(img, ox + 23 + leg_off, ly0, 7, 8, OUTLINE)
        fill_rect(img, ox + 24 + leg_off, ly0 + 7, 7, 3, shoes)
        outline_rect(img, ox + 24 + leg_off, ly0 + 7, 7, 3, OUTLINE)

    by = 21 + bob
    draw_outfit_body(img, ox, oy, look, facing, by, bob, leg_off, "walk")

    draw_round_head(img, ox, oy, look, hy, hx, hw, hh, facing)
    draw_hair(img, ox, oy, look, facing, hy, hx, hw, hh)
    draw_face(img, ox, oy, look, facing, hy, hx, hw)
    draw_hat(img, ox, oy, look, facing, hy, hx, hw, bob)

    # neck
    if facing != "up":
        fill_rect(img, ox + hx + 7, oy + hy + hh - 2, 6, 3, darken(skin, 0.9))
        outline_rect(img, ox + hx + 7, oy + hy + hh - 2, 6, 3, OUTLINE)


def make_agent_sheet(agent_id: str, _color: int) -> Image.Image:
    """
    Sheet layout (10 frames × 48) — LOCKED for Phaser frameWidth=48:
      cols 0-1: walk down f0/f1
      cols 2-3: walk up
      cols 4-5: walk left
      cols 6-7: walk right
      cols 8-9: sit/type f0/f1
    Size: 480 × 48
    """
    img = new_rgba(CHAR * 10, CHAR)
    dirs = [
        ("down", 0),
        ("up", 2),
        ("left", 4),
        ("right", 6),
    ]
    for facing, col0 in dirs:
        for f in (0, 1):
            draw_chibi(img, (col0 + f) * CHAR, 0, agent_id, facing, f, "walk")
    for f in (0, 1):
        draw_chibi(img, (8 + f) * CHAR, 0, agent_id, "up", f, "type")

    # save to BOTH legacy path and characters/
    name = f"agent-{agent_id}.png"
    img.save(OUT / name)
    img.save(OUT_CHARS / name)
    # helpful alias
    img.save(OUT_CHARS / f"char-{agent_id}.png")
    print(f"Wrote {name} + characters/ ({img.width}x{img.height})")
    return img


AGENTS = [
    ("cos", 0xF59E0B),
    ("github", 0x60A5FA),
    ("linkedin", 0x38BDF8),
    ("x", 0xE5E7EB),
    ("reddit", 0xFB923C),
    ("gmail", 0xF87171),
    ("travel", 0x34D399),
    ("deal", 0xA78BFA),
    ("flight", 0x2DD4BF),
    ("optimizer", 0x4ADE80),
    ("swe", 0xF472B6),
]


def write_art_spec() -> None:
    text = """# Character Art Spec — Grok Bot Pixel Office

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
"""
    (OUT_CHARS / "ART_SPEC.md").write_text(text)
    print("Wrote characters/ART_SPEC.md")


def write_manifest() -> None:
    text = """# Asset Manifest (ORIGINAL art)

All PNGs generated by `scripts/generate_assets.py` with Python/Pillow.
Style inspiration only (GBA / Pokémon Fire Red–style chibi proportions & Pixel Agents office vibe).
**No Nintendo Fire Red ROM sprites. No Pixel Agents proprietary assets. Original Pillow art only.**

## Character sheets

See **`characters/ART_SPEC.md`** for full integration guide.

- Folder: `public/assets/characters/agent-<id>.png` (preferred)
- Legacy: `public/assets/agent-<id>.png` (same bytes; kept for current loader)
- Frame **48×48**, sheet **480×48**, Phaser `frameWidth=48` locked
- Cols: 0–1 down, 2–3 up, 4–5 left, 6–7 right, 8–9 sit/type

## tileset.png — 224×32 (7 × 32×32 tiles, left → right)

| Index | Key (runtime) | Description |
|------:|---------------|-------------|
| 0 | `tile-floor` | Warm wood plank floor (main office) |
| 1 | `tile-gray` | Gray office tile (optional / accent) |
| 2 | `tile-wall` | Dark navy wall block |
| 3 | `tile-glass` | Glass partition pane |
| 4 | `tile-door` | Wooden door on wood floor |
| 5 | `tile-carpet` | Warm CoS office carpet |
| 6 | `tile-shadow` | Soft ellipse shadow accent |

## Furniture (separate PNGs)

| File | Size | Key | Notes |
|------|------|-----|-------|
| `desk.png` | 64×32 | `desk` | Wood desk + monitor + keyboard + mouse |
| `chair.png` | 32×32 | `chair` | Office chair |
| `plant.png` | 32×32 | `plant` | Terracotta pot + leafy plant |
| `boxes.png` | 32×32 | `boxes` | Stacked cardboard boxes |
| `bookshelf.png` | 32×48 | `bookshelf` | Tall shelf with colored spines |
| `cooler.png` | 32×48 | `cooler` | Water cooler with jug |

## Agent ids & outfits

| id | Outfit vibe |
|----|-------------|
| `cos` | Manager blazer + tie, neat hair |
| `github` | Hoodie + baseball cap |
| `linkedin` | Button-up shirt |
| `x` | Streetwear jacket + graphic tee |
| `reddit` | Casual tee |
| `gmail` | Sweater |
| `travel` | Jacket + sunglasses |
| `deal` | Hoodie + beanie |
| `flight` | Aviator jacket + shades |
| `optimizer` | Glasses + polo |
| `swe` | Paint-splatter hoodie |

## Regenerate

```bash
python3 scripts/generate_assets.py
```
"""
    (OUT / "MANIFEST.md").write_text(text)
    print("Wrote MANIFEST.md")


def make_previews(sheets: dict) -> None:
    """Roster strip + cos ×3 nearest-neighbor preview."""
    REFS.mkdir(parents=True, exist_ok=True)
    # roster: all 11 facing down f0
    pad = 8
    cell = CHAR + pad
    roster = new_rgba(pad + cell * len(AGENTS), CHAR + pad * 2)
    # dark bg
    fill_rect(roster, 0, 0, roster.width, roster.height, (18, 20, 28, 255))
    for i, (aid, _) in enumerate(AGENTS):
        sheet = sheets[aid]
        frame = sheet.crop((0, 0, CHAR, CHAR))
        roster.paste(frame, (pad + i * cell, pad), frame)
    roster_path = REFS / "character-roster-preview.png"
    roster.save(roster_path)
    print(f"Wrote {roster_path}")

    # cos sheet ×3 NN
    cos = sheets["cos"]
    x3 = cos.resize((cos.width * 3, cos.height * 3), Image.NEAREST)
    # put on dark bg with padding
    preview = new_rgba(x3.width + 16, x3.height + 16)
    fill_rect(preview, 0, 0, preview.width, preview.height, (12, 14, 20, 255))
    preview.paste(x3, (8, 8), x3)
    cos_path = REFS / "agent-cos-x3.png"
    preview.save(cos_path)
    print(f"Wrote {cos_path}")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    OUT_CHARS.mkdir(parents=True, exist_ok=True)
    REFS.mkdir(parents=True, exist_ok=True)
    # Characters-only pass (character step order) — skip furniture/rooms redesign
    # make_tileset()
    # make_furniture()
    sheets = {}
    for aid, color in AGENTS:
        sheets[aid] = make_agent_sheet(aid, color)
    write_art_spec()
    write_manifest()
    make_previews(sheets)
    print("Done.")


if __name__ == "__main__":
    main()
