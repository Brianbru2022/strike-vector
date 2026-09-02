"""Curate generated showcase source art into deterministic runtime assets."""

from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "art" / "source" / "generated-1987" / "showcase-v1"
BACKGROUNDS = ROOT / "public" / "assets" / "backgrounds"
SPRITES = ROOT / "public" / "assets" / "sprites"


def extract_neutral_edge_background(source: Path, destination: Path) -> None:
    """Remove only bright neutral pixels connected to the image boundary."""
    image = Image.open(source).convert("RGBA")
    pixels = image.load()
    width, height = image.size

    def is_background(x: int, y: int) -> bool:
        red, green, blue, _ = pixels[x, y]
        return min(red, green, blue) >= 205 and max(red, green, blue) - min(red, green, blue) <= 22

    visited = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque()
    for x in range(width):
        queue.extend(((x, 0), (x, height - 1)))
    for y in range(height):
        queue.extend(((0, y), (width - 1, y)))

    while queue:
        x, y = queue.popleft()
        index = y * width + x
        if visited[index] or not is_background(x, y):
            continue
        visited[index] = 1
        if x:
            queue.append((x - 1, y))
        if x + 1 < width:
            queue.append((x + 1, y))
        if y:
            queue.append((x, y - 1))
        if y + 1 < height:
            queue.append((x, y + 1))

    alpha = Image.new("L", image.size, 255)
    alpha_pixels = alpha.load()
    for y in range(height):
        offset = y * width
        for x in range(width):
            if visited[offset + x]:
                alpha_pixels[x, y] = 0
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.45))
    bounds = alpha.getbbox()
    if bounds is None:
        raise RuntimeError(f"No foreground found in {source.name}")

    padding = 12
    bounds = (
        max(0, bounds[0] - padding),
        max(0, bounds[1] - padding),
        min(width, bounds[2] + padding),
        min(height, bounds[3] + padding),
    )
    image.putalpha(alpha)
    image.crop(bounds).save(destination, optimize=True)


def export_background(source: Path, destination: Path) -> None:
    image = Image.open(source).convert("RGB")
    image.save(destination, "WEBP", quality=84, method=6)


def validate_alpha(path: Path) -> None:
    image = Image.open(path)
    if image.mode != "RGBA" or image.getextrema()[3][0] != 0:
        raise RuntimeError(f"{path.name} does not contain genuine transparency")


if __name__ == "__main__":
    BACKGROUNDS.mkdir(parents=True, exist_ok=True)
    SPRITES.mkdir(parents=True, exist_ok=True)
    carrier = SPRITES / "invincible-carrier-showcase-v2.png"
    extract_neutral_edge_background(SOURCE / "invincible-carrier-showcase-source.png", carrier)
    validate_alpha(carrier)
    export_background(SOURCE / "mission-1-dawn-showcase-source.png", BACKGROUNDS / "mission-1-dawn-showcase-v2.webp")
    export_background(SOURCE / "mission-6-storm-showcase-source.png", BACKGROUNDS / "mission-6-storm-showcase-v2.webp")
    export_background(SOURCE / "mission-10-bastion-showcase-source.png", BACKGROUNDS / "mission-10-bastion-showcase-v2.webp")
    for path in (carrier, *sorted(BACKGROUNDS.glob("mission-*-showcase-v2.webp"))):
        image = Image.open(path)
        print(f"{path.relative_to(ROOT)}: {image.mode} {image.size} {path.stat().st_size / 1024:.0f} KiB")
