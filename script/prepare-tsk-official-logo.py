#!/usr/bin/env python3
"""Prépare le logo officiel pour fond blanc (encre #0B0B0C, alpha conservée)."""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "client/public/brand/tsk/tsk-official-logo.png"
OUT = ROOT / "client/public/brand/tsk/tsk-official-logo-print.png"
OUT_HD = ROOT / "client/public/brand/tsk/tsk-official-logo-print-hd.png"
INK = (11, 11, 12)


def to_print_logo(src: Path, dest: Path, max_width: int | None = None) -> None:
    im = Image.open(src).convert("RGBA")
    bbox = im.getbbox()
    if bbox:
        im = im.crop(bbox)
    pixels = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if a < 8:
                pixels[x, y] = (0, 0, 0, 0)
                continue
            lum = (r + g + b) / 3
            alpha = int(min(255, a * (lum / 255) * 1.05))
            pixels[x, y] = (*INK, alpha)
    if max_width and w > max_width:
        nh = int(h * max_width / w)
        im = im.resize((max_width, nh), Image.Resampling.LANCZOS)
    im.save(dest, optimize=True)


def main() -> None:
    to_print_logo(SRC, OUT)
    to_print_logo(SRC, OUT_HD, max_width=1400)
    print("ok", OUT, OUT_HD)


if __name__ == "__main__":
    main()
