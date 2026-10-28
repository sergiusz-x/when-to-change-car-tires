# Review resolution and remaining validation

The user requested independent adversarial GPT Luna reviews and another three-reviewer round if critical defects were found. Production code remains unchanged.

## Round 1 — proposal v1

Three independent reviewers produced `review-weather.md`, `review-data.md`, and `review-product.md`.

| Finding | Resolution in v2 |
| --- | --- |
| Hard/severe signal and urgent-action predicates were ambiguous; trace snow could cause an urgent swap | Explicit forecast-signal table, light/trace warning distinct from winter precaution, lead-time priority distinct from physical severity; no assertion of measured ice |
| 3°C buffer did not cover cited 0–4°C surface-frost caution | Use 4°C as a conservative, explicitly uncalibrated guard; never describe higher air temperatures as frost-free |
| Missing cold-trend denominator and guard fields | Require all seven means for cold trend and all four fields on each ten-day guard date |
| Today's daily minimum can be in the past | Separate D0 wording; no hour or before-today deadline |
| Driver setup and timing could contradict | Visible unknown/summer/winter/all-season choice; setup-specific action matrix; no invented opposite setup or winter change date for a winter user |
| D2 and D14/D15 were underspecified | Explicit D0/D1/D2/D3–D6 timing and D7–D15 outlook |
| Future summer-candidate windows added false precision and complexity | Remove the future date scan; evaluate a current candidate and explain blockers |
| City race, failed refresh and recheck UX | Bind results to city/request identity, expose refresh and timestamp, specify freshness and retained-result behavior |
| Sharp thresholds, prolonged waiting and forecast churn | Retain as explicit empirical hypotheses; measure separately using archived forecasts as issued; do not claim calibrated confidence |

One product-review example used minima above daily means. That example is not a valid counterexample and is rejected by normalization; the underlying copy distinction between cooling and confirmed road ice remains useful and was retained.

## Round 2 — proposal v2

Three NEW independent reviewers produced `review-round2-weather.md`, `review-round2-data.md`, and `review-round2-product.md`.

| Finding | Classification | Resolution in v3 |
| --- | --- | --- |
| CURRENT age plus failed refresh could both allow and forbid a summer suggestion | Critical specification contradiction | One explicit `canIssueAction` gate in assessment order, driven by valid clock/location, age and latest same-city refresh success; no new switching instructions or dated intervals while gated |
| Late conflicting duplicate hazard became unknown without a defined summer veto | High specification ambiguity | Unconfirmed winter-precaution conflict blocks summer throughout D0–D15; VERIFY_WARNING near-term, WATCH_OUTLOOK later; no firm dates from a conflicting report |
| Input numerical sanity ranges undefined | Implementation gap | Explicit broad temperature/snowfall bounds and supported WMO code set; outliers become unknown, never warm |
| D1 change-today instruction can be infeasible at 23:50 | Product/copy limitation | Do not promise workshop availability or postpone forecast risk; if change is not possible, advise reassessing/postponing travel in those forecast conditions |
| D14 frost veto, trace-snow guard and threshold sensitivity | Deliberate conservative policy, not proven superiority | Retained for initial hypothesis; compare delay, unnecessary changes and advice churn during replay; no scientific validation claimed |

## Limits that model review cannot remove

- No local road-surface or route assessment exists in these inputs. Air minimum and precipitation forecasts cannot certify driving safety.
- The 5/7 count, >7°C summer trend, 4°C guard, 1 cm cutoff, ten-day guard, two-week outlook veto, and six-hour freshness policy need empirical calibration.
- Independent model reviewers can share blind spots. Agreement is not proof of completeness or forecast accuracy.
- A production implementation still requires provider fixtures, real page-flow/render checks, request-race/freshness/timezone tests, required project checks and forecast-as-issued replay. Planning documents and a disposable logic probe do not establish these outcomes.

## Round 3 — proposal v3

Three NEW independent reviewers produced `review-round3-weather.md`, `review-round3-data.md`, and `review-round3-product.md`. Each reported no unresolved critical logical blocker. This is their observed review result, not a proof of correctness.

Final noncritical clarifications incorporated after this round:

- An initial successful usable fetch explicitly counts as SUCCESS; a pending request does not erase the previous failure.
- Conflicts involving only lesser warning signals do not enter the winter-precaution branch. Missing required guard fields yield INSUFFICIENT unless a higher-priority assessment applies; late lesser conflicts remain outlook caveats.
- Booking prompts are explicitly distinct from completion of a tire change and from any road-safety deadline. Workshop availability is not assumed.

No fourth review round is recommended at this point. The next useful validation is implementing and exercising the specified behavior, followed by archived-as-issued forecast evaluation. If that reveals a new critical policy contradiction, revise the specification and review the affected rules again.

## Work completed and not completed

Completed: repository/algorithm analysis, official-source checks, three proposal versions, nine independent GPT Luna reviews in three rounds, and disposition of the findings. `git diff --check` verifies patch whitespace only.

Not completed or claimed: replacement production code, executable validation of the new engine, browser/UI validation of the redesign, or historical forecast calibration. Existing tests passing for the old application would not establish the redesigned policy's correctness; they were not rerun for documentation-only changes.
