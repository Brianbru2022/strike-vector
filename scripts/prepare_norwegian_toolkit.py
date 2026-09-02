"""Prepare curated Norwegian toolkit paintings for the runtime asset pack."""

from __future__ import annotations

import argparse
import shutil
from collections import deque
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]

BACKGROUNDS = {
    "exec-bc773bb4-05db-4e0b-8e3d-bec1a4873dc0.png": "arctic-open-sea-painted-v1.webp",
    "exec-47af91a0-db84-4122-bb7e-bdce29e07b55.png": "arctic-deep-fjord-painted-v1.webp",
    "exec-7adfd13a-13c3-4305-bfd9-055435834210.png": "arctic-bridgehead-painted-v1.webp",
    "exec-e950fd81-7a3c-409a-894b-59c3a6400ab4.png": "arctic-polar-night-painted-v1.webp",
    "exec-093c743d-db46-4cf2-a8df-8fee9cb516d5.png": "arctic-north-cape-painted-v1.webp",
}

ATLAS_SOURCE = "exec-4eff555d-3280-4d70-8b83-f4f78b10472d.png"
ATLAS_ROWS = (
    ("tu16k-damage-v1.png", 0, 205),
    ("su24m-damage-v1.png", 205, 410),
    ("landing-craft-damage-v1.png", 410, 614),
    ("coastal-artillery-damage-v1.png", 614, 819),
    ("submarine-pen-damage-v1.png", 819, 1024),
)


def remove_connected_checkerboard(image: Image.Image) -> Image.Image:
    """Remove only pale neutral pixels connected to the image boundary."""
    rgb = image.convert("RGB")
    width, height = rgb.size
    pixels = rgb.load()
    mask = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque()

    def eligible(x: int, y: int) -> bool:
        red, green, blue = pixels[x, y]
        return min(red, green, blue) >= 208 and max(red, green, blue) - min(red, green, blue) <= 22

    def add(x: int, y: int) -> None:
        offset = y * width + x
        if not mask[offset] and eligible(x, y):
            mask[offset] = 1
            queue.append((x, y))

    for x in range(width):
        add(x, 0)
        add(x, height - 1)
    for y in range(height):
        add(0, y)
        add(width - 1, y)

    while queue:
        x, y = queue.popleft()
        if x: add(x - 1, y)
        if x + 1 < width: add(x + 1, y)
        if y: add(x, y - 1)
        if y + 1 < height: add(x, y + 1)

    rgba = rgb.convert("RGBA")
    alpha = Image.new("L", (width, height), 255)
    alpha_pixels = alpha.load()
    for offset, transparent in enumerate(mask):
        if transparent:
            alpha_pixels[offset % width, offset // width] = 0
    rgba.putalpha(alpha)
    return rgba


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-root", required=True, type=Path)
    args = parser.parse_args()
    source_root: Path = args.source_root
    archive = ROOT / "art" / "source" / "generated-1987" / "norwegian-toolkit-v1"
    backgrounds = ROOT / "public" / "assets" / "backgrounds"
    sprites = ROOT / "public" / "assets" / "sprites"
    archive.mkdir(parents=True, exist_ok=True)
    backgrounds.mkdir(parents=True, exist_ok=True)
    sprites.mkdir(parents=True, exist_ok=True)

    for source_name, runtime_name in BACKGROUNDS.items():
        source = source_root / source_name
        if not source.exists():
            raise FileNotFoundError(source)
        shutil.copy2(source, archive / source_name)
        with Image.open(source) as image:
            image.convert("RGB").save(backgrounds / runtime_name, "WEBP", quality=84, method=6)

    atlas_source = source_root / ATLAS_SOURCE
    if not atlas_source.exists():
        raise FileNotFoundError(atlas_source)
    shutil.copy2(atlas_source, archive / ATLAS_SOURCE)
    atlas = remove_connected_checkerboard(Image.open(atlas_source))
    atlas.save(archive / "arctic-unit-damage-atlas-clean-v1.png", optimize=True)
    for filename, top, bottom in ATLAS_ROWS:
        row = atlas.crop((0, top, atlas.width, bottom))
        row.save(sprites / filename, optimize=True)

    print(f"Prepared {len(BACKGROUNDS)} environments and {len(ATLAS_ROWS)} damage-state sheets.")


if __name__ == "__main__":
    main()
