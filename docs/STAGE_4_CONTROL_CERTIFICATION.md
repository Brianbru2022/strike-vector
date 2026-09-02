# Stage 4 — Tutorial and control certification

Stage 4 makes the first training prompt reflect the active device before the player presses a control. Coarse touch-first devices start with touch prompts, an already connected Xbox-compatible controller starts with gamepad prompts, and hot-plugging or disconnecting a controller changes prompts without leaving held actions active.

Gamepad flight prompts name the left stick and D-pad directions rather than showing an unbound-button dash. Keyboard remapping and touch labels continue to use the shared semantic input-action layer.

## Hardware gate

Complete Guided Mission 1 from launch through combat, VTOL transition and carrier recovery using:

1. A physical keyboard.
2. A physical Xbox-compatible controller.
3. A real mobile device in landscape using touch only.

Record the exact hardware and observations in `reports/stage-4/control-certification-evidence.json`. Do not derive physical certification from browser automation. Run `pnpm stage4:evidence` to verify the evidence and `pnpm stage4:gate` for the complete gate.
