# Round 2 product review — proposal v2

Scope: adversarial review of the proposed policy, using concrete driver scenarios and the current UI/data model for context. This is a specification review, not a production change, forecast replay, or validation of road-safety outcomes.

## Findings

### 1. Temperature range validation is named but not specified

- **Severity:** Medium specification gap; not a demonstrated blocker in ordinary provider data.
- **Concrete input:** A provider-shaped day with `temperature_2m_mean = 80°C`, `temperature_2m_min = 75°C`, valid date, valid snow and weather-code fields, and otherwise qualifying warm days.
- **Proposed behavior:** The data contract says temperatures must be finite and in the “expected unit/range,” but supplies no accepted range or disposition for an out-of-range value. A literal implementation could accept this record and contribute to `SUMMER_CANDIDATE`; another implementation could reject it.
- **Expected displayed behavior:** The invalid temperature evidence should be marked unknown with a visible limitation, so it cannot help complete the seven-day mean block or summer guard. This expectation needs a defined admissibility rule.
- **Smallest correction:** Specify the accepted provider-domain range for temperature fields (and whether bounds are inclusive); document that violations invalidate the affected temperature fields and therefore may block a trend or guard. Prefer a provider/schema-backed bound over an unexplained climate heuristic.

### 2. D1 booking suggestion assumes a usable appointment remains today

- **Severity:** Unvalidated operational heuristic / deliberate tradeoff, not a logical safety blocker.
- **Concrete input:** Warsaw, current local time 23:50 on D0, current forecast with complete hazard fields, and a known freezing-air signal on D1; driver selected summer tires and expects to drive tomorrow.
- **Proposed behavior:** D1 timing says “Arrange winter tires today” and allows D0 as the only suggested booking day, even though same-day tire service may no longer be available.
- **Expected displayed behavior:** Keep the forecast event date and conditional urgency, while making clear that the booking suggestion is only actionable if service is available; if not, the driver must verify conditions and tire suitability before travel. Do not imply that a same-day booking is guaranteed or that the forecast establishes safe travel.
- **Smallest correction:** Qualify the D1 wording with “if you can arrange it today” and add a concise verification-before-travel fallback. This is a usability limitation of date-only data and the chosen prompt horizon, not evidence that D1 is physically the wrong threshold.

## Scenario and logic checks

- **Known winter precaution with missing unrelated fields:** A valid D1 minimum of `0°C` still produces a named precaution when means or code are missing. Dated booking language is suppressed unless the required D0..D1 hazard fields are complete. This preserves the reportable signal without overstating timing.
- **Daily minimum on D0:** A D0 minimum at or below zero is worded as a signal somewhere in today's daily forecast, with unknown time. The policy does not claim the event is still ahead or that changing tires later today resolves it.
- **Unknown setup:** The policy makes advice conditional on the actual set (“if currently on summer/winter tires”) and does not invent a current tire. This avoids the current UI's inferred setup behavior.
- **All-season setup:** A winter signal remains visible, but the policy neither orders an automatic swap nor asserts capability. Saying that tire-specific capability is not assessed is an appropriate boundary.
- **City/freshness lifecycle:** Binding the result atomically to city/weather/retrieval/assessment, hiding an old result immediately on city change, ignoring stale request generations, and rechecking freshness on focus/resume addresses the principal stale-city and stale-result hazards. Failed refresh behavior is explicit.
- **Signal thresholds and priorities:** Exact `0°C`, `4°C`, `7°C`, and `1 cm` cases have stated operators. Trace snow at positive temperature is a blocker/caution rather than an urgent seasonal switch; freezing air remains independently higher priority. Snow/code contradictions retain their separate evidence.
- **Horizon and action ordering:** D0..D6 trusted winter precautions outrank warmth; D7..D15 winter precautions veto a new summer suggestion without becoming a near-term deadline; D16 is excluded. A known event is not moved to repair an interval. The D0/D1/D2/D3..D6 timing table keeps event evidence distinct from a safe-travel deadline.
- **Completeness/monotonicity:** Unknown is not treated as warm. Removing required summer-guard evidence cannot enable eligibility, and an added D0..D9 winter/trace/near-freezing signal cannot enable summer eligibility under the stated predicates. Optional-outlook deletion is correctly excluded from a universal monotonicity claim.
- **Fixture temperature invariant:** The existing visible recommendation/debug test fixtures inspected have `tempMinC <= tempMeanC`; the generated-debug fixture test also explicitly checks the invariant (with an additional 0.3°C margin). The proposal correctly requires future fixtures to include local today and the added hazard fields; their values should preserve `min <= mean` unless the fixture is deliberately testing invalid-pair handling.

## Conclusion

No unresolved critical logical blocker is apparent in the revised policy. The range rule should be completed before implementation so different implementations cannot disagree on malformed but finite inputs. The D1 booking wording is a practical heuristic that needs transparent copy, not a claim of validated forecast or service availability. Nothing in this review establishes empirical forecast skill or validates a tire-safety threshold.
