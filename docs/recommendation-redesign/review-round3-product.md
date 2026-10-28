# Independent product and policy review — proposal v3

Scope: review of `proposal-v3.md` only. No production behavior was inspected or changed. This review tests internal policy logic and the promised driver-facing semantics; it does not validate the thresholds against real forecast outcomes.

## Findings

### P2 — Booking prompt wording reads like a change deadline

**Proposed behavior:** For a first D1 precaution, say “Arrange winter tires today if you will drive in tomorrow's forecast conditions.” For D2, say “Arrange winter tires before [D2] if driving in these conditions.” The specification elsewhere defines these as suggested booking days, explicitly not safe-travel periods or last acceptable dates.

**Minimal scenario:** Today is Monday; the first trusted precaution is Tuesday. A summer-tire driver reads “Arrange winter tires today” as an instruction to complete the tire change Monday. That conflicts with the stated semantics that Monday is only a suggested booking day and does not establish a safe/unsafe travel interval.

**Smallest fix:** Use “consider booking/planning a change for before [event date]” and label it a planning prompt. Keep the separate instruction to reassess or postpone travel if the change cannot be arranged before forecast conditions. Apply the same distinction to D2–D6 wording. This is a copy-contract issue, not a demonstrated flaw in the underlying date arithmetic.

## Adversarial scenario results

| Minimal input | Required visible result under v3 | Review |
| --- | --- | --- |
| D0 has a trusted freeze forecast; its hour is unknown | Prompt precaution; say the time is unknown, check current conditions, and do not promise that changing tires later today resolves the earlier event | Coherent; the daily aggregate is not turned into an hour or a past-deadline date |
| D1 has the first trusted precaution; all D0–D1 hazard fields are complete | Conditional summer/unknown-set guidance, with D0 as a suggested booking day; no claim that this makes travel safe | Logic is coherent; imperative “Arrange … today” wording needs the fix above |
| D2 has a trusted precaution; D0 hazard data has a gap | Show the D2 report and the earlier gap; suppress the precise interval and advise verification before the next drive | Coherent; the later known event is not mislabeled as earliest possible risk |
| D1 has a conflicting winter-precaution report; D2 has a trusted one | Keep the D1 report unconfirmed; do not provide a dated interval based on D2 | Coherent with the earlier-conflict guard |
| D0–D6 means: five are below 7°C, two are missing; no trusted winter precaution | Do not call it a complete cold trend; report incomplete evidence and avoid a positive keep/safety claim | Coherent; unknown values are not treated as cold |
| A day has `min > mean` | Invalidate both temperature fields and surface the limitation; do not use either for eligibility/trend | Correct internal invariant: valid `min <= mean` is required |
| D0–D9 support a summer candidate; D12 has a trusted winter precaution | Do not suggest a summer switch; show tentative outlook and do not issue a D12 booking deadline | Coherent, conservative veto; it is explicitly a product heuristic, not calibrated safety evidence |
| Data age is 2h, latest same-city refresh failed | `REFRESH_REQUIRED`; retain only an unconfirmed warning, show failure/retrieval time, issue no switch instruction or interval | Coherent; age and refresh outcome are separate and the authorization gate is explicit |
| City changes X→Y; the old X response later succeeds or errors | Do not bind/clear Y's result using the obsolete response | Coherent if request generation is advanced for each result-affecting request, as the lifecycle rule implies |
| A D0 event is near midnight or local date differs from UTC date | Use the validated location timezone and date-only wording; no assumed hour or 24h arithmetic across DST | Coherent in the contract; implementation evidence remains explicitly pending |

## Deliberate conservative or unvalidated choices

- Requiring every field on D0–D9 for summer eligibility, a strict minimum above 4°C, and a D10–D15 winter-precaution veto is conservative product policy. The document labels these as hypotheses and limits claims to the evidence window; this review cannot call them empirically optimal.
- Treating snowfall of at least 1 cm as a winter precaution regardless of positive air temperature is an explicit uncalibrated heuristic. The specification says so and keeps forecast precautions distinct from proof of icy roads.
- A `COOL_TREND` can support winter planning even when minimum/snow/code coverage is incomplete. The document explicitly forbids tire-suitability claims and suppresses precise timing when hazard fields are missing; this is an intentionally limited planning signal.

## Overall assessment

I found no unresolved critical logical contradiction in the action precedence, timing intervals, setup matrix, freshness gate, or horizon boundaries as written. There is one moderate driver-copy contract issue: several “arrange … today/before [date]” imperatives sound like hard change deadlines despite the specified booking-prompt semantics. Fix that wording before implementation. The policy remains unvalidated as a forecast/tire-safety model, as v3 already states.
