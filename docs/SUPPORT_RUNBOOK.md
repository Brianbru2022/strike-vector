# Support runbook

Capture product version/build ID, Windows version, input device, mission, difficulty, reproduction steps and the exported save archive. Never request raw credentials or Steam account data.

1. Confirm the build identity on the title screen and in the candidate manifest.
2. Preserve the affected save directory before troubleshooting.
3. Check `save-v1.json`, then the rotating backups. The game selects the newest checksum-valid archive.
4. Reproduce on the same build and classify as release blocker, accessibility defect, data-loss risk or non-blocking presentation issue.
5. Add verified cases to the defect register. Do not promise a patch date before triage.

Escalate crashes, save loss, unachievable objectives, inaccessible controls and licence/privacy defects immediately.
