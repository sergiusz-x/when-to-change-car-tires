# Product and algorithm adversarial review

Reviewer focus: driver-facing usability, setup semantics, scenario coverage, validation blind spots, rollout integration, and independent attacks on the proposed rules.

## Findings

### P1 — The action vocabulary can contradict the actual tire setup

The proposal asks the card to show one "Action for now" (`keep / change / prepare / wait / insufficient data`) and separately a suggested change period or first risk date. Those values are not always the same action. For a driver on winter tires with a severe event forecast on D4, "keep" is right for today while "change before D4" is the near-term plan. For a driver on summer tires and D4 frost, "prepare" is too weak if the same card says to switch before driving then. A single headline may also say "winter conditions" while the current winter setup is appropriate.

**Concrete scenario:** Known winter setup; no hazards through D3, severe freezing event D4. A literal card can read “Keep” and “Change before D4,” leaving unclear whether to book now. Known summer setup; same forecast can read “Prepare” while the user may drive before the event.

**Smallest fix:** Separate two fields in the contract and card: (1) whether the current setup is suitable for the near-term forecast, and (2) the next action with an explicit before-date. Use setup-specific phrasing such as “Your winter tires fit the forecast for now. Arrange the summer change after the cold spell” or “Arrange winter tires before D4; avoid driving on summer tires in the forecast conditions.” Avoid a generic action enum as the only driver instruction. Severity: **high usability risk**; this is an underspecified product contract, not a proven rule-engine bug.

### P1 — The unknown-tire branch is described but not connected to an interaction

The current page has no tire setup question. It infers `currentTire` as the opposite of a forecast-derived target, then passes that invented value into the recommendation engine. The proposal correctly rejects inference, but “optional choice” leaves unclear how a normal driver reaches known-setup behavior. If the choice is omitted, the card can only give conditional advice indefinitely; if defaulted or remembered silently, it recreates the false certainty.

**Concrete scenario:** A new user selects Warsaw and checks the forecast. They have all-season tires but have not found a place to set that preference. “If you have summer tires, change before…” may be useful, but does not answer what to do with their actual setup; the current opposite-tire inference would be actively misleading.

**Smallest fix:** Make setup a visible, explicit selection with four states: summer, winter, all-season, and not sure/not specified. Persist only after the user chooses, and make changing it easy. Unknown should remain a valid state. Add a rendered-flow case for each state, including all-season, rather than only an engine test. Severity: **high integration/product gap**.

### P1 — “Winter conditions” and “severe event” overstate what daily air-minimum signals establish

The rule labels any minimum air temperature `<= 0°C` a hard winter signal, and steps 3–4 describe the result as “winter conditions” / “severe event.” A daily minimum is not a road-surface observation, and the proposal itself notes that daily aggregates cannot establish event time and that positive-air-temperature frost is possible. The signal can support caution, but it cannot establish ice or that all roads are hazardous. The disclaimer lower on the page will not reliably correct a strong headline.

**Concrete scenario:** A dry, sheltered location forecasts a 0°C air minimum for D1, with means above 7°C and no snow/fog code. “Winter conditions are forecast” sounds like known icy roads; the input establishes only a forecast low air temperature.

**Smallest fix:** Name the observable in the user-facing reason (“A freezing air temperature is forecast for D1”) and reserve “ice / winter road conditions” for evidence that justifies it. Keep the recommended caution conditional and state that the forecast does not report road-surface conditions. Validate exact wording in the primary UI, not only in a disclaimer. Severity: **high trust/safety communication risk**; signal-to-action mapping is an unvalidated assumption.

### P1 — Daily low / snowfall / code combinations need an explicit precedence and evidence explanation

The proposal’s hard-signal set is an OR across minimum, snowfall, and WMO code. This is conservative, but it makes weak and strong evidence produce the same “winter conditions” state and potentially the same urgency. It also leaves the user without a clear explanation when values disagree.

**Concrete scenarios:** (a) 0.1 cm forecast snowfall with a 6°C minimum and warm mean triggers a hard signal; (b) a winter WMO code with missing snowfall and minimum is still reportable; (c) minimum 2°C, no snow/code, is only near-freezing, although surface frost may occur. In all three, the rule needs to say which observed forecast field drove the action and what remains unknown.

**Smallest fix:** Preserve a typed event/evidence record per signal and derive severity/copy from signal type, not a single undifferentiated boolean. State whether trace snowfall is actionable and what provider quantity/rounding is used. Test conflicting and missing-field combinations explicitly. Severity: **medium-to-high**. Whether a trace snow amount merits an urgent winter action is a **product threshold tradeoff** requiring calibration, not something established by the cited sources.

### P1 — Event timing language can be impossible or underspecified at the boundaries

Step 3 says D0–D2 severe signals are urgent; step 4 says D3–D6 should be handled before the event. The timing section says a firm D1–D6 event yields `today..min(today+3,eventDate-1)` and separately says urgent today for D0/D1. This leaves D2 urgency semantics unstated even though it is called urgent above. For D0, “change before today” is impossible; “possible today; check current conditions” is appropriately cautious, but the resulting action for someone already driving on summer tires is not defined.

**Concrete scenarios:** D2 snow: “urgent” but no explicit booking period or distinction from D1. D0 frost: showing “change today” can imply enough time exists even though the daily low may have occurred overnight. D1 frost: the copy can imply changing before the whole calendar day rather than before driving in the relevant conditions.

**Smallest fix:** Define one table for each event date and setup state, including what the app can and cannot say for D0. Use “before driving in the forecast conditions” when the time of day is unknown; do not display an impossible past deadline. Make D2 use the same explicit severity/action rule as D1 or explain why it differs. Severity: **high usability/correctness boundary**.

### P2 — Scanning every available ordinary day conflicts with the declared D0–D13 horizon

The algorithm says to scan every available valid ordinary forecast day, while action semantics are defined only through D13 (D0–D6 firm, D7–D13 tentative, D14 outside the scenario matrix). Open-Meteo is currently requested for 16 forecast calendar days, D0–D15. An isolated hazard on D14 or D15 can therefore be emitted without an urgency or copy rule; alternatively an implementation may silently drop it despite the “every available day” instruction.

**Concrete scenario:** All days through D13 are warm; D14 has freezing fog. A generic “first risk date” can appear as if it creates a near-term deadline, while no branch says whether it is merely an outlook or out of scope.

**Smallest fix:** Define the risk scan horizon explicitly (likely D0–D13 for presentation, with later valid hazards either omitted or labeled beyond the decision horizon), and add D14/D15 boundary fixtures. Severity: **medium algorithm/product ambiguity**.

### P2 — A D0 warm candidate is easy to misread as “change now” despite no hourly evidence

The summer rule permits D0 if a complete warm block and D0–D9 guard pass. The card plan says a D0–D3 date is an earliest candidate and asks users to recheck before booking/changing. If D0 is rendered as a date beside a “summer conditions” headline, users can reasonably read it as an unconditional current recommendation, despite daily aggregates and forecast revision risk.

**Concrete scenario:** Today’s mean is 8°C and minimum 4°C; the next 9 days satisfy the guards. A driver on winter tires sees “summer conditions” and “earliest summer candidate: today.” The copy does not say whether to change now or merely recheck.

**Smallest fix:** For D0, make the result explicitly conditional (“The forecast currently supports considering a summer change; recheck before booking”) and distinguish weather state from a change instruction. Consider making D1 the earliest booking candidate unless a same-day reassessment flow exists. Severity: **medium usability risk**; whether D0 should be excluded is an **unvalidated product choice**.

### P2 — The summer gate may produce prolonged “wait” without telling users how to make progress

Summer eligibility demands seven full days with every mean `>=7°C`, every minimum `>3°C`, known snow/code, no winter signal, plus a 10-day guard with no near-freezing signals. This can make a single near-freezing minimum at D8/D9 block an otherwise stable spring forecast; further, the rule requires coverage and known daily snow/code for each warm day. These are intentional strict gates, but there is no maximum wait, fallback action, or explanation of which exact date will unlock the switch.

**Concrete scenario:** Means are 9–13°C and no snowfall is forecast; one D9 minimum is 3°C, all other guard days are warm. A winter-tire user receives “wait,” perhaps repeatedly, without a date or a clear reason whether the blocker is the low, snow uncertainty, or forecast coverage.

**Smallest fix:** Return the blocking evidence/date/reason code and show it plainly (“D9 is forecast to reach 3°C; recheck after the next forecast update”). Add an explicit “no eligible date in current forecast” state, separate from insufficient data. Evaluate waiting duration and advice churn in archived forecast replay. Severity: **medium**; strictness and threshold are **unvalidated assumptions**, not correctness bugs.

### P2 — “Near-freezing suppresses summer switching across the affected block” has no operational definition

The phrase “affected block” has no index range. A near-freezing day inside candidate’s 7-day block already fails `min > 3`; a near-freezing day in D7–D9 fails the guard. But near-freezing D10–D13 does not invalidate the earliest candidate; it only asks for a prominent outlook warning and bars an unconditional suitability statement beyond the guard. The branch can therefore say “summer conditions” while the same card shows a near-freezing date shortly after the evidence window.

**Concrete scenario:** D0–D9 are all eligible; D12 minimum is 2°C. Summer is eligible at D0, while the proposal also says a D10–D13 hazard must be shown prominently. A single headline can mask the hazard, or the warning can appear to contradict the recommendation.

**Smallest fix:** Define the semantics precisely: eligibility is only through D9; D10–D13 is an outlook caveat, not an affected block. Make the card show both together (“Eligible to consider now based on D0–D9; colder outlook on D12—recheck before changing”) and include a render assertion for this case. Severity: **medium product ambiguity**.

### P2 — The stated tests do not yet prove driver-facing behavior or location/freshness correctness

The proposal correctly calls for rendered-card checks, but the required matrix and properties are mostly engine/data cases. The highest-risk failures here are in copy, setup selection, loading state, selected-location binding, and request races. The current `handleSubmit` reads `selectedCity`, fetches, then writes the result without checking whether the user changed cities during the request; the card renders `selectedCity` separately from stored weather. That can present a recommendation for one city under another city’s name. The proposal mentions discarding late responses but does not make result/location atomicity a concrete acceptance condition.

**Concrete scenario:** Start a slow forecast request for City A, select City B, then City A resolves. The card can show A’s weather recommendation under B. Similarly, on a failed refresh the proposal requires visible failure, but it does not say whether the prior result remains visibly stale, is cleared, or is relabeled; retaining a green/affirmative card without its timestamp is misleading.

**Smallest fix:** Store location identity with each fetched result and render the card only from that result object; ignore responses whose request identity/location no longer matches. Specify refresh failure behavior and assert it in a component/integration scenario. Add rendered cases for all four setup states, D0/D1/D2/D4 risk, D12 outlook, stale data, provider failure, and all supported locales. Severity: **high integration risk**.

### P2 — “Recheck” is advice without a defined refresh interaction

The proposal asks drivers to recheck after a day, before the appointment, and on a refresh; current flow fetches only when the user presses the recommendation button. The new 6-hour/24-hour freshness policy is only useful if the UI communicates the age and offers a reachable refresh path. A cached old forecast after a failed fetch must not look current, and an expired result must not be presented as a fresh “keep” instruction.

**Concrete scenario:** User books a tire change from an eligible summer candidate, revisits the page the next morning without pressing the button, and sees the old result as though it was re-evaluated.

**Smallest fix:** Decide whether page revisit automatically refreshes or whether the card prominently offers a “refresh forecast” action; always show fetched-at time and freshness state. Test stale and failed-refresh rendering, including whether previous actionable text is suppressed. Severity: **medium integration gap**.

### P3 — All-season “informational suitability note” needs a bounded, useful definition

The proposal correctly says not to infer capability from the “all-season” label, but it does not define what information can be given without drifting into unsupported suitability or legal advice. A bare warning with no action can feel like an error; a specific badge/standard recommendation could introduce claims outside scope.

**Concrete scenario:** An all-season user sees forecast snow and the card says no automatic switch plus “check suitability.” They do not know what to check or whether the app has assessed their tires.

**Smallest fix:** Use a neutral, bounded message (“This forecast includes snow/freezing temperatures. This tool cannot assess your specific all-season tire model; check its winter performance guidance and local requirements”) or keep the note more general if local requirements are out of scope. Do not label the user’s tires safe/unsafe based only on setup name. Severity: **medium product-content gap**.

## Logic attacks and empirical assumptions

- **No chronological stabilization/hysteresis:** A forecast can alternate between `SUMMER` eligibility and `MIXED` each refresh as a single D8/D9 minimum crosses 3°C. The proposal explicitly allows legitimate advice changes, but strict summer admission alone does not guarantee low churn; near-threshold model noise can create repeated book/wait messages. Replay revisions and measure advice churn; if it is high, consider a small, documented stability rule that never suppresses a newly observed near-term hazard.
- **Cold trend ignores minimum/snow/code:** Five of seven means below 7°C triggers a winter recommendation even if all minima are warm and there is no winter code/snow. Example: means `6,6,6,6,6,14,14`, minima all 8–10°C. This follows the seasonal 7°C heuristic but presents “winter conditions” when the evidence is persistent cool daytime air, not winter weather. The proposal says frost is not required, but should distinguish “persistent cool trend; consider planning” from an actual winter event. Whether that advice is useful is empirical/product policy.
- **A severe signal suppresses the rest of the state without a stated de-escalation rule:** A single severe event can outrank a cold trend or warm majority. That is appropriate for surfacing a hazard, but the card still needs a coherent setup-specific action and should not imply that changing tires resolves every risk. Do not make later warm evidence erase the isolated event; present its date/type and horizon.
- **Daily low as event date is imprecise:** `firstRiskDate` is a local calendar date, not an hour or necessarily a time after the user can act. `changeBeforeDate` is a date exclusive boundary, but users may interpret “before D1” as by midnight or before the forecast minimum. The copy should use “before driving in those conditions” and avoid an hour-specific assertion.
- **Threshold choices are not calibrated by the cited guidance:** 5/7 cold days, 7-day warm run, `>3°C` guard, 10-day guard, D0–D3 candidate window, 6h/24h freshness and trace snowfall are explicit heuristics. They are reasonable hypotheses, but the plan’s future archived-forecast study must compare missed hazards, premature changes, waiting duration, and advice churn across climates and transition seasons. Do not promote these as validated safety thresholds.

## Rollout acceptance additions

Before production rollout, add these observable cases to the prototype/UI review:

1. Each setup state with: no risk, D0 signal, D1 signal, D2 signal, D4 signal, cold-only trend, near-freezing only, eligible warmth plus D12 outlook, and no usable forecast.
2. A trace-snow fixture and each WMO signal category; show the evidence that caused the displayed message.
3. D13/D14/D15 boundary, a missing D0, missing middle date, and D9/D10 blocker boundary.
4. City A request resolves after selection of City B; verify city label and weather remain bound.
5. Fresh, stale, expired, refresh-failure, and location-change result states, including the actual visible timestamp and refresh control.
6. Rendered copy review in every supported locale. Check that “forecast freezing air temperature,” “possible road ice,” “winter tires recommended,” “change before date,” and “unknown setup” are not translated into stronger or contradictory claims.

## Overall assessment

The proposal’s direction is sound: separate weather evidence from user setup, preserve unknowns, and remove invented safety deadlines. The main blockers to an implementable driver-facing contract are the interaction for selecting actual setup, the distinction between current suitability and next action, and precise timing/severity copy around daily forecasts. Thresholds and the 7°C/guard policy remain hypotheses until replayed against archived forecasts and reviewed for churn and waiting behavior. This is an adversarial review, not empirical validation of weather accuracy.
