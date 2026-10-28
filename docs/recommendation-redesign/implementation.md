# Implementation handoff

The local application implements the reviewed policy. No deployment was performed.

## Core behavior

- `lib/recommendation/policy.ts` names the seasonal thresholds and assessment horizons.
- `lib/weather/normalize.ts` preserves unknown fields, invalid values, duplicate conflicts and unconfirmed hazard reports. Seasonal provenance is kept separate.
- `lib/recommendation/engine.ts` assesses weather independently of setup and locale; `deriveTireAction` applies the selected tire context. Freshness and refresh success gate every new changing instruction and booking interval.
- `lib/recommendation/seasonalDefault.ts` supplies the previous tire set to assess the intended seasonal change using the selected city's local date. In the north, March 1 through September 30 defaults to checking a change to summer tires (starting from winter); October through February checks a change to winter tires (starting from summer), with a six-month shift in the south. The default UI names the intended change instead of claiming the user already changed tires. A manual current-tire choice takes precedence across city and language changes. The setup control is an optional inline disclosure.
- `lib/weather/openMeteoClient.ts` requests mean/minimum temperatures, snowfall and weather codes with explicit units. Today stays in forecast. Optional seasonal context cannot fill ordinary forecast gaps. Equivalent timezone aliases such as UTC/GMT are accepted while keeping the selected location's date basis.
- `app/page.tsx` binds results to a city/request generation, aborts obsolete requests, retains failed-refresh data as unconfirmed, and updates freshness while the page remains open.
- The result card shows the action, a short reason and an optional booking period. Evidence, retrieval time and detailed limitations are available on demand; stale or incomplete data still produces a visible notice. The main form button requests another assessment; no separate refresh button is shown.
- All 46 forecast days remain visible in compact tables. Near-term, later and seasonal groups communicate uncertainty once per group. Rows have a uniform 44px height; snowfall uses a numeric column, and daily warning details open from an accessible icon without changing row height. Debug weather includes the new fields and is explicitly simulated.

## Verification handoff

The local source passed 133 Vitest cases, TypeScript, ESLint/CSS formatting, and a production build. Polish UI copy was reviewed with the miodkuj skill: headlines name the seasonal action, no-change headlines name the retained tires, and forecast explanations preserve the policy thresholds and limitations. Ten Playwright scenarios passed against the production server, including encoded geolocation headers, blocked browser storage, saved language restoration, city search and selection, frost and setup overrides, cold weather, refresh failure/recovery, stale city-response rejection, freshness expiry, and responsive forecast interaction. Layout checks at 320, 390, 768 and 1440px confirm all 46 rows have the same 44px height, numeric values fit their columns, and there is no horizontal overflow. Opening a daily warning leaves row height unchanged. See [release-readiness.md](release-readiness.md) for the final dependency audit and live integration check.

Reviewed screenshots: `/tmp/tire-redesign-verification/mobile-viewport.png`, `/tmp/tire-redesign-verification/mobile-forecast.png`, `/tmp/tire-redesign-verification/desktop-viewport.png`, and `/tmp/tire-redesign-verification/simplified-live-mobile.png`. Browser traces and test output are in the ignored `test-results` directory. This validates the local integration and UI behavior; one live snapshot does not establish forecast accuracy or calibrate policy thresholds.

Historical forecast-as-issued calibration, threshold tuning, independent road-weather review and deployment remain outside this completed implementation step. The heuristic cannot certify road conditions or driving safety.
