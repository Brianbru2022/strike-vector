from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "art" / "source" / "generated-1987"
OUTPUT = ROOT / "public" / "assets" / "sprites"
LAYER_OUTPUT = ROOT / "public" / "assets" / "layers"

SPRITES = {
    "sa8-gecko-source.png": "sa8-gecko-painted.png",
    "t72m-source.png": "t72m-painted.png",
    "p19-radar-source.png": "p19-radar-painted.png",
    "fuel-depot-source.png": "fuel-depot-painted.png",
}

LAYERS = {
    "coast-approach-panorama-source.png": "coast-approach-panorama.webp",
    "coast-basalt-panorama-source.png": "coast-basalt-panorama.webp",
    "coast-tundra-panorama-source.png": "coast-tundra-panorama.webp",
    "coast-beach-panorama-source.png": "coast-beach-panorama.webp",
    "ocean-foreground-panorama-source.png": "ocean-foreground-panorama.webp",
}


def remove_edge_background(source: Path, destination: Path) -> None:
    image = Image.open(source).convert("RGBA")
    pixels = image.load()
    width, height = image.size

    def is_background(x: int, y: int) -> bool:
        red, green, blue, _ = pixels[x, y]
        return min(red, green, blue) >= 224 and max(red, green, blue) - min(red, green, blue) <= 18

    visited = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque()
    for x in range(width):
        queue.append((x, 0))
        queue.append((x, height - 1))
    for y in range(height):
        queue.append((0, y))
        queue.append((width - 1, y))

    while queue:
        x, y = queue.popleft()
        index = y * width + x
        if visited[index] or not is_background(x, y):
            continue
        visited[index] = 1
        if x > 0:
            queue.append((x - 1, y))
        if x + 1 < width:
            queue.append((x + 1, y))
        if y > 0:
            queue.append((x, y - 1))
        if y + 1 < height:
            queue.append((x, y + 1))

    alpha = Image.new("L", image.size, 255)
    alpha_pixels = alpha.load()
    for y in range(height):
        row = y * width
        for x in range(width):
            if visited[row + x]:
                alpha_pixels[x, y] = 0

    alpha = alpha.filter(ImageFilter.GaussianBlur(0.55))
    image.putalpha(alpha)
    bounds = alpha.getbbox()
    if bounds is None:
        raise RuntimeError(f"No foreground found in {source.name}")

    padding = 8
    left = max(0, bounds[0] - padding)
    top = max(0, bounds[1] - padding)
    right = min(width, bounds[2] + padding)
    bottom = min(height, bounds[3] + padding)
    cropped = image.crop((left, top, right, bottom))
    if destination.suffix.lower() == ".webp":
        cropped.save(destination, lossless=True, quality=100, method=6, exact=True)
    else:
        cropped.save(destination, optimize=True)
    print(f"{destination.name}: {image.size} -> {(right - left, bottom - top)}")


if __name__ == "__main__":
    OUTPUT.mkdir(parents=True, exist_ok=True)
    LAYER_OUTPUT.mkdir(parents=True, exist_ok=True)
    for source_name, output_name in SPRITES.items():
        remove_edge_background(SOURCE / source_name, OUTPUT / output_name)
    for source_name, output_name in LAYERS.items():
        remove_edge_background(SOURCE / source_name, LAYER_OUTPUT / output_name)
