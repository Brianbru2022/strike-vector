# Stage 9 commercial, legal and storefront preparation

Current preparation build: `IK87-1.2.0-DEV1-20260831-REL10`. All generated capsule and gameplay-media manifests are build-bound and checksum-verified; evidence from an earlier build cannot certify this candidate.

## What is prepared locally

- EULA, privacy, support, AI-content and third-party notice drafts are bundled under `public/legal`.
- The asset register covers every runtime asset and retains per-file provenance and hashes.
- The Steam content-survey draft accurately identifies pre-generated AI visual content and no live generation.
- Store copy and a conservative feature-claim matrix omit uncertified Steam Cloud, controller, language and accessibility promises.
- Current-dimension Steam capsules, library art and gameplay-only screenshots are generated under `marketing/store/stage9`.
- The capsule manifest binds every crop to the archived source image, provenance record, candidate build and SHA-256 checksums.
- The media manifest records build, dimensions and SHA-256 checksums for screenshots and the 1920×1080 gameplay-video master.

## External gates that automation cannot approve

1. A qualified trade-mark professional must clear the title for the intended territories and classes.
2. The publisher's legal identity, public support contact, governing-law position and counsel approval must be recorded.
3. A human must review every conditional AI-assisted asset for similarity, protected markings and malformed details.
4. The Steamworks account holder must complete the live content survey and submit both store presence and near-final product build.
5. Valve approval and the public Coming Soon date must be recorded.

Steam states that the store presence and build are both reviewed; reviews typically take 3–5 business days and developers should allow at least 7 business days for each. A new product must have a public Coming Soon page for at least two weeks before release. Steam's current capsule rules restrict base capsule text to the game name and official subtitle, and screenshots must show gameplay rather than concept art or marketing copy.

Official sources checked 31 August 2026:

- Content Survey: <https://partner.steamgames.com/doc/gettingstarted/contentsurvey?language=english>
- Review Process: <https://partner.steamgames.com/doc/store/Review_Process>
- Release Options: <https://partner.steamgames.com/doc/store/types?language=english>
- Graphical Assets: <https://partner.steamgames.com/doc/store/assets?l=english>
- Graphical Asset Rules: <https://partner.steamgames.com/doc/store/assets/rules?l=english>

## Commands

```powershell
pnpm stage9:art
pnpm stage9:capture
pnpm stage9:audit
pnpm stage9:gate
```

`stage9:audit` verifies the locally preparable pack and writes `reports/commercial-release/stage9-commercial-readiness.json`. The strict audit writes a separate `stage9-commercial-release-gate.json`, so a failed external gate cannot overwrite the successful local preparation evidence. `stage9:gate` is deliberately strict and remains unsuccessful until the external approvals in `config/commercial-approval.json` are genuine and the signed near-final build is available.
