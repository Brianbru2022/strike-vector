# Release rollback runbook

1. Stop promotion and preserve the failing build, logs and candidate manifest.
2. Confirm the previous stable installer checksum and signing certificate against its immutable manifest.
3. Back up `%APPDATA%\com.ironkestrel.iron-kestrel-87\save-v1.json` and all rotating backups.
4. Install the previous stable build without deleting the save directory.
5. Verify launch, archive import, campaign load and one safe save cycle. Never downgrade a save unless the previous build explicitly supports its migration range.
6. Repoint the Steam default branch only after the local rehearsal passes; retain the failed branch privately for diagnosis.
7. Record timings, build IDs, save checksums and outcome in the Stage 10 approval evidence.

No previous stable commercial build is currently registered, so rollback certification remains pending.
