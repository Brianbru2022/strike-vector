"""Prepare the approved Stage 6 painted explosion strip for runtime use."""

from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "art/source/generated-1987/stage6-effects-v1/explosion-stages-stage6-source.png"
OUTPUT = ROOT / "public/assets/sprites/explosion-stages-stage6-v1.png"


def is_checker_pixel(red: int, green: int, blue: int) -> bool:
    # The generated source uses two near-neutral paper squares. Remove only
    # very bright, low-chroma pixels so pale smoke edges remain intact.
    return min(red, green, blue) >= 224 and max(red, green, blue) - min(red, green, blue) <= 9


def main() -> None:
    image = Image.open(SOURCE).convert("RGBA")
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            red, green, blue, alpha = pixels[x, y]
            if is_checker_pixel(red, green, blue):
                pixels[x, y] = (red, green, blue, 0)
            else:
                # Feather the near-white antialiased fringe left by the preview
                # matte. Pale grey smoke remains because its core is darker.
                maximum = max(red, green, blue)
                average = (red + green + blue) / 3
                saturation = 0 if maximum == 0 else (maximum - min(red, green, blue)) / maximum
                if average >= 176 and saturation <= 0.3:
                    edge_alpha = max(0, min(255, round((211 - average) / 35 * 255)))
                    pixels[x, y] = (red, green, blue, min(alpha, edge_alpha))

    # Peel only pale matte pixels connected to the now-transparent exterior.
    # This removes the generator's white cut-out rim without eroding the dark
    # painted smoke silhouette or the saturated flame edge.
    for _ in range(4):
        pixels = image.load()
        remove: list[tuple[int, int]] = []
        for y in range(1, image.height - 1):
            for x in range(1, image.width - 1):
                red, green, blue, alpha = pixels[x, y]
                if alpha == 0:
                    continue
                maximum = max(red, green, blue)
                average = (red + green + blue) / 3
                saturation = 0 if maximum == 0 else (maximum - min(red, green, blue)) / maximum
                if average < 132 or saturation > 0.4:
                    continue
                if any(pixels[x + dx, y + dy][3] <= 8 for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1))):
                    remove.append((x, y))
        for x, y in remove:
            red, green, blue, _ = pixels[x, y]
            pixels[x, y] = (red, green, blue, 0)

    # Six 300 px cells keep the strip light while retaining brush texture.
    image = image.resize((1800, 600), Image.Resampling.LANCZOS)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    image.save(OUTPUT, optimize=True)
    print(f"Prepared {OUTPUT.relative_to(ROOT)} ({OUTPUT.stat().st_size / 1024:.0f} KiB)")


if __name__ == "__main__":
    main()
