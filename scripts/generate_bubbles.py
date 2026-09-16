#!/usr/bin/env python3
"""Fire Red–inspired ORIGINAL speech bubble art. Characters/furniture untouched."""
from __future__ import annotations
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path("/workspace/grok-bot-pixel-office")
FURN = ROOT / "public/assets/furniture"
LEGACY = ROOT / "public/assets"
REFS = ROOT / "refs"

CREAM = (255, 248, 231, 255)
CREAM_IN = (255, 252, 242, 255)
OUT = (28, 24, 20, 255)
OUT2 = (48, 40, 32, 255)
SHADOW = (0, 0, 0, 55)
TEXT = (28, 24, 20, 255)

IDLE = (52, 180, 120, 255)      # green
WAITING = (168, 100, 230, 255)  # purple
WORKING = (230, 90, 90, 255)    # red


def px(im, x, y, c):
    if 0 <= x < im.width and 0 <= y < im.height:
        im.putpixel((x, y), c)


def rect(im, x0, y0, x1, y1, c):
    for y in range(y0, y1):
        for x in range(x0, x1):
            px(im, x, y, c)


def make_9slice(size=48, border_color=OUT, accent=None, shadow=True) -> Image.Image:
    """Square 9-slice panel. Corner inset = 8px (Phaser left/right/top/bottom)."""
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    # soft shadow offset
    if shadow:
        for y in range(3, size):
            for x in range(3, size):
                # rounded-ish shadow blob
                if _in_round_rect(x - 2, y - 2, size - 3, size - 3, 6):
                    px(im, x, y, SHADOW)

    # fill rounded rect
    x0, y0, x1, y1 = 1, 1, size - 3, size - 3
    for y in range(y0, y1):
        for x in range(x0, x1):
            if _in_round_rect(x, y, x0, y0, x1, y1, 5):
                # slight inner gradient
                px(im, x, y, CREAM_IN if y < y0 + 4 else CREAM)

    # 2px dark outline (outer + inner)
    _stroke_round(im, x0, y0, x1, y1, 5, OUT)
    _stroke_round(im, x0 + 1, y0 + 1, x1 - 1, y1 - 1, 4, OUT2)

    # optional status accent as 2px top border tint inside outline
    if accent:
        for x in range(x0 + 4, x1 - 4):
            px(im, x, y0 + 2, accent)
            px(im, x, y0 + 3, accent)

    return im


def _in_round_rect(x, y, x0, y0, x1=None, y1=None, r=5):
    # overload: (x,y,w,h,r) vs (x,y,x0,y0,x1,y1,r)
    if y1 is None:
        # called as _in_round_rect(x,y,w,h,r) — legacy unused
        return True
    # corners
    if x < x0 + r and y < y0 + r:
        return (x - (x0 + r)) ** 2 + (y - (y0 + r)) ** 2 <= r * r
    if x >= x1 - r and y < y0 + r:
        return (x - (x1 - r - 1)) ** 2 + (y - (y0 + r)) ** 2 <= r * r
    if x < x0 + r and y >= y1 - r:
        return (x - (x0 + r)) ** 2 + (y - (y1 - r - 1)) ** 2 <= r * r
    if x >= x1 - r and y >= y1 - r:
        return (x - (x1 - r - 1)) ** 2 + (y - (y1 - r - 1)) ** 2 <= r * r
    return x0 <= x < x1 and y0 <= y < y1


def _stroke_round(im, x0, y0, x1, y1, r, c):
    # draw outline by testing edge of round rect
    for y in range(y0 - 1, y1 + 1):
        for x in range(x0 - 1, x1 + 1):
            inside = _in_round_rect(x, y, x0, y0, x1, y1, r)
            # neighbor outside?
            if not inside:
                continue
            for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                if not _in_round_rect(x + dx, y + dy, x0, y0, x1, y1, r):
                    px(im, x, y, c)
                    break


def make_tail(border_color=OUT, fill=CREAM, accent=None, w=16, h=12) -> Image.Image:
    """Down-pointing comic tail, tip at bottom center."""
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    # shadow
    for y in range(h):
        t = y / max(1, h - 1)
        half = int((1 - t) * (w // 2 - 1))
        for x in range(w // 2 - half, w // 2 + half + 1):
            if y > 0:
                px(im, min(w - 1, x + 1), min(h - 1, y + 1), SHADOW)
    # fill triangle
    for y in range(h):
        t = y / max(1, h - 1)
        half = int((1 - t) * (w // 2 - 1))
        for x in range(w // 2 - half, w // 2 + half + 1):
            px(im, x, y, fill)
    # outline left/right edges
    for y in range(h):
        t = y / max(1, h - 1)
        half = int((1 - t) * (w // 2 - 1))
        px(im, w // 2 - half, y, border_color)
        px(im, w // 2 + half, y, border_color)
    # top edge flat under bubble
    for x in range(2, w - 2):
        px(im, x, 0, fill)  # seam into cream body
    px(im, w // 2, h - 1, border_color)
    if accent:
        px(im, w // 2, h - 2, accent)
        px(im, w // 2 - 1, h - 3, accent)
        px(im, w // 2 + 1, h - 3, accent)
    return im


def make_frame_fixed(w=80, h=28, accent=None) -> Image.Image:
    """Fixed short-line frame (~12–28 chars at 10px). Not 9-slice."""
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    # shadow
    for y in range(2, h):
        for x in range(2, w):
            if _in_round_rect(x - 1, y - 1, 1, 1, w - 2, h - 2, 4):
                px(im, x, y, SHADOW)
    x0, y0, x1, y1 = 1, 1, w - 3, h - 3
    for y in range(y0, y1):
        for x in range(x0, x1):
            if _in_round_rect(x, y, x0, y0, x1, y1, 4):
                px(im, x, y, CREAM)
    _stroke_round(im, x0, y0, x1, y1, 4, OUT)
    _stroke_round(im, x0 + 1, y0 + 1, x1 - 1, y1 - 1, 3, OUT2)
    if accent:
        for x in range(x0 + 3, x1 - 3):
            px(im, x, y0 + 2, accent)
    return im


def compose_preview() -> Image.Image:
    W, H = 420, 220
    bg = Image.new("RGBA", (W, H), (40, 44, 56, 255))
    # floor hint
    for y in range(H):
        for x in range(W):
            if (x // 8 + y // 8) % 2 == 0:
                px(bg, x, y, (48, 52, 64, 255))

    variants = [
        ("default", None, 20, 40),
        ("idle", IDLE, 150, 40),
        ("waiting", WAITING, 280, 40),
        ("working", WORKING, 80, 130),
    ]
    draw = ImageDraw.Draw(bg)
    for name, accent, x, y in variants:
        panel = make_9slice(48, accent=accent)
        # stretch demo: paste 9-slice as-is then a wider frame
        bg.paste(panel, (x, y), panel)
        frame = make_frame_fixed(96, 28, accent=accent)
        bg.paste(frame, (x - 24, y + 56), frame)
        tail = make_tail(accent=accent)
        bg.paste(tail, (x + 16, y + 56 + 26), tail)
        # sample text
        draw.text((x - 12, y + 62), "On it!", fill=TEXT)
        draw.text((x, y + 8), name, fill=(200, 200, 210, 255))

    draw.text((12, 8), "Speech bubbles — cream RPG comic / 9-slice + tail", fill=(230, 230, 240, 255))
    draw.text((12, H - 18), "corner inset 8px · short lines ~12–28 chars", fill=(160, 160, 170, 255))
    return bg


def save(im: Image.Image, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, "PNG")
    print("wrote", path.relative_to(ROOT), im.size)


def main():
    base = make_9slice(48)
    save(base, FURN / "bubble-9slice.png")
    save(base, LEGACY / "bubble-9slice.png")

    for name, accent in [("idle", IDLE), ("waiting", WAITING), ("working", WORKING)]:
        im = make_9slice(48, accent=accent)
        save(im, FURN / f"bubble-9slice-{name}.png")
        save(im, LEGACY / f"bubble-9slice-{name}.png")

    frame = make_frame_fixed(96, 28)
    save(frame, FURN / "bubble-frame.png")
    save(frame, LEGACY / "bubble-frame.png")

    tail = make_tail()
    save(tail, FURN / "bubble-tail.png")
    save(tail, LEGACY / "bubble-tail.png")
    for name, accent in [("idle", IDLE), ("waiting", WAITING), ("working", WORKING)]:
        t = make_tail(accent=accent)
        save(t, FURN / f"bubble-tail-{name}.png")
        save(t, LEGACY / f"bubble-tail-{name}.png")

    preview = compose_preview()
    save(preview, REFS / "bubble-preview.png")
    save(preview.resize((preview.width * 2, preview.height * 2), Image.NEAREST), REFS / "bubble-preview@2x.png")

    # also upscaled 9-slice for QA
    save(base.resize((base.width * 6, base.height * 6), Image.NEAREST), REFS / "bubble-9slice-up.png")


if __name__ == "__main__":
    main()
