#!/usr/bin/env python3
"""Build TSK Digital logo SVGs from Inter outlines. Paths only — no live text."""

from __future__ import annotations

import re
from pathlib import Path

from fontTools.misc.transform import Transform
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "client" / "public" / "brand" / "tsk"
FONT_DIR = Path("/usr/share/fonts/truetype/macos")

INK = "#0B0B0C"
TITANIUM = "#A7A7A7"
WHITE = "#FFFFFF"

# Mark designed on a 512 grid, then placed into each lockup.
MARK = 512
FRAME_INSET = 36
FRAME_STROKE = 7
INNER_GAP = 32
INNER_STROKE = 3
FRAME_RX = 104
INNER_RX = 78
TSK_SIZE = 122
TSK_TRACKING = 0.08  # em


def load_font(weight: str) -> TTFont:
    return TTFont(str(FONT_DIR / f"Inter-{weight}.ttf"))


def font_metrics(font: TTFont) -> tuple[int, int]:
    upem = font["head"].unitsPerEm
    cap = font["OS/2"].sCapHeight
    return upem, cap


def glyph_name(font: TTFont, char: str) -> str:
    cmap = font.getBestCmap()
    return cmap[ord(char)]


def draw_text(
    font: TTFont,
    text: str,
    size: float,
    x: float,
    baseline: float,
    tracking_em: float = 0,
) -> tuple[str, float]:
    """Return SVG path data and advance width. Y grows downward."""
    upem, _cap = font_metrics(font)
    scale = size / upem
    glyph_set = font.getGlyphSet()
    pen = SVGPathPen(glyph_set)
    cursor = x
    tracking = tracking_em * size
    for char in text:
        name = glyph_name(font, char)
        glyph = glyph_set[name]
        transform = Transform(scale, 0, 0, -scale, cursor, baseline)
        glyph.draw(TransformPen(pen, transform))
        cursor += glyph.width * scale + tracking
    if text:
        cursor -= tracking
    return round_path(pen.getCommands()), cursor - x


def round_path(d: str) -> str:
    def repl(match: re.Match[str]) -> str:
        value = f"{float(match.group()):.2f}".rstrip("0").rstrip(".")
        return value or "0"

    return re.sub(r"-?\d+\.\d+", repl, d)


def cap_height(font: TTFont, size: float) -> float:
    upem, cap = font_metrics(font)
    return cap / upem * size


def rect(x: float, y: float, w: float, h: float, rx: float, stroke: str, width: float) -> str:
    return (
        f'<rect x="{x:.2f}" y="{y:.2f}" width="{w:.2f}" height="{h:.2f}" '
        f'rx="{rx:.2f}" fill="none" stroke="{stroke}" stroke-width="{width:.2f}"/>'
    )


def path(d: str, fill: str) -> str:
    return f'<path d="{d}" fill="{fill}"/>'


def mark_paths(variant: str) -> tuple[list[str], float, float]:
    """Return SVG fragments, TSK baseline, and cap-center Y on the 512 grid."""
    semi = load_font("SemiBold")
    ink, titanium = palette(variant)
    outer = FRAME_INSET
    outer_size = MARK - FRAME_INSET * 2
    inner = FRAME_INSET + INNER_GAP
    inner_size = MARK - inner * 2

    fragments = [
        rect(outer, outer, outer_size, outer_size, FRAME_RX, ink, FRAME_STROKE),
        rect(inner, inner, inner_size, inner_size, INNER_RX, titanium, INNER_STROKE),
    ]

    tsk_cap = cap_height(semi, TSK_SIZE)
    center = MARK / 2
    # Optical center sits a hair above geometric center.
    cap_center = center - 2
    baseline = cap_center + tsk_cap / 2
    d, width = draw_text(semi, "TSK", TSK_SIZE, 0, baseline, TSK_TRACKING)
    d, _ = draw_text(semi, "TSK", TSK_SIZE, center - width / 2, baseline, TSK_TRACKING)
    fragments.append(path(d, ink))
    return fragments, baseline, cap_center


def palette(variant: str) -> tuple[str, str]:
    if variant == "mono":
        return INK, INK
    if variant == "light":
        return WHITE, WHITE
    if variant == "on-dark":
        return WHITE, TITANIUM
    return INK, TITANIUM


def svg_doc(width: float, height: float, body: list[str], label: str) -> str:
    content = "\n  ".join(body)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{width:.0f}" height="{height:.0f}" viewBox="0 0 {width:.2f} {height:.2f}" fill="none" role="img" aria-label="{label}">
  {content}
</svg>
'''


def build_mark(variant: str) -> str:
    fragments, _baseline, _center = mark_paths(variant)
    return svg_doc(MARK, MARK, fragments, "TSK Digital")


def build_horizontal(variant: str) -> str:
    ink, titanium = palette(variant)
    word_font = load_font("SemiBold")
    mark_size = 168
    scale = mark_size / MARK
    fragments, _baseline, cap_center = mark_paths(variant)

    scaled: list[str] = []
    # Re-emit mark by wrapping in a group transform so coordinates stay exact.
    inner = "\n    ".join(fragments)
    scaled.append(
        f'<g transform="scale({scale:.6f})">\n    {inner}\n  </g>'
    )

    word_cap_target = 44
    upem, cap = font_metrics(word_font)
    word_size = word_cap_target / (cap / upem)
    word_baseline = cap_center * scale + word_cap_target / 2
    # Gap measured from the outer frame edge, not the canvas padding.
    frame_right = (FRAME_INSET + (MARK - FRAME_INSET * 2)) * scale
    gap = 28
    word_x = frame_right + gap
    d, word_w = draw_text(word_font, "Digital", word_size, word_x, word_baseline, -0.02)
    scaled.append(path(d, ink))
    del titanium

    width = word_x + word_w + 8
    height = mark_size
    return svg_doc(width, height, scaled, "TSK Digital")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    variants = {
        "color": "",
        "mono": "-mono",
        "light": "-light",
        "on-dark": "-on-dark",
    }
    for variant, suffix in variants.items():
        (OUT / f"tsk-mark{suffix}.svg").write_text(build_mark(variant), encoding="utf-8")
        (OUT / f"tsk-horizontal{suffix}.svg").write_text(
            build_horizontal(variant), encoding="utf-8"
        )
        print(f"wrote {variant}")


if __name__ == "__main__":
    main()
