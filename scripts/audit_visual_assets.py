"""Static visual and delivery audit for the curated showcase asset pack."""

import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
REPORTS = ROOT / "reports"
SPRITE_MANIFEST = PUBLIC / "assets" / "sprites" / "manifest.json"
BACKGROUND_MANIFEST = PUBLIC / "assets" / "backgrounds" / "manifest.json"
MAX_PUBLIC_BYTES = 45 * 1024 * 1024
ARCTIC_SPRITES = {
    "enemy_tu16k", "enemy_su24m", "arctic_landing_craft",
    "arctic_coastal_artillery", "arctic_submarine_pen",
}
ARCTIC_BACKGROUNDS = {
    "arctic_open_sea", "arctic_deep_fjord", "arctic_bridgehead",
    "polar_night_plateau", "north_cape_fortress",
}


def main() -> None:
    failures: list[str] = []
    warnings: list[str] = []
    manifest = json.loads(SPRITE_MANIFEST.read_text(encoding="utf-8"))
    sprites = manifest["sprites"]
    presentation = manifest.get("presentationMetadata", {})

    for key in presentation:
        entry = sprites.get(key)
        if not entry:
            failures.append(f"Presentation metadata references missing sprite {key}")
            continue
        path = SPRITE_MANIFEST.parent / entry["file"]
        if not path.exists():
            failures.append(f"Missing runtime sprite {path.name}")
            continue
        image = Image.open(path)
        if image.mode != "RGBA":
            failures.append(f"{path.name} is {image.mode}; presentation-critical sprites require RGBA")
            continue
        alpha = image.getchannel("A")
        transparent = sum(1 for value in alpha.tobytes() if value < 8)
        ratio = transparent / (image.width * image.height)
        if ratio < 0.08:
            failures.append(f"{path.name} has only {ratio:.1%} transparent pixels")
        border = list(alpha.crop((0, 0, image.width, 1)).tobytes()) + list(alpha.crop((0, image.height - 1, image.width, image.height)).tobytes())
        if min(border) > 0:
            warnings.append(f"{path.name} has no transparent safety padding on its horizontal edge")
        if key in ARCTIC_SPRITES:
            damage_states = entry.get("damageStates", [])
            damage_frames = presentation[key].get("damageFrames", {})
            if damage_states != ["normal", "damaged", "destroyed"]:
                failures.append(f"{key} does not declare the complete three-stage damage sequence")
            if damage_frames.get("DESTROYED") != 2:
                failures.append(f"{key} does not map its destroyed state to frame 2")

    backgrounds = json.loads(BACKGROUND_MANIFEST.read_text(encoding="utf-8"))["backgrounds"]
    missing_arctic = sorted(ARCTIC_BACKGROUNDS.difference(backgrounds))
    if missing_arctic:
        failures.append(f"Missing Arctic background registrations: {', '.join(missing_arctic)}")
    for key, entry in backgrounds.items():
        path = BACKGROUND_MANIFEST.parent / entry["file"]
        if not path.exists():
            failures.append(f"Missing background {key}: {path.name}")
            continue
        image = Image.open(path)
        if image.width / max(1, image.height) < 1.45:
            warnings.append(f"{path.name} is unusually narrow for landscape coverage")

    signature_assets = [
        PUBLIC / "assets" / "backgrounds" / "mission-1-dawn-showcase-v2.webp",
        PUBLIC / "assets" / "backgrounds" / "mission-6-storm-showcase-v2.webp",
        PUBLIC / "assets" / "backgrounds" / "mission-10-bastion-hero-v3.webp",
        PUBLIC / "assets" / "sprites" / "invincible-carrier-hero-v3.png",
    ]
    for path in signature_assets:
        if not path.exists():
            failures.append(f"Missing signature asset {path.name}")


    public_size = sum(path.stat().st_size for path in PUBLIC.rglob("*") if path.is_file())
    if public_size > MAX_PUBLIC_BYTES:
        failures.append(f"Runtime public pack is {public_size / 1024 / 1024:.2f} MiB; limit is 45 MiB")

    result = {
        "version": 1,
        "publicPackMiB": round(public_size / 1024 / 1024, 2),
        "presentationSprites": len(presentation),
        "signatureAssets": len(signature_assets),
        "failures": failures,
        "warnings": warnings,
    }
    REPORTS.mkdir(exist_ok=True)
    (REPORTS / "visual-asset-audit.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    markdown = [
        "# Visual Asset Audit",
        "",
        f"- Runtime pack: **{result['publicPackMiB']} MiB** / 45 MiB",
        f"- Presentation sprites checked: **{len(presentation)}**",
        f"- Signature assets checked: **{len(signature_assets)}**",
        f"- Failures: **{len(failures)}**",
        f"- Warnings: **{len(warnings)}**",
        "",
        "## Failures",
        *(f"- {item}" for item in failures),
        "",
        "## Warnings",
        *(f"- {item}" for item in warnings),
        "",
    ]
    (REPORTS / "visual-asset-audit.md").write_text("\n".join(markdown), encoding="utf-8")
    print(json.dumps(result, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
