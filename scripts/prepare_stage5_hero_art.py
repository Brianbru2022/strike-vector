"""Prepare the Stage 5 hero-art batch from archived generator outputs.

This script performs only deterministic production work: checkerboard removal,
alpha trimming, equal-frame atlas assembly, resizing and WebP export.  The
archived source files remain untouched.
"""

from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "art" / "source" / "generated-1987" / "stage5-hero-v1"
SPRITES = ROOT / "public" / "assets" / "sprites"
BACKGROUNDS = ROOT / "public" / "assets" / "backgrounds"
UI = ROOT / "public" / "assets" / "ui"
STORE = ROOT / "marketing" / "store" / "stage5"

SHEETS = {
    "sea-harrier-stage5-source.png": ("sea-harrier-frs1-hero-v3.png", 768),
    "mig21bis-stage5-source.png": ("mig21bis-hero-v3.png", 768),
    "mig23ml-stage5-source.png": ("mig23ml-hero-v3.png", 768),
    "mig29a-stage5-source.png": ("mig29a-hero-v3.png", 768),
    "invincible-carrier-stage5-source.png": ("invincible-carrier-hero-v3.png", 1200),
    "missile-corvette-stage5-source.png": ("missile-corvette-hero-v3.png", 900),
    "missile-patrol-boat-stage5-source.png": ("missile-patrol-boat-hero-v3.png", 820),
}


def edge_alpha(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size

    def background(x: int, y: int) -> bool:
        red, green, blue, _ = pixels[x, y]
        # The generator encoded a pale neutral checkerboard into RGB.
        return min(red, green, blue) >= 220 and max(red, green, blue) - min(red, green, blue) <= 24

    visited = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque()
    for x in range(width):
        queue.extend(((x, 0), (x, height - 1)))
    for y in range(height):
        queue.extend(((0, y), (width - 1, y)))

    while queue:
        x, y = queue.popleft()
        index = y * width + x
        if visited[index] or not background(x, y):
            continue
        visited[index] = 1
        if x: queue.append((x - 1, y))
        if x + 1 < width: queue.append((x + 1, y))
        if y: queue.append((x, y - 1))
        if y + 1 < height: queue.append((x, y + 1))

    alpha = Image.new("L", rgba.size, 255)
    alpha_pixels = alpha.load()
    for y in range(height):
        for x in range(width):
            if visited[y * width + x]:
                alpha_pixels[x, y] = 0

    # Remove generated cyan waterline guides without touching compact markings.
    for y in range(height):
        candidates = []
        for x in range(width):
            red, green, blue, _ = pixels[x, y]
            if blue > red + 18 and blue >= green and blue > 90:
                candidates.append(x)
        if len(candidates) > width * 0.45:
            for x in candidates:
                alpha_pixels[x, y] = 0

    alpha = alpha.filter(ImageFilter.GaussianBlur(0.45))
    rgba.putalpha(alpha)
    bounds = alpha.getbbox()
    if bounds is None:
        raise RuntimeError("No foreground survived alpha extraction")
    pad = 10
    return rgba.crop((max(0, bounds[0] - pad), max(0, bounds[1] - pad), min(width, bounds[2] + pad), min(height, bounds[3] + pad)))


def build_horizontal_atlas(source: Path, destination: Path, frame_width: int) -> None:
    image = Image.open(source).convert("RGB")
    band_height = image.height / 3
    frames: list[Image.Image] = []
    for index in range(3):
        top = round(index * band_height)
        bottom = round((index + 1) * band_height)
        frame = edge_alpha(image.crop((0, top, image.width, bottom)))
        scale = frame_width / frame.width
        frame = frame.resize((frame_width, max(1, round(frame.height * scale))), Image.Resampling.LANCZOS)
        frames.append(frame)

    cell_height = max(frame.height for frame in frames) + 20
    atlas = Image.new("RGBA", (frame_width * 3, cell_height), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        atlas.alpha_composite(frame, (index * frame_width, cell_height - frame.height - 10))

    # Remove isolated guide-line remnants that have no vertical continuity.
    alpha = atlas.getchannel("A")
    alpha_pixels = alpha.load()
    for y in range(5, atlas.height - 5):
        opaque = [x for x in range(atlas.width) if alpha_pixels[x, y] > 20]
        if len(opaque) < atlas.width * 0.28:
            continue
        for x in opaque:
            if alpha_pixels[x, y - 5] < 20 and alpha_pixels[x, y + 5] < 20:
                alpha_pixels[x, y] = 0
    atlas.putalpha(alpha)
    atlas.save(destination, optimize=True)


def save_background(source_name: str, destination: Path, quality: int) -> None:
    image = Image.open(SOURCE / source_name).convert("RGB")
    image.save(destination, "WEBP", quality=quality, method=6)


def centre_crop(image: Image.Image, width: int, height: int) -> Image.Image:
    source_ratio = image.width / image.height
    target_ratio = width / height
    if source_ratio > target_ratio:
        crop_width = round(image.height * target_ratio)
        left = (image.width - crop_width) // 2
        image = image.crop((left, 0, left + crop_width, image.height))
    else:
        crop_height = round(image.width / target_ratio)
        top = (image.height - crop_height) // 2
        image = image.crop((0, top, image.width, top + crop_height))
    return image.resize((width, height), Image.Resampling.LANCZOS)


def assert_alpha(path: Path) -> None:
    image = Image.open(path).convert("RGBA")
    corners = [image.getpixel((0, 0))[3], image.getpixel((image.width - 1, 0))[3], image.getpixel((0, image.height - 1))[3], image.getpixel((image.width - 1, image.height - 1))[3]]
    if any(corners):
        raise RuntimeError(f"{path.name} has a non-transparent corner: {corners}")


def main() -> None:
    for directory in (SPRITES, BACKGROUNDS, UI, STORE):
        directory.mkdir(parents=True, exist_ok=True)
    for source_name, (destination_name, frame_width) in SHEETS.items():
        destination = SPRITES / destination_name
        build_horizontal_atlas(SOURCE / source_name, destination, frame_width)
        assert_alpha(destination)
        print(f"prepared {destination.relative_to(ROOT)}")

    save_background("bastion-fortress-stage5-source.png", BACKGROUNDS / "mission-10-bastion-hero-v3.webp", 86)
    save_background("title-composition-stage5-source.png", UI / "title-composition-hero-v1.webp", 86)

    capsule = Image.open(SOURCE / "store-capsule-stage5-source.png").convert("RGB")
    for name, size in {
        "iron-kestrel-header-616x353.jpg": (616, 353),
        "iron-kestrel-main-460x215.jpg": (460, 215),
        "iron-kestrel-small-231x87.jpg": (231, 87),
    }.items():
        centre_crop(capsule, *size).save(STORE / name, quality=92, optimize=True)
        print(f"prepared {(STORE / name).relative_to(ROOT)}")


if __name__ == "__main__":
    main()
