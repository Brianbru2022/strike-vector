"""Prepare the approved Sea Harrier yaw-turn strip for runtime use."""

from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "art/source/generated-1987/player-turn-v1/player-turn-chroma-source.png"
OUTPUT = ROOT / "public/assets/sprites/sea-harrier-turn-v1.png"
FRAME_COUNT = 5
FRAME_WIDTH = 512
FRAME_HEIGHT = 256
SOURCE_TOP = 260
SOURCE_BOTTOM = 450
def remove_magenta(red: int, green: int, blue: int) -> tuple[int, int, int, int]:
    """Convert the generated magenta matte to feathered genuine alpha."""
    separation = min(red, blue) - green
    if separation >= 170:
        return red, green, blue, 0
    spill = max(0, separation)
    cleaned = (red - spill, green, blue - spill)
    if separation <= 70:
        return cleaned[0], cleaned[1], cleaned[2], 255

    alpha = round((170 - separation) / 100 * 255)
    if alpha <= 20:
        return red, green, blue, 0
    return cleaned[0], cleaned[1], cleaned[2], alpha


def main() -> None:
    source = Image.open(SOURCE).convert("RGB")
    keyed = Image.new("RGBA", source.size)
    keyed.putdata([remove_magenta(*pixel) for pixel in source.get_flattened_data()])

    atlas = Image.new("RGBA", (FRAME_WIDTH * FRAME_COUNT, FRAME_HEIGHT), (0, 0, 0, 0))
    for index in range(FRAME_COUNT):
        left = round(index * source.width / FRAME_COUNT)
        right = round((index + 1) * source.width / FRAME_COUNT)
        frame = keyed.crop((left + 8, SOURCE_TOP, right - 8, SOURCE_BOTTOM))
        frame = frame.resize((FRAME_WIDTH - 16, 224), Image.Resampling.LANCZOS)
        atlas.alpha_composite(frame, (index * FRAME_WIDTH + 8, 16))

        alpha_bounds = atlas.crop((index * FRAME_WIDTH, 0, (index + 1) * FRAME_WIDTH, FRAME_HEIGHT)).getchannel("A").getbbox()
        if alpha_bounds is None:
            raise RuntimeError(f"Turn frame {index} is empty after alpha extraction.")
        if alpha_bounds[0] <= 1 or alpha_bounds[1] <= 1 or alpha_bounds[2] >= FRAME_WIDTH - 1 or alpha_bounds[3] >= FRAME_HEIGHT - 1:
            raise RuntimeError(f"Turn frame {index} touches its cell boundary: {alpha_bounds}.")

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(OUTPUT, optimize=True)
    print(f"Prepared {OUTPUT.relative_to(ROOT)} ({OUTPUT.stat().st_size / 1024:.0f} KiB, {FRAME_COUNT} RGBA frames)")


if __name__ == "__main__":
    main()
