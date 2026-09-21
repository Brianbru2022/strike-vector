# Milestone 7 directional-flight controls

Build: `IK87-1.2.0-DEV1-20260921-DIRECTION1`

Automated terminology audit: **PASS**
Human wording evidence: **PENDING MILESTONE 5 SESSIONS**

**Control concept:** Choose the direction you want to fly.

Hold the opposite direction to slow down. Kestrel One turns at low speed, then accelerates in the new direction.

| Device | Player-facing instruction |
| --- | --- |
| Keyboard | A / D or LEFT / RIGHT arrows |
| Gamepad | LEFT STICK or D-PAD left / right |
| Touch | On-screen LEFT / RIGHT flight arrows |

The legacy `THROTTLE_DOWN` and `THROTTLE_UP` identifiers remain internal so existing remaps and save archives continue to load. They are not shown as throttle controls to players.
