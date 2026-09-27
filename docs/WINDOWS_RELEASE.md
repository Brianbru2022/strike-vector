# Windows commercial edition

The Windows 10/11 edition uses Tauri 2 and Microsoft WebView2. The web edition remains a PWA; desktop builds use Vite's `desktop` mode and contain no service worker or web manifest registration.

## Developer commands

- `pnpm desktop:dev` runs the native shell against the desktop-mode Vite server.
- `pnpm desktop:check` type-checks, creates the service-worker-free frontend and runs Rust tests/checks.
- `pnpm desktop:release` produces an MSI installer, a portable QA executable and a SHA-256 release manifest.

The portable executable is a QA artefact, not a no-install consumer distribution: WebView2 must already be available. The MSI uses Microsoft's WebView2 download bootstrapper. Windows Installer requires a numeric prerelease component, so package revision `1.2.0-1` corresponds to the in-game `1.2.0-beta.2` build.

## Saves and recovery

The authoritative desktop save is `%APPDATA%\com.ironkestrel.iron-kestrel-87\save-v1.json`. Writes use a synced temporary file, atomic replacement and three rotating backups. Startup validates the archive envelope and recovers from the newest valid backup. The payload is the existing signed `IRON_KESTREL_SAVE_ARCHIVE` format, so Campaign V1–V4 migration and browser archive import remain unchanged.

Steam Auto-Cloud configuration:

- Root: `WinAppDataRoaming`
- Path: `com.ironkestrel.iron-kestrel-87`
- Pattern: `save-v1.json`
- Recursive: disabled
- Platforms: Windows

Only the primary archive should be synchronised; local rotating backups remain machine-local recovery evidence. No Steam achievements, statistics, workshop or overlay integration is claimed by this build.

## Signing

Set `IRON_KESTREL_SIGNING_CERT_SHA1` to the thumbprint of an installed, trusted Windows code-signing certificate, then run `scripts/sign-windows-artifacts.ps1`. The script signs and verifies every EXE/MSI without reading or displaying private key material. A distributable commercial build must not ship while the release manifest reports `signed: false`.

## Windows release gate

On clean Windows 10 and Windows 11 test machines, record: clean install, first launch, browser archive import, save/relaunch, deliberate primary-save corruption and backup recovery, in-place update, uninstall with explicit save-retention result, and reinstall. Installer signing and these two-OS lifecycle checks require release infrastructure and cannot be certified by unit tests alone.
