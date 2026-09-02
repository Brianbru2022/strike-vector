from pathlib import Path
from datetime import datetime, timezone
from PIL import Image, ImageDraw, ImageFont
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "art/source/generated-1987/stage9-store-v1/iron-kestrel-store-master-source.png"
PROVENANCE = ROOT / "art/source/generated-1987/stage9-store-v1/provenance.json"
OUTPUT = ROOT / "marketing/store/stage9"
RELEASE_SOURCE = (ROOT / "src/game/Release.ts").read_text(encoding="utf-8")
BUILD_ID_MATCH = re.search(r"buildId:\s*'([^']+)'", RELEASE_SOURCE)
if not BUILD_ID_MATCH:
    raise RuntimeError("Unable to read the release build identifier")
BUILD_ID = BUILD_ID_MATCH.group(1)

ASSETS = {
    "header_capsule.jpg": (920, 430),
    "small_capsule.png": (462, 174),
    "main_capsule.jpg": (1232, 706),
    "vertical_capsule.jpg": (748, 896),
    "page_background.jpg": (1438, 810),
    "library_capsule.jpg": (600, 900),
    "library_hero.jpg": (3840, 1240),
    "library_header_capsule.jpg": (920, 430),
}


def font(size: int) -> ImageFont.FreeTypeFont:
    candidates = [
        Path("C:/Windows/Fonts/bahnschrift.ttf"),
        Path("C:/Windows/Fonts/arialbd.ttf"),
    ]
    selected = next((path for path in candidates if path.exists()), None)
    if not selected:
        raise RuntimeError("A supported Windows title font was not found")
    return ImageFont.truetype(str(selected), size=size)


def cover(image: Image.Image, size: tuple[int, int], focal: tuple[float, float] = (0.61, 0.46)) -> Image.Image:
    width, height = size
    scale = max(width / image.width, height / image.height)
    resized = image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.LANCZOS)
    focal_x = focal[0] * resized.width
    focal_y = focal[1] * resized.height
    left = max(0, min(round(focal_x - width / 2), resized.width - width))
    top = max(0, min(round(focal_y - height / 2), resized.height - height))
    return resized.crop((left, top, left + width, top + height))


def title_layer(image: Image.Image, compact: bool = False, vertical: bool = False) -> None:
    draw = ImageDraw.Draw(image, "RGBA")
    width, height = image.size
    label = "IRON KESTREL '87"
    size = max(22, round(width * (0.073 if compact else 0.065)))
    title_font = font(size)
    box = draw.textbbox((0, 0), label, font=title_font, stroke_width=max(1, size // 24))
    text_width = box[2] - box[0]
    if vertical:
        x = max(24, (width - text_width) // 2)
        y = height - size * 2
    else:
        x = max(18, round(width * 0.045))
        y = max(14, round(height * 0.10))
    pad = max(10, size // 3)
    draw.rounded_rectangle((x - pad, y - pad // 2, x + text_width + pad, y + size + pad), radius=pad, fill=(2, 10, 14, 172))
    draw.text((x, y), label, font=title_font, fill=(226, 243, 229, 255), stroke_width=max(1, size // 24), stroke_fill=(3, 18, 18, 255))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


OUTPUT.mkdir(parents=True, exist_ok=True)
master = Image.open(SOURCE).convert("RGB")
records = []
for name, size in ASSETS.items():
    focal = (0.56, 0.50) if "vertical" in name or name == "library_capsule.jpg" else (0.56, 0.48)
    image = cover(master, size, focal)
    if name != "page_background.jpg" and name != "library_hero.jpg":
        title_layer(image, compact=name == "small_capsule.png", vertical="vertical" in name or name == "library_capsule.jpg")
    target = OUTPUT / name
    if target.suffix.lower() == ".png":
        image.save(target, optimize=True)
    else:
        image.save(target, quality=92, optimize=True, progressive=True)
    records.append({"file": name, "width": size[0], "height": size[1], "sha256": sha256(target)})

logo = Image.new("RGBA", (1280, 320), (0, 0, 0, 0))
logo_draw = ImageDraw.Draw(logo)
logo_font = font(112)
logo_label = "IRON KESTREL '87"
logo_box = logo_draw.textbbox((0, 0), logo_label, font=logo_font, stroke_width=4)
logo_draw.text(((logo.width - (logo_box[2] - logo_box[0])) // 2, 78), logo_label, font=logo_font, fill=(226, 243, 229, 255), stroke_width=4, stroke_fill=(3, 18, 18, 255))
logo_path = OUTPUT / "library_logo.png"
logo.save(logo_path, optimize=True)
records.append({"file": logo_path.name, "width": logo.width, "height": logo.height, "sha256": sha256(logo_path)})

manifest = {
    "schemaVersion": 1,
    "generatedAt": datetime.now(timezone.utc).isoformat(),
    "buildId": BUILD_ID,
    "source": str(SOURCE.relative_to(ROOT)).replace("\\", "/"),
    "sourceSha256": sha256(SOURCE),
    "provenance": str(PROVENANCE.relative_to(ROOT)).replace("\\", "/"),
    "provenanceSha256": sha256(PROVENANCE),
    "aiAssistedSource": True,
    "titleTextAppliedBy": "scripts/prepare_stage9_store_art.py",
    "assets": records,
}
(OUTPUT / "capsule-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
print(f"Prepared {len(records)} current-dimension Steam and library assets in {OUTPUT}")
