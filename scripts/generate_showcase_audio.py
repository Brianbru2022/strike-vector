"""Generate small deterministic PCM layers for the offline showcase mix."""

import math
import random
import wave
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "assets" / "audio"
RATE = 22050


def write_cue(name: str, duration: float, sample) -> None:
    frames = int(RATE * duration)
    path = OUTPUT / name
    with wave.open(str(path), "wb") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(RATE)
        data = bytearray()
        for index in range(frames):
            value = max(-1.0, min(1.0, sample(index / RATE, index, frames)))
            data.extend(int(value * 32767).to_bytes(2, "little", signed=True))
        handle.writeframes(data)
    print(f"{path.relative_to(ROOT)}: {path.stat().st_size / 1024:.0f} KiB")


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    rng = random.Random(1987)

    write_cue("aden-cannon-v1.wav", 0.18, lambda t, _i, _n: (
        (rng.random() * 2 - 1) * math.exp(-t * 24) * 0.66
        + math.sin(2 * math.pi * (118 - t * 320) * t) * math.exp(-t * 18) * 0.58
    ))

    previous = 0.0
    def missile(t: float, _i: int, _n: int) -> float:
        nonlocal previous
        noise = rng.random() * 2 - 1
        previous = previous * 0.62 + noise * 0.38
        envelope = min(1, t * 18) * math.exp(-t * 1.8)
        turbine = math.sin(2 * math.pi * (170 + t * 680) * t) * 0.25
        return (previous * 0.64 + turbine) * envelope
    write_cue("sidewinder-motor-v1.wav", 0.72, missile)

    previous = 0.0
    def impact(t: float, _i: int, _n: int) -> float:
        nonlocal previous
        noise = rng.random() * 2 - 1
        previous = previous * 0.82 + noise * 0.18
        body = previous * math.exp(-t * 2.8) * 0.78
        thump = math.sin(2 * math.pi * (74 - t * 42) * t) * math.exp(-t * 5.2) * 0.68
        crack = noise * math.exp(-t * 22) * 0.36
        return body + thump + crack
    write_cue("heavy-impact-v1.wav", 1.05, impact)

    wind_values: list[float] = []
    previous = 0.0
    frames = int(RATE * 1.8)
    for index in range(frames):
        noise = rng.random() * 2 - 1
        previous = previous * 0.965 + noise * 0.035
        gust = 0.7 + math.sin(index / RATE * math.pi * 2 * 0.7) * 0.22
        wind_values.append(previous * gust * 2.8)
    write_cue("north-atlantic-wind-v1.wav", 1.8, lambda _t, index, _n: wind_values[index])

    # Seamless two-second Pegasus foundation. Every component completes an
    # integer number of cycles, so the checked-in loop has no hard join.
    write_cue("pegasus-engine-loop-v2.wav", 2.0, lambda t, _i, _n: (
        math.sin(2 * math.pi * 54 * t) * 0.32
        + math.sin(2 * math.pi * 108 * t) * 0.13
        + math.sin(2 * math.pi * 322 * t) * 0.08
        + math.sin(2 * math.pi * 4 * t) * math.sin(2 * math.pi * 860 * t) * 0.025
    ))

    write_cue("vtol-downwash-loop-v1.wav", 2.0, lambda t, _i, _n: (
        math.sin(2 * math.pi * 38 * t) * 0.2
        + math.sin(2 * math.pi * 76 * t) * 0.1
        + sum(math.sin(2 * math.pi * harmonic * t) for harmonic in (183, 247, 331, 419)) * 0.035
    ))

    write_cue("rocket-motor-v1.wav", 0.58, lambda t, _i, _n: (
        (rng.random() * 2 - 1) * min(1, t * 32) * math.exp(-t * 3.2) * 0.5
        + math.sin(2 * math.pi * (125 + t * 820) * t) * min(1, t * 24) * math.exp(-t * 3.8) * 0.27
    ))

    write_cue("bomb-release-v1.wav", 0.34, lambda t, _i, _n: (
        math.sin(2 * math.pi * (165 - t * 300) * t) * math.exp(-t * 15) * 0.62
        + (rng.random() * 2 - 1) * math.exp(-t * 7) * 0.16
    ))

    write_cue("flare-eject-v1.wav", 0.26, lambda t, _i, _n: (
        (rng.random() * 2 - 1) * math.exp(-t * 18) * 0.48
        + math.sin(2 * math.pi * (710 - t * 900) * t) * math.exp(-t * 13) * 0.24
    ))

    write_cue("naval-gun-v1.wav", 0.72, lambda t, _i, _n: (
        math.sin(2 * math.pi * (82 - t * 65) * t) * math.exp(-t * 5.4) * 0.72
        + (rng.random() * 2 - 1) * math.exp(-t * 9) * 0.34
    ))

    write_cue("carrier-touchdown-v1.wav", 0.62, lambda t, _i, _n: (
        math.sin(2 * math.pi * (126 - t * 115) * t) * math.exp(-t * 6) * 0.52
        + (rng.random() * 2 - 1) * math.exp(-t * 8) * 0.2
        + math.sin(2 * math.pi * 2430 * t) * math.exp(-t * 12) * 0.08
    ))

    write_cue("threat-warning-v1.wav", 0.34, lambda t, _i, _n: (
        math.sin(2 * math.pi * (880 if int(t / 0.075) % 2 else 620) * t) * (1 - t / 0.34) * 0.42
    ))

    write_cue("radio-chirp-v1.wav", 0.12, lambda t, _i, _n: (
        math.sin(2 * math.pi * (1120 if t < 0.055 else 740) * t) * math.exp(-t * 13) * 0.28
        + (rng.random() * 2 - 1) * math.exp(-t * 24) * 0.06
    ))


if __name__ == "__main__":
    main()
