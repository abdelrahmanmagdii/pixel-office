#!/usr/bin/env python3
"""Generate public/og-image.png (1200x630) from the existing pixel-art assets.

The corner label follows `poster` in public/agents.json, or PIXEL OFFICE when
that field is absent. Pass --out to write somewhere other than public/og-image.png.
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "assets"
W, H = 1200, 630
BG = (11, 18, 32, 255)

FONT_CANDIDATES = [
    os.environ.get("OG_FONT", ""),
    "/System/Library/Fonts/Menlo.ttc",
    "/System/Library/Fonts/Supplemental/Courier New.ttf",
    "/Library/Fonts/Menlo.ttc",
    "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
    "/usr/share/fonts/truetype/liberation2/LiberationMono-Bold.ttf",
    "/usr/share/fonts/truetype/liberation2/LiberationMono-Regular.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationMono-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf",
    "C:/Windows/Fonts/consola.ttf",
    "C:/Windows/Fonts/cour.ttf",
]


def font(size: int, bold: bool = True):
    names = [p for p in FONT_CANDIDATES if p]
    if not bold:
        names = [p.replace("Bold", "Regular") for p in names] + names
    for path in names:
        if not Path(path).is_file():
            continue
        for index in (1, 0) if bold and path.endswith(".ttc") else (0,):
            try:
                return ImageFont.truetype(path, size, index=index)
            except OSError:
                continue
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def poster_label() -> str:
    roster = ROOT / "public" / "agents.json"
    try:
        data = json.loads(roster.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return "PIXEL OFFICE"
    text = data.get("poster") if isinstance(data, dict) else None
    if isinstance(text, str) and text.strip():
        return text.strip()
    return "PIXEL OFFICE"


def spr(*parts: str) -> Image.Image:
    return Image.open(ASSETS.joinpath(*parts)).convert("RGBA")


def main(out: Path | None = None) -> None:
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
    label = poster_label()
    d.text((7, 67), "PIXEL OFFICE", font=title, fill=(0, 0, 0, 160))
    d.text((3, 63), "PIXEL OFFICE", font=title, fill=(232, 238, 247, 255))
    d.text((5, 155), "Your Grok agent team, visualized", font=sub, fill=(139, 155, 180, 255))
    d.text((5, 200), "click an agent · hover for a highlight · watch the floor work",
           font=small, fill=(100, 116, 139, 255))
    d.text((1180, 36), label, font=gold, fill=(251, 191, 36, 255), anchor="ra")
    d.text((1182, 36), label, font=gold, fill=(251, 191, 36, 255), anchor="ra")

    # Subtle frame
    d.rectangle((0, 0, W - 1, H - 1), outline=(45, 58, 79, 255), width=3)

    dest = out or (ROOT / "public" / "og-image.png")
    img.convert("RGB").save(dest, "PNG")
    print(f"Wrote {dest} ({W}x{H})")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate the Pixel Office social card.")
    parser.add_argument("--out", type=Path, default=None, help="Output PNG (default: public/og-image.png)")
    args = parser.parse_args()
    main(args.out)