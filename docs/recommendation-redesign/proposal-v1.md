# Tire recommendation redesign — adversarial review draft

Status: proposal only; production behavior is unchanged. Date: 2026-10-23.

## Problem and scope

The current integration chooses a target using a 14-day majority, pretends that the user has the opposite tires, and runs a separate transition engine. It mixes a recommendation for now with a future transition. The engine also misses early frost by scanning only after a seasonal milestone; requires frost before recommending winter tires in sustained cold; uses speculative seasonal data for deadlines; and treats missing values as reassuring.

Replace this with one deterministic assessment of weather evidence, followed by a presentation layer using the user's actual tire setup when known. This proposal covers a local weather planning aid for summer/winter sets. It does not certify road safety, assess a route, predict road ice, or establish legal compliance. All-season tires require a separate informational branch; they must not be silently mapped to summer or winter.

## Evidence and limits

- Michelin describes sustained temperatures around 7°C as a seasonal switching guideline, not an exact daily planning algorithm: https://www.michelin.co.uk/auto/advice/winter-tyres-guide/summer-winter-tyres
- Continental describes the same seasonal guideline: https://www.continental-tires.com/in/en/b2c/tire-knowledge/summer-or-winter-tires/
- Met Office explains that surface frost can occur with positive air temperatures; 0–4°C can warrant caution depending on other conditions: https://weather.metoffice.gov.uk/learn-about/weather/types-of-weather/frost-and-ice
- Open-Meteo provides up to 16 forecast calendar days including today, local dates with timezone, minimum air temperature at 2 m, snowfall and weather codes: https://open-meteo.com/en/docs

Thresholds, counts, margins and horizons below are product heuristics to validate, not scientifically calibrated probabilities. Do not display a confidence percentage or imply that HIGH metadata is a probability of correctness.

## Inputs and normalization

Use an explicit injected UTC `now`, IANA timezone, coordinates/location identity, fetch timestamp and source provenance. Never derive today from the last history item. Compute local calendar dates with timezone-aware date arithmetic (DST and UTC date offsets matter).

Separate history (dates strictly before today), today's daily forecast (not an observation), and future daily forecasts. Daily fields: mean air temperature C, minimum air temperature C, snowfall cm, WMO weather code, forecast source and valid date. Request snowfall and weather code from the existing forecast provider; no new service dependency. Never replace a missing minimum with the mean. Missing snowfall/code are unknown, not zero. Validate finite values, units, minimum <= mean, dates, nonnegative snowfall and timezone. Sort by date. Reject conflicting duplicate days; ignore identical duplicates. Keep gaps; do not close gaps by array slicing.

Only ordinary forecast data can support decisions. Seasonal data is optional chart-only context and cannot change an action, timing or evidence label. The existing HIGH/LOW flag must become provenance, not a promise of accuracy.

Freshness policy draft: <=6h current; >6h..24h stale (show timestamp, suppress new summer switch); >24h no actionable dates. A failed refresh must be visible. A stale winter warning may be displayed as an unconfirmed warning, never silently dismissed. No fallback to history-only switching. Keep location identity bound to results and discard late responses after city changes.

## Weather evidence and horizons

D0 is today, D1 tomorrow. No claim about hours can be derived from a daily minimum.

- Decision horizon: D0..D6, seven complete local calendar days.
- Guard horizon for summer: D0..D9, ten complete days.
- Outlook: D7..D13; explicitly tentative and never a precise booking deadline.
- Hard winter signal: minimum <=0°C, snowfall >0 cm, or a winter WMO code (56,57,66,67,71,73,75,77,85,86). Also treat freezing fog (48) as a winter signal.
- Near-freezing signal: minimum >0 and <=3°C. This is a conservative caution margin, not proof of ice.
- Cold trend: at least 5 of the 7 means <7°C. Frost is not required.
- Warm eligibility at candidate date d: complete seven-day block d..d+6, every mean >=7°C, all minima >3°C, all snowfall/code values known, and no winter signal. Also require complete guard data through d+9 and no winter or near-freezing signal in that guard block.
- Candidate summer dates are only D0..D3. Thus a D3 candidate needs data through D12, all ordinary forecast. Never infer that missing remaining days are frost-free.
- Outlook hazards at D10..D13 do not create a firm deadline but are shown prominently and prevent an unconditional statement that the summer setup is suitable beyond the guard horizon.

History is optional explanatory context. Do not make a clear near-term warning contingent on history existing. Historical warmth cannot outweigh future frost. No hemisphere/month inference is used.

## Evaluation order

1. Normalize and record data limitations. Invalid/partial data cannot turn into affirmative warm evidence.
2. Scan every available valid ordinary forecast day for winter/near-freezing signals, independently of all trend logic. A trustworthy isolated hazard is reportable even if the rest is missing.
3. Severe event on D0..D2: winter conditions, urgent for a driver on summer tires, regardless of a warmer majority or trend. D0 daily aggregates cannot establish whether the event has already happened: explain "possible today; check current conditions" rather than fabricate an exact hour.
4. Severe event on D3..D6: prepare/switch before the first event. An event on D7..D13 remains a tentative outlook; no exact deadline.
5. No severe event in D0..D6, but cold trend: winter conditions; recommend summer-to-winter change in the next few days, not an invented latest safe date.
6. Near-freezing without a cold trend: mixed conditions/watch. Do not declare certain ice or immediately force a seasonal change, but suppress summer switching across the affected block.
7. If warm eligibility holds at D0, summer conditions; if only at D1..D3, wait until that candidate and recheck forecast before booking/change. Never render a future summer recommendation as the best tires now.
8. Otherwise mixed conditions or insufficient data. Keep the current setup conditionally if known; do not guess a setup if unknown. State exactly what is missing or which competing signals exist.

Urgent hazard display can coexist with a data-quality limitation. Never let the low-data branch swallow an observed forecast warning. Conversely, a warning is not a guarantee that winter tires alone make driving safe.

## Tire setup and user experience

Optional choice: summer / winter / all-season / not specified. Never infer this from date, geography or target recommendation. Without a choice, use conditional copy, e.g. "Winter conditions are forecast. If you use summer tires, change before ...". The base weather assessment is identical for all choices; only the recommended action changes.

Known summer setup: urgent/plan winter change for winter evidence; keep for warm evidence; watch for mixed conditions. Known winter setup: keep for winter evidence; summer switch only when eligible; wait for mixed conditions. All-season: no automatic seasonal switch; show weather warning and informational tire-suitability note without claiming certification from the label alone.

Card structure:
1. Action for now: keep / change / prepare / wait / insufficient data, with conditional wording when setup unknown.
2. Weather reason and first risk date, plus scope "for [city]" and assessed horizon.
3. Optional suggested change period or earliest summer candidate; no forced three-milestone layout.
4. Data timestamp, coverage and limitations; no uncalibrated confidence ranking.

Examples (intent, exact Polish copy can be refined during implementation):
- Frost tomorrow, warm rest: "If you have summer tires, change before tomorrow's forecast winter conditions." No summer headline.
- Constant mean 5°C, min 2°C: "Persistent cold: plan winter tires in the next few days." No frost prerequisite.
- Warming starts in four days: "Wait with summer tires; the forecast is not stable enough yet." Do not say summer now.
- No data: "Cannot assess the timing: current forecast is unavailable." No tire recommendation.
- Upcoming warm weather with one forecast freezing night: explain the blocking date, not just a temperature average.

## Timing semantics

Remove MAX_TIME / "latest safe date". Use `firstRiskDate` and `changeBeforeDate` (exclusive event date), not a claim that every earlier moment is safe. A first risk tomorrow means complete the change today/before driving in the risk conditions. If risk is today, urgency replaces a fictitious past date.

Winter planning windows: today through min(today+3, eventDate-1) when there is a firm event D1..D6; urgent today for D0/D1. With cold trend and no firm event, today..today+3 is a suggested booking period only. If data is insufficient for an interval, display the known risk and no fabricated interval. Never move an event later to satisfy ordering.

Summer planning: an earliest eligible candidate D0..D3, conditional on rechecking. No max-time or safety deadline. Show a single candidate rather than an arbitrary seven-day window; all displayed dates must have full required lookahead.

Recheck after a day, before the appointment, and on a refresh. Stability comes from strict summer admission and the user's known setup, not persisting an invented current tire. Forecast revisions can legitimately change advice. Do not keep an old reassuring result to avoid visible changes.

## Proposed result contract

Language-neutral pure engine output, translated by UI:
- evaluation clock, city identity, coverage, refresh/freshness state, explicit limitations;
- weather state: WINTER / SUMMER / MIXED / INSUFFICIENT;
- risk events with local date, severity/type, provenance, forecast horizon;
- optional earliestSummerDate / suggestedWinterPeriod / changeBeforeDate;
- stable reason codes and evidence values, not formatted strings;
- optional user action derived from actual setup (the engine never manufactures it).

Use small discriminated unions so insufficient data cannot accidentally carry a default SUMMER/WINTER target or unconditional switch action. Urgent warnings are independently representable. Do not build a configurable rules framework; use named constants and ordinary pure functions.

## Validation and rollout

Keep existing implementation until a replacement is reviewed and tested. API/types are internal but components, translations, debug generator, weather provider normalization and tests must migrate together. No stored weather/user data migration is needed unless a new optional tire preference is persisted; bind that preference to the user selection, never infer it from old results.

Required scenario matrix: tomorrow frost despite warm majority; today's frost; cold without frost; warm with one late frost; snow at positive air temperature; near-zero with no known snow; D6/D7 horizon boundary; D9/D10 guard boundary; D13/D14 outside horizon; every threshold equality; insufficient minimum/snow/code; missing today; missing middle day; out-of-order/duplicate days; historical-only; seasonal-only; empty response; stale responses; provider failure; timezone and DST; location race; all setup choices; forecast revisions.

Properties: adding/advancing a severe winter event must not enable summer switching or postpone a winter warning; changing seasonal data must not affect decisions; deleting data cannot create warm eligibility; no deadline on/after a firm event; no date without full lookahead; determinism with injected now; no invalid date crashes; no mutually contradictory card headline and timing.

Run a disposable prototype against explicit fixtures and generated sequences before production changes. Cross-check the rendered card, not just the engine. Later evaluate against archived forecasts as issued (not hindsight observations used as if known) and actual outcomes over several transitions/climates. Report missed hazards, premature switches, unnecessary switches and advice churn separately; thresholds need calibration. Three model reviews establish internal consistency, not empirical weather accuracy or perfection.

## Questions for adversarial reviewers

Find minimal counterexamples, ambiguous branch precedence, optimistic missing-data handling, horizon truncation, date bugs, misleading copy and policy thresholds that create perpetual waiting or flip-flopping. Flag whether a problem is a correctness bug, product tradeoff, or unvalidated empirical assumption. Recommend the smallest repair. Do not approve just because the proposal sounds conservative.
