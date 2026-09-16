#!/usr/bin/env python3
"""Generate public/og-image.png (1200x630) from the existing pixel-art assets."""
from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "assets"
FONT = "/System/Library/Fonts/Menlo.ttc"
W, H = 1200, 630
BG = (11, 18, 32, 255)


def font(size: int, bold: bool = True):
    for index in ([1, 0] if bold else [0]):
        try:
            return ImageFont.truetype(FONT, size, index=index)
        except OSError:
            continue
    return ImageFont.load_default()


def spr(*parts: str) -> Image.Image:
    return Image.open(ASSETS.joinpath(*parts)).convert("RGBA")


def main() -> None:
    img = Image.new("RGBA", (W, H), BG)
    d = ImageDraw.Draw(img)

    # Floor band (wood tiles, 2x)
    floor = spr("furniture", "tileset.png").crop((0, 0, 32, 32)).resize((64, 64), Image.Resampling.NEAREST)
    band_top = 380
    for r in range(int((H - band_top) / 64) + 1):
        for c in range(int(W / 64) + 1):
            img.paste(floor, (c * 64, band_top + r * 64))

    # Props at the edges of the floor
    plant = spr("furniture", "plant.png").resize((96, 96), Image.Resampling.NEAREST)
    img.paste(plant, (36, 470), plant)
    bookshelf = spr("furniture", "bookshelf.png").resize((96, 144), Image.Resampling.NEAREST)
    img.paste(bookshelf, (1068, 380), bookshelf)
    img.paste(bookshelf.transpose(Image.Transpose.FLIP_LEFT_RIGHT), (36, 380),
              bookshelf.transpose(Image.Transpose.FLIP_LEFT_RIGHT))

    # Characters (frame 0 of each sheet), standing on the floor
    chars = ["cos", "github", "linkedin", "x", "deal", "swe"]
    scale = 3
    size = 48 * scale
    step = 170
    x0 = (W - ((len(chars) - 1) * step + size)) // 2
    y0 = 560 - size
    for i, cid in enumerate(chars):
        sheet = spr("characters", f"agent-{cid}.png")
        frame = sheet.crop((0, 0, 48, 48)).resize((size, size), Image.Resampling.NEAREST)
        img.paste(frame, (x0 + i * step, y0), frame)

    # Text
    title = font(72)
    sub = font(28, bold=False)
    small = font(17, bold=False)
    gold = font(21)
    d.text((7, 67), "PIXEL OFFICE", font=title, fill=(0, 0, 0, 160))
    d.text((3, 63), "PIXEL OFFICE", font=title, fill=(232, 238, 247, 255))
    d.text((5, 155), "Your Grok agent team, visualized", font=sub, fill=(139, 155, 180, 255))
    d.text((5, 200), "click an agent · hover for a highlight · watch the floor work",
           font=small, fill=(100, 116, 139, 255))
    d.text((1180, 36), "★ STARBASE 2026", font=gold, fill=(251, 191, 36, 255), anchor="ra")
    d.text((1182, 36), "★ STARBASE 2026", font=gold, fill=(251, 191, 36, 255), anchor="ra")

    # Subtle frame
    d.rectangle((0, 0, W - 1, H - 1), outline=(45, 58, 79, 255), width=3)

    OUT = ROOT / "public" / "og-image.png"
    img.convert("RGB").save(OUT, "PNG")
    print(f"Wrote {OUT} ({W}x{H})")


if __name__ == "__main__":
    main()