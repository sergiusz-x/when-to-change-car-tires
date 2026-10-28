# Round 3 review — weather and decision policy

Scope: `proposal-v3.md` only. This is a logical review of the proposed policy, not an implementation review, empirical replay, road-safety validation, or claim of perfection. The sequences below use valid Gregorian dates and valid temperature pairs (`min <= mean`).

## Result

I found no unresolved critical logical blocker in the main weather-to-assessment flow. The priority order, action gate, evidence coverage, setup-specific actions, and booking intervals are mutually consistent in the cases checked. The numerical thresholds and forecast horizons remain explicitly uncalibrated product hypotheses, as the proposal states.

One narrower specification gap remains for conflicting *lesser* hazards in duplicate rows: the policy clearly requires preserving the warning and blocking summer actions, but does not always determine whether the headline assessment is `VERIFY_WARNING` or `MIXED`. This is a reason-code/copy ambiguity rather than a blocker to the core safety behavior, provided the unconfirmed warning remains prominent and summer actions stay blocked.

## Minimal sequence checks

All listed fields are valid and complete except where explicitly marked missing. `SUCCESS` means the latest same-city refresh succeeded and retrieval age is at most six hours.

| Minimal input | Proposed outcome | Required outcome from the policy | Finding |
| --- | --- | --- | --- |
| D0..D9 complete; means all 8°C; minima all 5°C; snowfall 0; codes 0; D10..D15 empty; `SUCCESS` | `SUMMER_CANDIDATE` | Summer candidate is allowed because D0..D9 guard is complete and clear; no claim beyond D9 | Consistent. The missing optional outlook should be shown as a coverage limitation if applicable. |
| Same as above, but D10 reports min 0°C | `WATCH_OUTLOOK`; no summer suggestion | Any known ordinary winter precaution in D0..D15 vetoes summer; D10..D15 is outlook, not a near-term deadline | Consistent. |
| D0..D6 means 6°C, minima 5°C, snowfall 0, codes 0; all seven means/minima valid | `COOL_TREND` | Complete cold block with at least five means below 7°C gives planning advice even without frost | Consistent. `min <= mean` throughout. |
| D0..D6 means 8°C, D1 minimum 0°C, D1 snow/code missing; other days incomplete | `WINTER_PRECAUTION` | Known freezing minimum remains reportable despite unrelated missing fields; no dated interval unless hazard coverage D0..D1 is complete | Consistent. |
| D0..D6 means 8°C; D1 min 5°C, snowfall 0.01 cm, code 0; remaining D0..D9 complete and otherwise clear | `MIXED` | Trace snow is a verify-snow warning, blocks summer in the guard, and alone does not force a seasonal swap | Consistent; no urgent winter switch is generated. |
| Complete D0..D9 summer guard; D1 has code 73 and snowfall 0, min 5°C | `WINTER_PRECAUTION` | Code 73 independently signals moderate/heavy snow; inconsistency is explained, not averaged away | Consistent. |
| D1 trusted freeze (min 0°C); D0 duplicate conflict in min (-1°C vs 5°C); otherwise complete through D1 | `WINTER_PRECAUTION`, with unresolved earlier conflict retained | Trusted near-term precaution may take precedence, but the earlier conflict must remain visible and suppress a precise interval | Consistent when the timing gate in section 7 is applied. |
| D1 duplicate snowfall conflict (0 vs 0.2 cm), all other fields clear and complete | At minimum an unconfirmed warning and no summer suggestion | Conflicting hazard reports remain unconfirmed and block summer actions; the headline branch is not explicitly selected because trace snow is not clearly classified as a “winter-precaution report” | Narrow ambiguity; see below. |
| Any otherwise eligible summer setup, age 2h, latest same-city refresh failed | `REFRESH_REQUIRED`; no new switch action or dated interval | Failed latest refresh closes `canIssueAction`, independently of retained age | Consistent. |
| D1 first known precaution; all D0..D1 hazard fields known; D1 min 0°C | Conditional preparation before D1; booking suggestion D0 only | Do not issue a deadline for a later event or imply that D1 is safe | Consistent. |

## Remaining ambiguity and smallest fix

The duplicate-row rules preserve any conflicting hazard report as an unconfirmed warning, and the stated property says conflicting signals block summer actions throughout D0..D15. However, the assessment order gives `VERIFY_WARNING` specifically for an unresolved conflicting *winter-precaution* report in D0..D6, while light snow is separately a verify-snow signal and routes to `MIXED`. For a conflicting trace-snow report (for example, duplicate snowfall values 0 and 0.2 cm), it is not explicit whether it counts as the former or only the latter.

Smallest fix: define one explicit predicate for “unresolved conflicting hazard” and state its assessment branch. For example: any conflicting report that could satisfy a winter-precaution **or** guard-blocking light-snow/near-freezing predicate yields `VERIFY_WARNING` in D0..D6 and `WATCH_OUTLOOK` in D7..D15; lesser conflicts elsewhere remain visible in `MIXED`. Preserve the existing rule that no conflict proves an event or permits a booking deadline. Alternatively, state that the current `MIXED` branch is intended for lesser conflicts, while still guaranteeing the warning is prominent and summer remains blocked.

This ambiguity does not permit a summer suggestion under the stated property, but it can change the main assessment and translated headline. It should be settled before implementing exact reason-code/copy behavior.

## Limits

No production code, fixtures, provider parsing, rendered UI, local-time arithmetic, or archived forecast revisions were examined. No conclusion is made about predictive accuracy, road conditions, or whether the chosen 7°C, 4°C, 1 cm, 6-hour, or horizon values are optimal.
