# Tire-change recommendation redesign — revised specification

Status: proposed policy, not a production implementation or a validated road-safety model.
Date: 2026-10-23. Supersedes `proposal-v1.md` after three independent GPT Luna reviews.

## 1. The decision this product makes

Answer two separate questions: **what the forecast indicates** and **what to do given the tires the driver actually has**. Never manufacture the driver's current tires. Never equate air temperature with measured road conditions.

The product is a local seasonal planning aid. It does not assess tire condition, route/elevation, road treatment, or legal compliance. Its headline must state the actual evidence and conditional action; a disclaimer cannot repair an overstated headline.

Keep the implementation small: normalize provider data, assess weather in one pure function, derive a setup-specific action, then translate a typed result. No score framework, database, machine learning, inferred hemisphere seasons, or new weather service.

## 2. Sources and which rules they support

- [Michelin](https://www.michelin.co.uk/auto/advice/choose-tyres/summer-winter-all-season-tyres): sustained temperatures around 7°C are a seasonal guideline. This does not specify a seven-day algorithm or a probability of safety.
- [Continental](https://www.continental-tyres.co.uk/tyre-knowledge/summer-or-winter-tyres/): seasonal summer/winter guidance around 7°C.
- [Met Office](https://weather.metoffice.gov.uk/learn-about/weather/types-of-weather/frost-and-ice): surface frost can occur above 0°C air temperature; 0–4°C warrants attention depending on conditions. A 4°C margin below is a conservative heuristic, not a frost-free boundary.
- [Open-Meteo](https://open-meteo.com/en/docs): ordinary forecasts up to 16 calendar days including today; local dates/timezones; minimum air temperature at 2 m; daily snowfall in cm; supported WMO codes. Daily aggregates cannot establish whether today's minimum is still ahead.

Every count, horizon, snowfall cutoff and freshness limit below is an explicit product hypothesis. They require outcome/revision replay before claiming improved forecast accuracy. The review establishes clearer logic, not an ideal algorithm.

## 3. Data contract and normalization

Inject `now` as a UTC instant. Accept result-bound city ID/coordinates, a validated IANA timezone, `fetchedAt`, and date-keyed ordinary forecast records. History is strictly before local today and optional explanatory context; today belongs to forecast, not observed history. Seasonal data is chart-only, with distinct provenance; it cannot influence any decision, date, warning or data-quality assessment.

Request `temperature_2m_mean`, `temperature_2m_min`, `snowfall_sum`, and `weather_code` from the existing forecast endpoint, explicitly in Celsius and cm. Preserve provider units and provenance. `fetchedAt` means retrieval time, not model initialization or weather accuracy. Do not pretend `past_days` means station observations.

Each field is known only if present, finite, of the expected unit/range, and on a valid Gregorian date. Snowfall must be nonnegative; weather code must be in Open-Meteo's supported set. Missing/unknown code is not clear sky. Do not impute a missing minimum, snowfall or code. Inconsistent temperature pairs (`min > mean`) invalidate both temperature fields and create a limitation. Known valid hazard fields remain usable when unrelated fields are missing.

Sort by date. Identical duplicates collapse. Conflicting duplicate fields become unknown; preserve any conflicting hazard report as an **unconfirmed warning**, not a definite event or reassuring absence. Do not discard the entire response for one invalid day. Preserve calendar gaps and invalid-field reasons.

Invalid timezone/city identity or invalid retrieval timestamp prevents dated actions. Reject a timestamp more than five minutes ahead of `now`; tolerate <=5 min clock skew by treating age as zero and flagging it. No silent UTC fallback for a location-specific date. Use local calendar date keys and calendar addition; never add 24h to a local instant across DST.

## 4. Horizons, completeness and freshness

D0 = local today; scan only date keys D0..D15 from ordinary forecast. D16+ and history are outside the assessment. This fixes the ambiguity about the provider's last two days.

- D0..D2: signals requiring prompt attention, with distinct D0 timing semantics.
- D3..D6: near-term planning signals.
- D7..D15: tentative outlook; no firm booking deadline. The UI uses "possible"/"if the forecast persists", not the same certainty as near-term warnings.
- Cold-trend block: all seven mean temperatures on D0..D6 must be known.
- Summer-temperature block: all seven means on D0..D6 must be known and **strictly >7°C**.
- Summer guard: all four required fields on every date D0..D9 must be known. Every minimum must be >4°C; no winter/trace-snow signal may occur in this block. D7..D9 require valid means, but these means are not themselves part of the seven-day summer-temperature test.
- A known winter-precaution signal on D10..D15 blocks a new summer-switch suggestion as a conservative outlook veto. Lesser late signals are shown as caveats. No claim of suitability is made outside the explicit D0..D9 evidence window.
- No future summer-date scan: this eliminates overlapping candidate windows and artificial precision. If summer is not eligible now, explain the exact blocker and recheck; do not promise a date from unstable longer-range data.

Completeness is field-specific. A known freeze on D1 can produce a warning despite missing means. Missing any required summer field blocks summer eligibility. Five cold means plus two missing means is **not** a complete cold trend. Unknown is neither warm nor cold.

Freshness measured against injected `now`: age <=6h is CURRENT; >6h and <=24h is STALE; >24h is EXPIRED. Stale/expired data never authorizes a new switch or dated booking interval. Show retained hazards as unconfirmed last-known warnings, the retrieval time, and a refresh action. Failed refresh is visible; it does not reset retrieval age or upgrade certainty. Invalid timestamps are unusable, not fresh. The six-hour rule is a refresh policy, not a claim that forecasts are reliable for six hours.

## 5. Exact signal and priority rules

Preserve every signal with date, source field, raw value and status. The following are **forecast precautions**, not proof of icy roads.

| Signal | Exact predicate | Policy consequence |
| --- | --- | --- |
| Freezing air | known min <=0°C | Winter precaution |
| Freezing precipitation/rime | code in {48,56,57,66,67} | Winter precaution |
| Moderate/heavy snow forecast | snowfall >=1 cm OR code in {73,75,86} | Winter precaution |
| Light/trace snow forecast | snowfall >0 cm OR code in {71,77,85}, without a higher-priority signal | Verify-snow warning; blocks summer in guard, no automatic urgent seasonal change |
| Near-freezing air | known min >0 and <=4°C | Caution; blocks summer in guard, does not prove frost or force a switch |

The 1 cm boundary is deliberately explicit but uncalibrated. It prevents 0.01 cm at positive temperature alone from implying an urgent change. A simultaneous freezing minimum still independently creates a precaution. Inconsistent snowfall/code values are explained, not averaged away; any valid higher-priority signal remains visible. Hail/thunderstorm codes can merit generic driving caution, but must not by themselves imply a seasonal tire switch.

Lead time determines attention priority, not physical event severity. A 0°C forecast and freezing rain must name their different evidence, even if both merit preparation. Words like "severe", "certain ice", "safe until", and "winter tires make this safe" are not generated.

## 6. Assessment order and setup-specific actions

First collect data limitations and signals **without early returns**. Then choose the main assessment in this order:

1. No current usable clock/location/data: `UNAVAILABLE`; retain any last-known/unconfirmed warning separately. No tire default or dated action.
2. STALE/EXPIRED: `REFRESH_REQUIRED`; retained signals remain visible but unconfirmed; no new switching instruction.
3. Any trusted winter precaution on D0..D6: `WINTER_PRECAUTION`, naming the earliest **known** signal and all earlier lesser signals/unknowns. This wins over warmth, means and history.
4. Complete D0..D6 block with >=5 means strictly <7°C: `COOL_TREND`, not "snow/ice confirmed". Recommend winter planning for a summer setup even without frost. Exactly 7°C is a transition value, neither cold nor summer-qualified.
5. A trusted winter precaution only on D7..D15: `WATCH_OUTLOOK`; do not newly suggest summer switching. It is not a near-term change deadline.
6. Any light-snow/near-freezing signal on D0..D9: `MIXED`, explain the blocking dates/values. No automatic immediate seasonal swap from this branch alone.
7. Complete summer-temperature block and guard, with no late winter-precaution veto: `SUMMER_CANDIDATE`.
8. Otherwise `MIXED` if the required D0..D9 fields are complete, or `INSUFFICIENT` if incomplete. All known signals/outlook caveats are still shown.

An incomplete temperature block does not hide a known freezing forecast. A `COOL_TREND` may coexist with missing snow/minimum information; display that limitation and do not issue a claim of current-tire suitability. No positive "keep, safe" action is inferred from insufficient data.

Visible setup choice above the result: **summer / winter / all-season / not specified**, default not specified. No guessed default, no mandatory choice to see the weather. Persist only an explicit choice if persistence is needed; show and allow editing of that choice. Weather assessment must not depend on setup.

| Assessment | Summer setup | Winter setup | Unknown setup | All-season setup |
| --- | --- | --- | --- | --- |
| Near-term winter precaution | Arrange winter set before travel in forecast conditions; timing below | No seasonal change prompted; show precaution | Conditional summer-tire advice, with same warning | No automatic swap; show warning and say specific tire capability is not assessed |
| Cool trend | Plan winter change in next few days | No seasonal change prompted by cooling | Conditional winter-planning advice | No automatic swap; weather trend only |
| Watch outlook | Monitor/update before booking; forecast may require winter preparation | Defer a new summer suggestion; monitor | Conditional guidance; no inferred current set | Weather outlook only |
| Mixed | Monitor; no automatic seasonal change; show blocker | Wait with summer change; show blocker | No definite seasonal direction | Weather caution only |
| Summer candidate | No seasonal change prompted by warming | Consider summer change in the next few days; recheck before appointment | Conditional summer suggestion if currently on winter | No automatic swap |
| Unavailable/insufficient/refresh | No new recommendation; verify/refresh, retain warnings | Same | Same | Same |

The matrix describes seasonal actions only. "No seasonal change prompted" is not a statement that driving is safe or that the actual tire condition is adequate.

## 7. Date semantics and the card

Remove three mandatory milestones and MAX_TIME. Do not output a generic target tire if the action is waiting, mixed, or unavailable. Separate `forecastAssessment`, `knownSignals`, `dataLimitations`, `actualSetup`, and setup-specific `nextAction`. A timing field can only exist on an action that actually involves changing that driver's set. Winter users must never get a "change to winter before D4" booking field.

For winter precautions, `firstKnownSignalDate` is evidence, not a safety deadline. Dated planning requires CURRENT data and complete hazard fields (minimum, snowfall, code) for D0 through that first precaution. Earlier gaps suppress a precise interval: show the known event, missing dates, and advise verification before the next drive. Never call a later known event the earliest possible risk.

| First near-term precaution | Summer/unknown action timing |
| --- | --- |
| D0 | "The daily forecast includes [signal] today; its time is unknown. Check current conditions before driving and arrange suitable tires if winter conditions are expected." No `changeBeforeDate`, no past deadline, no suggestion that a change later today resolves an earlier event. |
| D1 | "Arrange winter tires today if you will drive in tomorrow's forecast conditions." Suggested booking day D0 only, explicitly not a safe-travel period. |
| D2 | "Arrange winter tires before [D2] if driving in these conditions." Suggested booking D0..D1; prompt attention. |
| D3..D6 | Same conditional preparation before the signal date; suggested booking D0..min(D3, event-1). |
| D7..D15 | Tentative outlook only; no dated booking instruction or winter interval. |

Known winter setup gets the same event date/precaution but no changing deadline. Unknown setup gets the conditional version, never an assertion that a change is required for their unidentified tires. All-season gets no inferred tire capability or automatic seasonal change.

For `COOL_TREND`, summer/unknown winter-planning wording may suggest D0..D3 only with complete hazard fields D0..D3; otherwise say "plan in the next few days; some risk data is missing" with no precise interval. This is a booking suggestion, never the last acceptable date.

For `SUMMER_CANDIDATE`, do not invent a deadline or a future eligibility date. Say the current forecast supports considering a summer change; recheck before booking/appointment. The seven-day trend and ten-day guard must be visible in the explanation, not as a claim that later weather is known to be safe.

Card order: (1) setup-specific action and any prompt precaution, (2) evidence and date, (3) optional booking suggestion, (4) blocking/missing/outlook reasons, (5) city, assessed horizon, retrieval time and refresh control. Partial data/warnings cannot be hidden behind collapsed details. Translate stable reason codes; do not embed translations in the weather engine.

## 8. Page lifecycle and integration

Bind `{location, weather, fetchedAt, assessment}` atomically to each result. On city change, hide the old actionable result immediately; ignore all responses whose request generation or city identity no longer matches. An error for an obsolete request must not clear the current result. Abort requests where supported, but identity checks remain necessary.

Re-evaluate displayed freshness when the page resumes/focuses, local day changes, or the age crosses a freshness boundary. Offer an explicit "Refresh forecast" control. If refreshing fails, retain the same-city data only with the visible failure/age state; do not silently label a failed refresh CURRENT. A failed refresh blocks affirmative new-summer advice until a successful refresh, even if the retained data is <6h old. No persisted forecast result is required in v1; if added later, load it as retained data and apply these same checks.

Migrate provider types/normalization, the engine, app state, both locales, result/weather cards, the mechanism explanation and debug fixtures together. Debug fixtures must include today and all new fields and must never claim simulated data is real. No external API interface or stored-data migration is needed for the current app. Avoid maintaining both competing recommendation engines.

## 9. Validation and empirical limits

Required observable fixtures include every row of the setup matrix; D0/D1/D2/D3/D6/D7/D9/D10/D15/D16 signals; exact 0/4/7°C and 1 cm boundaries; trace snow at positive temperature; snow/code contradictions; no snow but freezing air; sustained cold without frost; warming after an early freeze; near-freezing warm means; incomplete cold/guard/earlier-hazard blocks; duplicate/invalid/gapped dates; missing/invalid timestamps/timezone; seasonal-only/history-only/empty; freshness boundaries; failed/late refresh; city races; DST and opposite UTC-date zones; and rendered PL/EN copy.

Properties with explicit scope:
- Within D0..D9, adding/advancing a winter signal cannot enable summer eligibility; removing required evidence cannot newly enable it.
- A known ordinary winter precaution anywhere D0..D15 blocks a new summer suggestion. Signal removal in the optional outlook is a forecast/evidence change, not proof of increased safety; show actual coverage and do not claim knowledge beyond D9. Do not claim a universal monotonicity property under arbitrary deletion of optional outlook data.
- Missing unrelated fields cannot erase a known reportable hazard; conflicting signals retain an unconfirmed warning.
- Seasonal data has no effect. No date lies outside its required supporting coverage. No booking interval reaches a known near-term precaution. Never postpone a forecast event to fix interval ordering.
- Deterministic under fixed now/location/data; setup affects actions, never weather evidence. Known winter/all-season setups never receive an automatic change-to-winter instruction.
- A date-only daily minimum never becomes an asserted hour or a measured road-ice observation.

Before release: implement the pure engine and verify fixtures/properties; exercise the actual page flow with mocked provider responses and rendered screenshots; test request races/failure/freshness/timezone behavior; run required project checks. Passing a standalone policy probe is evidence only about the proposed model, not about the unmodified app or forecast skill.

Then compare the old and new policy using archived forecasts **as issued** across multiple places, both hemispheres, transition seasons, and successive forecast revisions. Do not feed actual later observations into the policy as if available earlier. Compare missed freezing/snow signals, early summer switches, unnecessary winter changes, prolonged summer waits, and advice churn separately. An observation of 2 m air temperature cannot validate road icing. Use an independent tire/weather-domain review before stronger safety claims. No numerical success rate or calibrated confidence is claimed without those data.
