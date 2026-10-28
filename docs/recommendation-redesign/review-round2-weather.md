# Round 2 review — weather policy

Scope: adversarial review of `proposal-v2.md` as a local seasonal-planning policy. This review did not inspect earlier reviews or other round-2 reviews, and did not change production code. Examples below use `now = 2026-10-23T12:00:00Z`, timezone `Europe/Warsaw` (local D0 = 2026-10-23), a valid city identity, and a retrieval time equal to `now`. Each stated daily pair has `min <= mean`; omitted fields in sequences are explicitly set to complete, valid values. Dated examples therefore have valid local-calendar semantics. The weather-code sets in the proposal match Open-Meteo's published WMO-code table.

## Findings

### 1. A single D10–D15 forecast precaution can veto summer planning far beyond the evidence window

**Classification:** Product tradeoff / unvalidated empirical heuristic, not a logical contradiction. **Severity:** Moderate usefulness and churn risk.

**Minimal valid input:** For every date D0–D15 set `mean=10°C`, `min=5°C`, `snowfall=0cm`, `weather_code=0`. On D14 only, change to `mean=8°C`, `min=0°C`, `snowfall=0cm`, `weather_code=0`. All fields are present, in range, and `min <= mean`.

**Expected interpretation:** D0–D9 meet the stated summer evidence guard; there is no near-term winter signal. D14 is a tentative, two-week-out cold-air signal and should be disclosed as outlook uncertainty. Whether one such signal should suppress planning entirely is a product choice that needs replay evidence.

**Proposed outcome:** The D14 `min <= 0°C` is a winter precaution in D10–D15, so step 5 returns `WATCH_OUTLOOK` and blocks a new summer-switch suggestion. Removing only the D14 signal changes the result to `SUMMER_CANDIDATE`. This abrupt switch can recur as the forecast is revised or the rolling horizon advances, although the proposal correctly labels the horizon tentative.

**Smallest fix:** Keep the veto only if archived-forecast replay shows the benefit outweighs delay/churn. Otherwise make D10–D15 a visible caveat rather than a hard veto, or require repeat confirmation across refreshes. The existing text appropriately avoids claiming this policy is calibrated; retain that limitation in product copy.

### 2. The 4°C guard and 1 cm snow cutoff create sharp action changes around unvalidated boundaries

**Classification:** Product tradeoff / unvalidated empirical heuristic. **Severity:** Moderate; threshold sensitivity may make advice appear more certain than the inputs justify.

**Minimal valid input A (guard boundary):** On D0–D9 set `mean=8°C`, `snowfall=0cm`, `weather_code=0`. Set every minimum to `4.1°C`; all remaining dates D10–D15 can use `mean=8°C`, `min=5°C`, `snowfall=0cm`, `weather_code=0`.

**Proposed outcome A:** The D0–D6 means are all strictly above 7°C, each guard minimum is above 4°C, and no snow signal exists, so the result is `SUMMER_CANDIDATE`. Change just D0's minimum from 4.1°C to 4.0°C (still `min <= mean`): the near-freezing caution blocks the guard and produces `MIXED`.

**Minimal valid input B (snow boundary):** Use the same complete sequence, with all minima `5°C`; set D5 snowfall to `0.99cm`, then compare with `1.00cm`. Keep D5 `mean=8°C`, `weather_code=0`.

**Proposed outcome B:** `0.99cm` is a light-snow warning and blocks summer eligibility; `1.00cm` is a winter precaution and still blocks eligibility, but can move the main result to `WINTER_PRECAUTION` if D5 is within D0–D6. These are explicit boundaries, so the rules are deterministic; the proposal itself says their calibration is unknown.

**Expected interpretation:** These values do not establish corresponding changes in road condition or tire suitability. The thresholds can be useful policy cutoffs, but their behavioral impact and revision sensitivity are unmeasured.

**Smallest fix:** No logical change is required. Keep the thresholds visibly identified as policy heuristics, and use the proposed archived-forecast replay to measure how often small revisions cross them and whether the resulting actions help or create churn. Do not translate either result into a safety claim.

### 3. Any positive snowfall amount is an eligibility blocker, even when it is a tiny forecast trace

**Classification:** Product tradeoff / unvalidated empirical heuristic. **Severity:** Low to moderate; likely to affect availability of summer suggestions in noisy forecasts.

**Minimal valid input:** On D0–D9 set `mean=8°C`, `min=5°C`, `weather_code=0`, `snowfall=0cm`, except D5 snowfall is `0.01cm`. Dates D10–D15 use the complete benign values above. The pair on every date satisfies `min <= mean`.

**Expected interpretation:** The input is a tiny positive daily snowfall estimate with no freezing air and no snow weather code. It merits disclosure as a forecast trace, but whether it should block a summer candidate is empirical; it is not evidence of snow on the road.

**Proposed outcome:** D5 meets the `snowfall > 0` light/trace signal predicate, so `MIXED` blocks `SUMMER_CANDIDATE`. A revision from `0.01cm` to `0cm` removes that blocker and can enable a summer suggestion, provided the other fields stay unchanged.

**Smallest fix:** Retain this only if replay shows it provides useful caution without excessive switching. A minimal alternative is a separately calibrated trace threshold; any change should remain distinct from the `>=1cm` winter-precaution threshold and should not describe forecast snowfall as observed road cover.

## Other checks

- I found no unresolved critical logical blocker in the revised policy. The precedence is internally consistent for the cases reviewed: a near-term winter precaution outranks warmth; the far outlook veto precedes summer eligibility; incomplete required summer evidence cannot qualify; and setup changes the action without changing the weather assessment.
- The D0 daily-minimum caveat is handled correctly: it is a date-level signal, not an asserted future time. The proposed wording explicitly avoids a past deadline or implying a later same-day change fixes an earlier event.
- The distinction between forecast precautions and road safety is repeated in the policy and action matrix. Minimum air temperature, WMO weather codes, and snowfall are forecast proxies; none measures route-level road state, treatment, elevation, or tire condition.
- The code groupings for rime/freezing precipitation and snow match the provider's published WMO-code mapping. The 1 cm cutoff is nevertheless a product threshold, not a source-backed safety boundary.
- Temperature and precipitation limits are called “expected unit/range” but the numeric accepted ranges are not specified. This is a minor implementation-spec gap: define numeric bounds before writing normalization fixtures so different implementations do not disagree about whether an extreme finite value is known.
- No empirical calibration is established by this review. The proposed archived-as-issued forecast replay, including successive revisions and separate churn/early-switch/missed-signal measures, remains necessary. Even that replay cannot validate road icing from 2 m air temperature alone.
