# Generated ground assets V2

These deterministic runtime sprites were created with OpenAI's built-in image generation mode. Full-resolution generated sources are retained under `art/source/generated-1987/ground-v2/`; alpha-cleaned and scaled runtime copies are bundled under `public/assets/sprites/`.

## Shared production specification

All five prompts used the `stylized-concept` use case and requested a realistic, hand-painted 2D game sprite in strict side elevation, overcast upper-left lighting, weathered Cold War materials, genuine transparency, a tight contact shadow, and a straight lower ground-contact edge. Every prompt excluded scenery, terrain, text, insignia, borders, watermarks and cropped running gear.

## Asset prompts

### Mobile SAM

```text
A historically plausible Soviet SA-8 Gecko 9K33 Osa mobile surface-to-air missile vehicle, strict left-facing side profile, six wheels firmly resting on one straight horizontal ground line, launcher elevated slightly with six missile canisters. Weathered Soviet olive drab, dark rubber, restrained rust and grime. Exactly one complete isolated vehicle; minimal empty space below the tyres.
```

### P-19 radar site

```text
A Soviet P-19 early-warning radar station on a low hardened concrete equipment bunker, with a broad rectangular lattice antenna array and a smaller mast, strict side elevation. Detailed weathered steel, cables, latticework and stained concrete. The complete concrete foundation sits on one straight horizontal ground line.
```

### T-72M

```text
A historically plausible Soviet T-72M main battle tank, strict left-facing side profile, long 125 mm gun pointing left, complete tracks and road wheels firmly resting on one straight horizontal ground line. Detailed weathered armour, welds, track links, stowage, subtle grime, rust and mud.
```

### Fortified fuel depot

```text
A fortified Cold War military fuel depot with two large cylindrical storage tanks, connecting pipes, pumps, ladders and low reinforced concrete blast walls, strict side elevation. Detailed aged metal, stained concrete, valves and pipework. Broad low silhouette with the complete foundation on one straight horizontal ground line.
```

### ZSU-23-4

```text
A Soviet ZSU-23-4 Shilka tracked self-propelled anti-aircraft vehicle, strict left-facing side profile, four cannon barrels slightly elevated, compact radar dish above the turret, complete tracks resting on one straight ground line. Detailed weathered armour, track links, gun mechanisms, dark steel, soot and restrained rust.
```

## Transparency processing

The generator returned opaque checkerboard pixels despite the transparency instruction. Runtime copies therefore use deterministic edge-connected background extraction, global pale-backdrop cleanup, alpha trimming and a maximum width of 768 pixels. Corner alpha was verified as zero for every final sprite.

## Runtime files

- `public/assets/sprites/sa8-gecko-v2.png`
- `public/assets/sprites/p19-radar-v2.png`
- `public/assets/sprites/t72m-v2.png`
- `public/assets/sprites/fuel-depot-v2.png`
- `public/assets/sprites/zsu23-4-v2.png`
