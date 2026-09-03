#!/usr/bin/env python3
"""Regenerate the PWA app icons and the favicon from logo.png.

    python3 scripts/generate-icons.py            # write into the repo
    python3 scripts/generate-icons.py /tmp/out   # write elsewhere to preview

logo.png is the master mark (a non-square canvas with the circular art roughly
centred). Each output is the art cropped to its bounding box, padded to a
square, and centred with equal margins on an opaque #f4f6f8 tile -- the
manifest's theme/background colour -- at a per-target size. Plain icons fill
most of the tile; maskable icons sit smaller so the art stays inside the 80%
safe zone; the favicon is its own small file so index.html no longer ships the
~530 KB master art as a favicon.

Requires Pillow + NumPy (dev-time only -- not part of the site).
"""
import sys
from PIL import Image
import numpy as np

SRC = "logo.png"
BG = (244, 246, 248)  # #f4f6f8
ALPHA_FLOOR = 24  # ignore logo.png's faint sub-24 edge noise when finding the art

TARGETS = [
    # (path, pixel size, art size as a fraction of the tile)
    ("icons/icon-192.png", 192, 0.84),
    ("icons/icon-512.png", 512, 0.84),
    ("icons/icon-maskable-192.png", 192, 0.76),
    ("icons/icon-maskable-512.png", 512, 0.76),
    ("icons/apple-touch-icon.png", 180, 0.82),
    ("favicon.png", 48, 0.92),
]


def load_mark():
    """logo.png cropped to its bounding box and padded to an exact square, so it
    drops into a tile with equal margins on all four sides."""
    im = Image.open(SRC).convert("RGBA")
    solid = np.array(im)[:, :, 3] > ALPHA_FLOOR
    ys, xs = np.where(solid)
    im = im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    w, h = im.size
    side = max(w, h)
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.alpha_composite(im, ((side - w) // 2, (side - h) // 2))
    return square


def build(mark, size, fraction):
    inner = round(size * fraction)
    scaled = mark.resize((inner, inner), Image.LANCZOS)
    tile = Image.new("RGBA", (size, size), BG + (255,))
    off = (size - inner) // 2
    tile.alpha_composite(scaled, (off, off))
    return tile.convert("RGB")


def main():
    out = (sys.argv[1] if len(sys.argv) > 1 else ".").rstrip("/")
    mark = load_mark()
    for path, size, fraction in TARGETS:
        build(mark, size, fraction).save(out + "/" + path, "PNG", optimize=True)
        print("wrote", out + "/" + path, (size, size))


if __name__ == "__main__":
    main()
