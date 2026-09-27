# Iron Kestrel '87 asset and audio rights register

## Release position

Every runtime file under `public/assets` is covered by the machine-readable register in `docs/asset-rights-register.json`. The audit produces a per-file inventory containing byte size, SHA-256 digest, provenance, rights basis, evidence paths, attribution requirement and release status.

The register distinguishes two release states:

- **Approved:** project-authored metadata or deterministic audio synthesised by `scripts/generate_showcase_audio.py`.
- **Conditional:** AI-assisted visual output generated for this project, archived under `art/source`, then cleaned, composed or optimised locally. Conditional means internally cleared for the current build but still subject to the final similarity, trade-mark, livery and legal review required before commercial publication.

No stock library, third-party music, external photograph or runtime generation service is declared in the shipped asset pack. Forty-eight foundational aircraft, weapon, impact, environment and warning cues are user-directed ElevenLabs Sound Effects outputs edited locally for the project. Source files, generation records and the user's entitlement attestation are retained in the ElevenLabs provenance record. The replaced Sony Woosh ejection candidates remain archived only as non-shipping historical evidence.

Eleven instrumental music cues are user-directed Suno outputs generated and downloaded during the user's active Premier subscription, then edited locally. They remain `CONDITIONAL` pending human listening and similarity review; Suno's commercial-use permission is not treated as a guarantee of copyright protection or exclusivity.

## AI-output basis and limitation

The source records identify OpenAI's built-in image generation as the visual source. OpenAI's applicable European terms state that, as between the user and OpenAI and to the extent permitted by law, the user owns output and receives any OpenAI interest in it. Those terms also warn that output may not be unique. The register therefore records a usable rights basis but does not claim exclusivity or guarantee that an output cannot resemble third-party material.

Reference: <https://openai.com/policies/eu-terms-of-use/>

## Release procedure

Run:

```powershell
pnpm rights:audit
```

The command fails if a shipped file has no single matching rule, carries an unresolved or blocked status, or cites missing local evidence. Its full per-file output is written to `reports/commercial-release/asset-rights-audit.json`.

Before a public store submission:

1. Review every conditional hero asset for accidental logos, protected liveries, signatures, watermarks or suspicious similarity.
2. Confirm that all real aircraft and naval names are used descriptively and that marketing does not imply endorsement.
3. Record any replacement or externally commissioned asset as a new explicit rule with its agreement or licence evidence.
4. Re-run the audit and retain the generated report with the release build records.
