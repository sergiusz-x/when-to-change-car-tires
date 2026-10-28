# Round 2 review — data and policy logic

Scope: adversarial specification review of `proposal-v2.md` only. No production code was reviewed or changed. Fixtures below use valid Gregorian date keys and provider-domain values unless a conflict is explicitly described. These are logical/specification findings, not empirical findings about forecast skill.

## 1. Failed refresh has no defined place in assessment precedence

- **Severity:** Critical — unresolved logical/specification blocker.
- **Minimal fixture:** `now=2026-10-23T10:00:00Z`; valid location/timezone and `fetchedAt=2026-10-23T08:00:00Z` (CURRENT); successful result contains valid D0–D15 records, with D0–D9 each `mean=10°C`, `min=8°C`, `snowfall=0 cm`, `weather_code=0`, and no winter signal on D10–D15. Setup is `winter`. A subsequent explicit refresh fails.
- **Proposed behavior:** Assessment precedence sees CURRENT data and returns `SUMMER_CANDIDATE`; the matrix tells a winter-setup user to consider changing to summer tires in the next few days.
- **Required behavior:** Section 8 says a failed refresh blocks affirmative new-summer advice until a successful refresh, even while retained data is under six hours old. The retained result may remain visible with its failed-refresh state, but must not produce that action.
- **Why unresolved:** The assessment order tests only age (`STALE/EXPIRED`) and has no failed-refresh state or override. Therefore the two normative sections prescribe contradictory outcomes for this fixture.
- **Smallest fix:** Add an explicit failed-refresh gate before `SUMMER_CANDIDATE` (with a named result/action state and retained-data presentation), and state whether it suppresses only summer advice or any dated action. Add this exact fixture to required validation.

## 2. Conflicting late duplicate hazards have no explicit summer-veto outcome

- **Severity:** High — specification ambiguity with safety-relevant action impact; logical blocker until resolved.
- **Minimal fixture:** CURRENT data, valid timezone/location, `now=2026-10-23T10:00:00Z`, setup `winter`. D0–D9 have complete valid fields as above. On D10, two otherwise identical valid records conflict only on `snowfall_sum`: `0 cm` and `1 cm`; all other D10–D15 fields are valid and show no winter precaution. Treat D10 snowfall as unknown and preserve the conflict as an unconfirmed warning, as Section 3 requires.
- **Proposed behavior:** The decision steps can reach `SUMMER_CANDIDATE`: there is no *known* D10–D15 winter precaution, and the D0–D9 guard is complete. The warning is shown as a caveat. The spec does not say whether the resulting affirmative summer suggestion is permitted.
- **Required behavior:** Specify one outcome. Given the stated rule that a conflict is not a reassuring absence and the D10–D15 veto is intended to guard against a later winter signal, the conservative resolution is to suppress a new summer suggestion while the unconfirmed winter hazard remains unresolved. If the intended policy allows a candidate with this warning, say so explicitly and require the headline to expose the unresolved D10 evidence.
- **Why unresolved:** `known winter-precaution signal` excludes a field made unknown by conflict, while “not ... a reassuring absence” does not define the action consequence. The property “conflicting signals retain an unconfirmed warning” likewise only requires display, not veto behavior.
- **Smallest fix:** Define whether an unconfirmed D10–D15 winter-precaution report vetoes `SUMMER_CANDIDATE`; encode the chosen branch in the assessment precedence and required fixtures.

## Unresolved blocker status

**An unresolved critical logical blocker remains:** failed-refresh state can yield contradictory recommendations for otherwise identical CURRENT data. The late-conflict case is a separate high-severity specification ambiguity. This review does not establish that the policy is ideal or empirically validated.
