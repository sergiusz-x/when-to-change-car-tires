# Round 3 review — data and policy logic

Scope: `proposal-v3.md` only. This review looks for critical logical contradictions in assessment precedence, refresh authorization, missing/conflicting evidence, horizons, outlook, and date/clock rules. It does not assess forecast skill or threshold calibration.

## Result

**No unresolved critical logical blocker found.** The precedence and date rules can be applied consistently to the cases below. The specification makes no claim that the heuristics predict road conditions or are calibrated.

## Minimal consistency fixtures

Assume local today is 2026-10-23, a valid location/timezone is present, `now` is fixed, the retrieval is 1 hour old, and the latest same-city refresh succeeded. Unless stated otherwise, dates D0–D15 have `mean=8°C`, `min=5°C`, `snowfall=0cm`, and `code=0`; thus all temperature pairs satisfy `min <= mean`.

| Fixture | Proposed result | Required behavior | Review |
| --- | --- | --- | --- |
| D1 `min=0°C`, `mean=8°C`; other D1 hazard fields absent | `WINTER_PRECAUTION` | A known freeze remains reportable despite unrelated missing fields; explain missing data. | Consistent. |
| D0 duplicate snowfall values `0.2cm` and `0cm`; D2 known `min=0°C` | `WINTER_PRECAUTION` from D2 takes precedence over the D0 conflict | Preserve D0 as an unconfirmed warning; suppress a precise interval because an earlier conflict exists. | Consistent across precedence and date rules. |
| Same baseline, but no D2 event and only a conflicting winter-precaution report on D0 | `VERIFY_WARNING` | Do not declare an event, infer a switch date, or issue a positive summer suggestion. | Consistent. |
| Same baseline, ordinary forecast retrieval age 2h, latest same-city refresh failed | `REFRESH_REQUIRED` | Retain the signal as unconfirmed; issue no switch instruction or dated interval. | Explicit gate overrides otherwise-current age. |
| D0–D9 complete as baseline; trusted freeze on D10 | `WATCH_OUTLOOK` | Do not suggest a new summer switch; show it as tentative outlook, without a dated booking instruction. | Consistent with the D10–D15 veto. |
| D0–D9 complete as baseline; D10–D15 hazard fields absent, with no recorded conflicting report | `SUMMER_CANDIDATE` may be eligible, with coverage limitation | Do not invent a late hazard; expose actual outlook coverage and make no claim beyond D9. | Explicitly permitted, not a contradiction. |
| D0–D9 complete as baseline; D9 mean `7°C` | Not summer eligible | The test is strictly `>7°C`; exactly 7°C is a transition value. | Consistent. |
| D0 `min=4°C`, `mean=8°C` | Caution blocks summer eligibility in the guard | Describe the precaution without asserting frost or forcing a switch. | Consistent. |

## Small clarification (non-blocking)

Define whether the initial successful forecast retrieval sets `latestRefreshOutcome=SUCCESS`. The gate otherwise leaves the first-load interpretation implicit. Smallest repair: state that a completed initial retrieval for the selected city counts as a successful refresh; a pending or failed initial retrieval does not authorize actions.

## Limits

This is a policy-logic review, not an implementation check, provider-parsing review, UI review, or validation of weather/tire outcomes. No accuracy or safety guarantee is inferred.
