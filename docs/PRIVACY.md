# Iron Kestrel '87 privacy notice

Effective date: 30 August 2026

## Summary

Iron Kestrel '87 is an offline-capable game with no account system, advertising SDK or developer-operated analytics service. The game does not transmit play diagnostics, campaign progress or control input to the developer. No cloud-save feature is claimed unless a distributor-specific configuration is separately certified and enabled.

## Information stored on the device

The browser edition stores this information in local site storage. The Windows edition stores a versioned save archive and rotating recovery backups in the application's per-user roaming-data directory:

- campaign progress, scores, difficulty, aircraft condition and selected loadout;
- control bindings, touch-control settings and accessibility preferences;
- showcase, landing-practice and Dynamic Operations progress and records;
- internal-development builds may retain up to 100 optional local diagnostic sessions containing mission result, simulation timing, objectives, weapon totals and hits, damage categories, warnings, landing grade and difficulty;
- internal-development validation evidence when Validation Runs are explicitly enabled.
- cached application code, artwork and audio needed for offline play.

Normal consumer builds do not record playtest diagnostic sessions or expose validation and mission-authoring tools. Internal diagnostics do not include names, email addresses, account identifiers, precise location, IP addresses, raw key presses, free-form messages or browsing history. Operation seed values are removed from the issue-report export.

The restricted itch.io beta records at most 250 coarse events locally: session started, mission started, sortie result, retry requested and continue requested. Events contain the build, UTC calendar day, mission, difficulty, simulation ticks and result where applicable. They contain no raw controls, free text, account, advertising identifier or network address. Nothing is transmitted automatically. **Export Beta Play Record** creates a JSON file only when the player asks for it, so the player can review and voluntarily attach it to the separately configured feedback route.

## Network use

After initial download, the complete campaign can run offline. Network requests are limited to loading or updating the application files and the local server health check used by development and deployment environments. The game contains no developer-operated telemetry endpoint and does not automatically upload exported files.

Browser or operating-system speech synthesis may be used for optional radio speech. Processing behaviour depends on the browser or operating system; captions remain available and speech can be muted.

## Player controls

- Internal-development diagnostics can be disabled, exported or cleared in **System Settings**.
- An issue report is created only when the player presses **Export Issue Report**. Exporting downloads a JSON file to the device; it does not send it anywhere.
- In the restricted itch.io beta, **Export Beta Play Record** downloads the local coarse-event record. It is not uploaded automatically.
- **Export Progress** creates a versioned save archive containing campaign, operation, showcase and score progress. It excludes diagnostics and validation evidence and is never uploaded automatically.
- Importing a save validates its format and checksum before replacement. The prior progression is retained locally as a rollback backup.
- Browser data and offline files can be removed using clear-site-data or installed-app controls. Windows save archives may be retained when uninstalling so progress can survive reinstallation; they can be removed from the application's per-user roaming-data directory after exporting any wanted backup.

## Children and sensitive information

The game does not ask players to submit personal or sensitive information. Players should not add personal information when sending an exported issue report through an external support channel.

## Changes and contact

Material changes to data collection must update this notice, the in-game summary and the release version. Privacy or support questions should use the support channel on the storefront or distribution page from which the game was obtained.
