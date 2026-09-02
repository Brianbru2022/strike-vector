"""Prepare the four generated Act III foreground kits for deterministic runtime use."""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "art" / "source" / "generated-1987" / "act-three-foreground-v2"
OUTPUT = ROOT / "public" / "assets" / "layers"
PANEL_WIDTH = 2048
PANEL_HEIGHT = 384
OVERLAP = 64
TARGET_CONTACT_Y = 78

ASSETS = {
    "janus-causeway-source.png": "janus-causeway-surface-v2.webp",
    "janus-airbase-source.png": "janus-airbase-surface-v2.webp",
    "skeld-defence-source.png": "skeld-defence-surface-v2.webp",
    "bastion-fortress-source.png": "bastion-fortress-surface-v3.webp",
}


def keyed_rgba(image: Image.Image) -> Image.Image:
    rgb = np.asarray(image.convert("RGB"), dtype=np.float32)
    red, green, blue = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    # The generator was asked for a deliberately impossible environment colour.
    # A soft edge removes pink spill without eroding dark rock or runway lamps.
    key_strength = np.minimum.reduce((
        (red - green - 42.0) / 90.0,
        (blue - green - 36.0) / 90.0,
        (red + blue - 270.0) / 180.0,
    ))
    alpha = np.clip(1.0 - key_strength, 0.0, 1.0)
    key_pixels = (red > 130) & (blue > 90) & ((red + blue) > (2.6 * green + 155))
    alpha[key_pixels] = 0.0
    alpha = np.asarray(
        Image.fromarray((alpha * 255).astype(np.uint8), "L").filter(ImageFilter.GaussianBlur(0.7)),
        dtype=np.uint8,
    )

    # Desaturate residual magenta at the antialiased silhouette boundary.
    spill = np.clip((np.minimum(red, blue) - green) / 110.0, 0.0, 1.0)[..., None]
    neutral = np.repeat(green[..., None], 3, axis=2)
    cleaned = rgb * (1.0 - spill * 0.72) + neutral * spill * 0.72
    rgba = np.dstack((np.clip(cleaned, 0, 255).astype(np.uint8), alpha))
    return Image.fromarray(rgba, "RGBA")


def contact_profile(alpha: np.ndarray) -> np.ndarray:
    solid = alpha >= 192
    profile = np.full(alpha.shape[1], alpha.shape[0] - 1, dtype=np.int32)
    for x in range(alpha.shape[1]):
        rows = np.flatnonzero(solid[:, x])
        if rows.size:
            profile[x] = int(rows[0])
    return profile


def solidify_below_contact(pixels: np.ndarray) -> np.ndarray:
    repaired = pixels.copy()
    profile = contact_profile(repaired[..., 3])
    for x, contact_y in enumerate(profile):
        previous = repaired[contact_y, x].copy()
        previous[3] = 255
        for y in range(contact_y, repaired.shape[0]):
            if repaired[y, x, 3] < 192:
                repaired[y, x] = previous
            else:
                previous = repaired[y, x].copy()
                previous[3] = 255
                repaired[y, x, 3] = 255
    return repaired


def align_panel(panel: Image.Image) -> Image.Image:
    resized = panel.resize((PANEL_WIDTH, PANEL_HEIGHT), Image.Resampling.LANCZOS)
    pixels = np.asarray(resized, dtype=np.uint8).copy()
    profile = contact_profile(pixels[..., 3])
    # A terrain strip is a solid cross-section. Repair any keyed grid-divider
    # remnants below its first contact pixel before moving the column.
    for x, contact_y in enumerate(profile):
        previous = pixels[contact_y, x].copy()
        previous[3] = 255
        for y in range(contact_y, PANEL_HEIGHT):
            red, green, blue = pixels[y, x, :3]
            keyed_colour = red > 130 and blue > 90 and (int(red) + int(blue)) > (2.6 * int(green) + 155)
            if pixels[y, x, 3] < 240 or keyed_colour:
                pixels[y, x] = previous
            else:
                previous = pixels[y, x].copy()
                previous[3] = 255
                pixels[y, x, 3] = 255
    edge = max(24, PANEL_WIDTH // 24)
    left = int(np.median(profile[:edge]))
    right = int(np.median(profile[-edge:]))
    baseline = np.linspace(left, right, PANEL_WIDTH)
    shifts = np.rint(TARGET_CONTACT_Y - baseline).astype(np.int32)
    aligned = np.empty_like(pixels)
    for x, shift in enumerate(shifts):
        source_rows = np.arange(PANEL_HEIGHT) - shift
        source_rows = np.where(source_rows < 0, -source_rows, source_rows)
        source_rows = np.where(source_rows >= PANEL_HEIGHT, (PANEL_HEIGHT - 1) * 2 - source_rows, source_rows)
        source_rows = np.clip(source_rows, 0, PANEL_HEIGHT - 1)
        aligned[:, x] = pixels[source_rows, x]
    return Image.fromarray(solidify_below_contact(aligned), "RGBA")


def assemble(source_path: Path) -> Image.Image:
    source = Image.open(source_path).convert("RGB")
    half_w, half_h = source.width // 2, source.height // 2
    boxes = (
        (0, 0, half_w, half_h),
        (half_w, 0, source.width, half_h),
        (0, half_h, half_w, source.height),
        (half_w, half_h, source.width, source.height),
    )
    panels = [align_panel(keyed_rgba(source.crop(box))) for box in boxes]
    output_width = PANEL_WIDTH * len(panels) - OVERLAP * (len(panels) - 1)
    panorama = Image.new("RGBA", (output_width, PANEL_HEIGHT), (0, 0, 0, 0))
    panorama.alpha_composite(panels[0], (0, 0))
    cursor = PANEL_WIDTH - OVERLAP
    for panel in panels[1:]:
        fade = Image.new("L", panel.size, 255)
        fade_pixels = np.asarray(fade).copy()
        fade_pixels[:, :OVERLAP] = np.linspace(0, 255, OVERLAP, dtype=np.uint8)[None, :]
        panel_pixels = np.asarray(panel).copy()
        panel_pixels[..., 3] = np.minimum(panel_pixels[..., 3], fade_pixels)
        panorama.alpha_composite(Image.fromarray(panel_pixels, "RGBA"), (cursor, 0))
        cursor += PANEL_WIDTH - OVERLAP
    return Image.fromarray(solidify_below_contact(np.asarray(panorama)), "RGBA")


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for source_name, output_name in ASSETS.items():
        panorama = assemble(SOURCE / source_name)
        panorama.save(OUTPUT / output_name, "WEBP", quality=84, method=6, exact=True)
        alpha = np.asarray(panorama)[..., 3]
        print(
            f"{output_name}: {panorama.width}x{panorama.height}, "
            f"transparent={int(np.count_nonzero(alpha == 0))}, bytes={(OUTPUT / output_name).stat().st_size}"
        )


if __name__ == "__main__":
    main()
