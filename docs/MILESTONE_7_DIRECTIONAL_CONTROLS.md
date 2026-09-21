# Milestone 7 — directional flight controls

The player-facing model is now:

**Choose the direction you want to fly. Hold the opposite direction to slow down. Kestrel One turns at low speed, then accelerates in the new direction.**

This wording describes the result the player sees. The controls are not presented as a conventional throttle:

- Keyboard: A/D or the left/right arrow keys.
- Gamepad: left stick or D-pad left/right.
- Touch: on-screen left/right flight arrows.

The flight-school lesson, HUD reference, touch accessibility labels, remapping screen, Flight Manual and README all consume the same copy authority. The internal semantic identifiers `THROTTLE_DOWN` and `THROTTLE_UP` remain unchanged because they are part of existing binding profiles and save compatibility; they are an implementation detail.

Run the automated terminology audit with:

`pnpm milestone7:controls:audit`

Run the implementation checks with:

`pnpm milestone7:prepare`

The strict gate is:

`pnpm milestone7:gate`

The strict gate deliberately consumes the five-player Milestone 5 evidence. Automated checks cannot establish whether unfamiliar players understand the wording. Review the `DIRECTION` comprehension time and `DIRECTION_VS_THROTTLE` confusion category after the real sessions, then revise only the canonical copy if repeated confusion remains.
