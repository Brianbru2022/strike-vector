"""Build a single review sheet from the 48 Stage 6 viewport captures."""

from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
CAPTURES = ROOT / "reports/visual-integration"
OUTPUT = ROOT / "reports/stage6/viewport-contact-sheet.jpg"
VIEWPORTS = ("desktop", "ultrawide", "mobile-landscape")
CELL_W, CELL_H, LABEL_H = 400, 170, 24


def main() -> None:
    sheet = Image.new("RGB", (CELL_W * 3, (CELL_H + LABEL_H) * 16), "#071016")
    draw = ImageDraw.Draw(sheet)
    for mission in range(1, 17):
        for column, viewport in enumerate(VIEWPORTS):
            source = CAPTURES / f"mission-{mission:02d}-{viewport}.jpg"
            image = Image.open(source).convert("RGB")
            image.thumbnail((CELL_W, CELL_H), Image.Resampling.LANCZOS)
            x = column * CELL_W + (CELL_W - image.width) // 2
            y = (mission - 1) * (CELL_H + LABEL_H) + LABEL_H
            sheet.paste(image, (x, y))
            draw.text((column * CELL_W + 7, y - LABEL_H + 5), f"M{mission:02d} / {viewport}", fill="#9ef5c3")
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(OUTPUT, quality=88, optimize=True)
    print(f"Built {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
