"""Fail-closed audit for Milestone 9 foreground gameplay artwork."""

import json
import re
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SPRITES = ROOT / "public" / "assets" / "sprites"
REPORTS = ROOT / "reports" / "milestone-9"
REQUIRED = {
    "player_jet", "player_turn", "carrier_ship", "forward_base",
    "enemy_jet", "enemy_mig21", "enemy_mig29", "enemy_heli",
    "enemy_sam", "enemy_flak", "enemy_tank", "enemy_radar", "enemy_oil",
    "enemy_ship", "enemy_patrol_boat", "enemy_corvette", "friendly_supplies",
    "act_three_objectives", "combat_wrecks", "enemy_tu16k", "enemy_su24m",
    "arctic_landing_craft", "arctic_coastal_artillery", "arctic_submarine_pen",
}


def release_build_id() -> str:
    source = (ROOT / "src" / "game" / "Release.ts").read_text(encoding="utf-8")
    match = re.search(r"buildId:\s*'([^']+)'", source)
    return match.group(1) if match else "UNKNOWN"


def main() -> None:
    manifest = json.loads((SPRITES / "manifest.json").read_text(encoding="utf-8"))
    entries = manifest.get("sprites", {})
    metadata = manifest.get("presentationMetadata", {})
    failures: list[str] = []
    warnings: list[str] = []
    checked: list[dict[str, object]] = []

    for key in sorted(REQUIRED):
        entry = entries.get(key)
        if not entry:
            failures.append(f"Missing release foreground sprite registration: {key}")
            continue
        if key not in metadata and key != "combat_wrecks":
            failures.append(f"Missing presentation metadata: {key}")
        path = SPRITES / entry["file"]
        if not path.exists():
            failures.append(f"Missing sprite file: {path.name}")
            continue
        with Image.open(path) as image:
            source = entry.get("sourceRect", {})
            if source.get("width") != image.width or source.get("height") != image.height:
                failures.append(f"{key}: source rectangle does not match {image.width}x{image.height}")
            if image.mode != "RGBA":
                failures.append(f"{key}: {path.name} must retain RGBA transparency, found {image.mode}")
                continue
            alpha = image.getchannel("A")
            values = alpha.tobytes()
            transparent_ratio = sum(value < 8 for value in values) / len(values)
            corners = [alpha.getpixel((0, 0)), alpha.getpixel((image.width - 1, 0)), alpha.getpixel((0, image.height - 1)), alpha.getpixel((image.width - 1, image.height - 1))]
            if transparent_ratio < 0.08:
                failures.append(f"{key}: only {transparent_ratio:.1%} transparent pixels; likely rectangular background")
            if max(corners) > 16:
                failures.append(f"{key}: opaque corner detected; transparent padding is malformed")
            display = entry.get("displaySize", {})
            if min(display.get("width", 0), display.get("height", 0)) <= 0:
                failures.append(f"{key}: invalid display size")
            meta = metadata.get(key, {})
            anchor = meta.get("contactAnchor", {})
            footprint = meta.get("shadowFootprint", {})
            if meta and not (0 <= anchor.get("x", -1) <= 1 and 0 <= anchor.get("y", -1) <= 1):
                failures.append(f"{key}: contact anchor is outside normalised bounds")
            if meta and not (0.6 <= footprint.get("width", 0) <= 1):
                failures.append(f"{key}: shadow footprint is outside the approved 0.6-1.0 range")
            checked.append({"key": key, "file": path.name, "size": [image.width, image.height], "transparentRatio": round(transparent_ratio, 4)})

    runtime_sources = {
        "enemy renderer": ROOT / "src" / "game" / "EnemyManager.ts",
        "player renderer": ROOT / "src" / "game" / "PlayerAircraft.ts",
        "recovery-site renderer": ROOT / "src" / "game" / "TerrainSystem.ts",
    }
    for label, path in runtime_sources.items():
        source = path.read_text(encoding="utf-8")
        if "getForegroundTreatment" not in source:
            failures.append(f"{label} does not consume the foreground presentation authority")

    report = {
        "schemaVersion": 1,
        "buildId": release_build_id(),
        "automatedPassed": not failures,
        "requiredSprites": len(REQUIRED),
        "checkedSprites": len(checked),
        "failures": failures,
        "warnings": warnings,
        "assets": checked,
        "manualAcceptanceRequired": [
            "Confirm target silhouettes remain readable over dark and detailed panoramas.",
            "Confirm local tint integrates sprites without concealing selected targets.",
            "Confirm ground contacts, carrier waterlines and FARP recovery surfaces visually align in motion.",
        ],
    }
    REPORTS.mkdir(parents=True, exist_ok=True)
    (REPORTS / "foreground-readability-audit.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    (REPORTS / "foreground-readability-audit.md").write_text("\n".join([
        "# Milestone 9 foreground readability audit", "",
        f"Build: `{report['buildId']}`", "",
        f"Automated audit: **{'PASS' if report['automatedPassed'] else 'FAIL'}**", "",
        f"- Release foregrounds checked: **{len(checked)} / {len(REQUIRED)}**",
        f"- Failures: **{len(failures)}**", f"- Warnings: **{len(warnings)}**", "",
        "## Manual acceptance boundary", "",
        *(f"- {item}" for item in report["manualAcceptanceRequired"]), "",
        *( ["## Failures", "", *(f"- {item}" for item in failures), ""] if failures else [] ),
    ]) + "\n", encoding="utf-8")
    print(json.dumps({key: report[key] for key in ["buildId", "automatedPassed", "requiredSprites", "checkedSprites", "failures", "warnings"]}, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
