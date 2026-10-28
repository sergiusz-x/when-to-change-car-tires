# Adversarial review: weather logic

Scope: weather-domain assumptions, safety-relevant false reassurance, seasonal asymmetry, thresholds, and counterexamples in proposal v1. This review does not assess implementation details beyond comparing the proposal with the current weather input path. No production changes were made.

## Findings

### 1. `snowfall > 0` is both a hard winter signal and appears to inherit urgent severity

**Classification: logical severity defect / conservative product tradeoff.** The rules call any positive snowfall a hard winter signal, then say a severe event on D0–D2 means urgent winter conditions. It is not defined whether every hard signal is a “severe event.” If it is, trace snowfall is enough to recommend an urgent tire change. If it is not, the critical severity boundary is missing and different implementations can produce materially different actions.

Minimal sequence (known summer tires; today D0):

| Day | Mean | Min | Snowfall | Code |
|---|---:|---:|---:|---:|
| D0 | 8°C | 5°C | 0 | 0 |
| D1 | 8°C | 5°C | 0.01 cm | 71 |
| D2–D9 | 8°C | 5°C | 0 | 0 |

**Proposed result:** The snow signal blocks a warm switch. If it counts as a severe event, D1 produces “change before tomorrow”/urgent winter conditions. **Expected:** report the forecast snow and advise checking local conditions; do not infer an urgent tire-change need from 0.01 cm alone. A brief flurry that melts on a 5°C day does not establish a hazardous road surface. Repeated tiny forecast amounts can also make the advice oscillate or keep the user on winter tires.

Smallest fix: separate *reportable winter signal* from *urgent/severe event*. Keep any snow/code signal as a summer-eligibility blocker if desired, but make urgency require a defined severity predicate (for example, an appropriate frozen-precipitation code or snow plus a cold minimum), and use conditional caution for lesser signals. The precise predicate needs calibration; the current ambiguity is a correctness issue.

### 2. The summer frost buffer is weaker than the cited caution range

**Classification: unvalidated heuristic with a safety-relevant optimistic edge.** Near-freezing is defined as minimum `>0 and <=3°C`, and warm eligibility permits every minimum `>3°C`. Yet the cited Met Office material says frost can occur with positive air temperature and that 0–4°C can warrant caution depending on conditions. A forecast minimum of 3.1–4°C with clear skies / damp ground can therefore pass the proposed numeric gate even though the proposal's own evidence says frost remains possible. Daily minima and ordinary weather codes do not directly establish road-surface temperature.

Minimal sequence (candidate D0; all forecast fields present): seven means `8°C`, all minima `3.5°C`, no snow and code 0 on D0–D9.

**Proposed result:** D0 meets the stated warm gate and can be called summer conditions. **Expected:** at least label this as a heuristic edge / retain a caution, rather than implying that the cited frost concern is excluded. The sequence does not prove frost will occur; it demonstrates that the `>3°C` cutoff is not supported as a frost-free boundary.

Smallest fix: either extend the explicit near-freezing/summer block threshold to the cited 4°C caution range, or state and validate why `>3°C` is an acceptable product threshold for local surface-frost risk. If widened, describe it as caution rather than proof of ice, to avoid making summer advice useless in climates with frequent cool nights.

### 3. Minimum temperature at exactly 0°C is treated like a severe event without a severity distinction

**Classification: ambiguous rule precedence / uncalibrated severity.** `minimum <= 0°C` is a hard winter signal; the severe-event branch then makes D0–D2 urgent. A daily air minimum of exactly 0°C does not establish that the road is icy, and the proposal correctly says daily values cannot provide timing. But the urgent rule may still turn a borderline forecast into the same action as freezing rain or accumulating snow.

Minimal sequence (known summer setup): D1 min `0°C`, mean `6°C`, no snow, code 0; D0 and D2–D9 mean `8°C`, min `5°C`, no precipitation.

**Proposed result:** If all hard winter signals are “severe,” urgent winter conditions before D1. **Expected:** identify a frost/zero-degree warning and advise caution/checking conditions; whether a seasonal tire change is urgent is a separate, uncalibrated policy choice. The ambiguity matters because the result contract has risk severities but the proposal does not map signal types to severity.

Smallest fix: explicitly map each signal type and lead time to `watch`, `prepare`, or `urgent`; reserve urgent language for a defined higher-severity subset. Do not call air minimum alone proof of road ice.

### 4. Cold-trend switching is intentionally asymmetric but may overreact around the 7°C boundary

**Classification: unvalidated product heuristic, not a logical defect.** Winter advice needs no frost: at least five of seven means below 7°C leads to a winter recommendation in the next few days. This fixes the current frost prerequisite and is defensible as a planning cue, but the 5/7 count is a sharp threshold. Four cold days yield no trend; one forecast revision from 4/7 to 5/7 changes the state, and repeated revisions can churn advice. The converse summer rule is much stricter: seven consecutive means ≥7°C, minima >3°C, complete hazard fields, and a further guard. That asymmetry is conservative and plausibly useful, but it should be presented as a product policy rather than an implication of the Michelin/Continental 7°C guideline.

Minimal sequence: seven daily means `[6.9, 6.9, 6.9, 6.9, 7.0, 7.0, 7.0]`, minima all 4°C, no winter signals. **Proposed result:** mixed/no cold trend. Change only one 7.0 to 6.9 and it becomes a cold trend and recommends winter tires within a few days. **Expected:** the threshold can be used, but the user-facing label should not imply a sudden physical safety boundary; evaluate advice churn on revised forecast sequences.

Smallest fix: retain explicit thresholds but avoid describing the resulting state as a categorical safety fact; count churn in the proposed archived-forecast evaluation. Any hysteresis would be a product choice and should not delay an actual forecast hazard.

### 5. Daily aggregates cannot establish whether a D0 warning is still ahead

**Classification: adequately identified limitation; residual UX risk.** A D0 minimum or snow forecast may refer to overnight conditions that have already passed. The proposal correctly says “possible today; check current conditions,” but it must keep that wording attached to all D0 risk types and avoid displaying `changeBeforeDate = today` as if it were still achievable before the event. A current-condition observation is not part of the inputs.

Minimal sequence: evaluation at local 14:00; D0 min 0°C occurred at 05:00; D1–D9 warm. A daily forecast alone cannot distinguish this from a 23:00 minimum still ahead. **Expected:** same uncertain D0 warning in both cases, with no claim of an hour or a safe remainder of day. Proposed copy addresses this; the result contract should encode “possible today” rather than an ordinary future `changeBeforeDate` for D0.

Smallest fix: preserve a separate D0 urgency/warning state and omit a past-or-future exact deadline for D0.

## Boundary and missing-data checks

- The D0–D3 candidate plus `d+9` guard is internally consistent with a D13 forecast horizon: D3 needs through D12 and D13 remains outlook. D6/D7 winter lead-time boundary is also clear. Keep these as date-based checks, not array offsets, as the proposal requires.
- The rule that all summer-block hazard fields are known is appropriately conservative. In particular, a missing minimum/snow/code must never be silently treated as a warm day. Existing `openMeteoClient.ts` currently substitutes the mean when minimum is missing and requests only mean/minimum; the proposal explicitly removes that optimism and adds snowfall/code, so provider normalization must preserve missingness rather than reintroduce it.
- A D10–D13 risk does not block a D0 summer candidate, but is supposed to be shown as an outlook warning. This is a deliberate horizon tradeoff, not a defect, provided the D0 recommendation still says to recheck before the appointment and does not promise suitability beyond D9.
- The current `inferRecommendedTire` uses a 14-day majority and falls back to history; the proposed separation of weather assessment from actual user setup correctly removes the dangerous implication that the inferred majority is the user's current tire. Keep all-season as a distinct case as specified.

## Recommended minimum revisions before prototyping

1. Define signal-to-severity mapping; specifically, positive snowfall and `min <= 0°C` must not silently mean “urgent.”
2. Resolve the 3°C vs cited 0–4°C frost-caution mismatch, or explicitly retain it as a heuristic requiring validation.
3. Encode D0 as an uncertain same-day warning without an impossible/past `changeBeforeDate`.
4. In archived-forecast evaluation, report false urgency, missed winter hazards, premature summer changes, and advice churn separately. A broad “conservative” outcome count would hide both useless over-warning and unsafe optimism.

These are not claims that tire suitability can be inferred precisely from daily air forecasts. They identify where the proposal's action language risks sounding more certain than its weather inputs support.
