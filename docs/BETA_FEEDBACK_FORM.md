# Restricted beta feedback form

The restricted beta uses the repository's structured GitHub Issue Form at `https://github.com/Brianbru2022/strike-vector/issues/new?template=beta-feedback.yml`. The itch build reads the approved route from `config/external-beta-approval.json` and embeds it at build time. GitHub requires testers to sign in, so the privacy notice and consent wording explicitly describe that external account boundary. The form does not request a name or email address.

## Required questions

1. Experience group: little/no flight-game experience; action-game experience; flight-game experience.
2. Input used: keyboard; Xbox-compatible controller; touch; other.
3. Browser/device class: desktop/laptop; phone; tablet. Do not request a device identifier.
4. Did the game start and retain progress after reload? yes/no/unsure.
5. Did you understand pitch and altitude control? yes/no/partly.
6. Did you understand that A/D turns the aircraft and flies left/right? yes/no/partly.
7. Did you understand VTOL? yes/no/partly.
8. Did you acquire and attack a target? yes/no.
9. Did you notice fighter, radar and missile warnings before impact? all/some/none/not encountered.
10. Did you use countermeasures? yes/no/not needed.
11. If you failed, did you understand why? yes/no/not applicable.
12. Was carrier or FARP recovery achievable? yes/no/not reached.
13. After Mission 1, did you want another sortie? yes/no/unsure.
14. Did you actually start Mission 2? yes/no.
15. What was the best moment? optional free text.
16. What nearly made you stop? optional free text.
17. May the developer use this anonymous response to improve the game? yes/no.
18. Optional file upload for the player-reviewed beta play record or issue report.

## Analysis rules

- Behaviour outranks compliments: retries, Mission 2 starts and return visits are stronger evidence than a general score.
- Treat the same confusion reported by two or more testers as repeated.
- Treat crash, save loss, unavoidable attack, impossible recovery, unreadable essential cue or input loss as a blocker.
- Do not infer missing answers or link records across services using fingerprints.
