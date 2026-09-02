"""Release gate for the Stage 5 hero-art batch."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "art" / "source" / "generated-1987" / "stage5-hero-v1"
PROVENANCE = SOURCE / "provenance.json"
SPRITES = ROOT / "public" / "assets" / "sprites"

SPRITE_FILES = [
    "sea-harrier-frs1-hero-v3.png",
    "mig21bis-hero-v3.png",
    "mig23ml-hero-v3.png",
    "mig29a-hero-v3.png",
    "invincible-carrier-hero-v3.png",
    "missile-corvette-hero-v3.png",
    "missile-patrol-boat-hero-v3.png",
]

EXPECTED_CAPSULES = {
    "marketing/store/stage5/iron-kestrel-header-616x353.jpg": (616, 353),
    "marketing/store/stage5/iron-kestrel-main-460x215.jpg": (460, 215),
    "marketing/store/stage5/iron-kestrel-small-231x87.jpg": (231, 87),
}


def require(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def main() -> None:
    data = json.loads(PROVENANCE.read_text(encoding="utf-8"))
    require(data["review"]["technical"] == "APPROVED", "technical approval unresolved")
    require(data["review"]["styleConsistency"] == "APPROVED", "style approval unresolved")
    require(data["review"]["provenance"] == "APPROVED", "provenance approval unresolved")

    for asset in data["assets"]:
        require(asset["approval"] == "APPROVED", f"{asset['id']} approval unresolved")
        source = SOURCE / asset["source"]
        require(source.is_file(), f"missing archived source: {source}")

    require((SOURCE / "rejected-harrier-proportions-source.png").is_file(), "rejected candidate is not archived")

    for name in SPRITE_FILES:
        path = SPRITES / name
        require(path.is_file(), f"missing runtime sprite: {name}")
        image = Image.open(path).convert("RGBA")
        require(image.width % 3 == 0, f"{name} is not a three-cell atlas")
        corners = [
            image.getpixel((0, 0))[3],
            image.getpixel((image.width - 1, 0))[3],
            image.getpixel((0, image.height - 1))[3],
            image.getpixel((image.width - 1, image.height - 1))[3],
        ]
        require(not any(corners), f"{name} has malformed corner alpha: {corners}")
        for frame in range(3):
            cell = image.crop((frame * image.width // 3, 0, (frame + 1) * image.width // 3, image.height))
            require(cell.getchannel("A").getbbox() is not None, f"{name} frame {frame} is empty")

    for relative, expected in EXPECTED_CAPSULES.items():
        path = ROOT / relative
        require(path.is_file(), f"missing store capsule: {relative}")
        require(Image.open(path).size == expected, f"wrong store capsule size: {relative}")

    runtime_sources = "\n".join(
        path.read_text(encoding="utf-8")
        for path in [ROOT / "src/game/SpriteAssetManager.ts", ROOT / "src/game/Presentation.ts", ROOT / "src/components/MainMenu.tsx"]
    )
    for name in SPRITE_FILES:
        require(name in runtime_sources, f"runtime does not reference {name}")
    require("mission-10-bastion-hero-v3.webp" in runtime_sources, "Bastion hero plate is not active")
    require("title-composition-hero-v1.webp" in runtime_sources, "title composition is not active")

    manifest = json.loads((SPRITES / "manifest.json").read_text(encoding="utf-8"))
    for key in ["player_jet", "carrier_ship", "enemy_jet", "enemy_mig21", "enemy_mig29", "enemy_patrol_boat", "enemy_corvette"]:
        require(len(manifest["sprites"][key]["damageStates"]) == 3, f"{key} lacks three damage states")

    print("Stage 5 hero-art audit: PASS")
    print(f"Approved assets: {len(data['assets'])}; runtime sprite atlases: {len(SPRITE_FILES)}; store crops: {len(EXPECTED_CAPSULES)}")


if __name__ == "__main__":
    main()
