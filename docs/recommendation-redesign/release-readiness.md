# Local release readiness

Reviewed on 2026-10-23. The local code is ready to deploy based on the checks below. No production deployment was performed.

## Issues resolved during the final review

- Upgraded Next.js and eslint-config-next from 16.1.6 to 16.4.2. The previous version had published security advisories, including [image processing RCE](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw) and [Cache Components RCE](https://github.com/vercel/next.js/security/advisories/GHSA-673q-mjm6-r5xr). Updated source-map-js to 1.2.2 within its existing dependency range. The final production dependency audit reports zero known vulnerabilities.
- Reproduced a complete client-side crash when localStorage access was blocked. Preference reads and writes are now optional; the application can assess weather and change language without storage. Browser preferences use React's external-store subscription, and city-search loading is derived from the active query and matching response without synchronous state resets in effects.
- Primary weather responses must identify an equivalent timezone. Optional seasonal data with missing or mismatched timezone metadata is discarded while the ordinary forecast remains usable. UTC/GMT aliases remain supported. Regression tests cover these cases.

## Verification

| Check | Observed result |
| --- | --- |
| Unit and rendered-component tests | 133 passed |
| ESLint and CSS formatting | Passed |
| Production build and TypeScript | Passed on Next.js 16.4.2 |
| Playwright against the production build | 10 passed |
| Production dependency audit | 0 known vulnerabilities |
| Live Kraków city search and weather | Ordinary and seasonal services returned HTTP 200 with Europe/Warsaw metadata; 46 daily rows rendered |
| Browser errors and failed requests during live check | None |
| Mobile overflow during live check | None |
| Screenshots | Desktop and mobile reviewed |

The local production server runs on 127.0.0.1:3100, using Node.js 24.20.0. The required minimum Node.js version is 20.9.

Local evidence is under `/tmp/tire-redesign-verification/`:

- `production-audit.json`
- `release-live-smoke.json`
- `release-desktop.png`
- `release-mobile.png`

## Remaining verification boundaries

- The new build has been exercised locally, including real public weather services. Its behavior on the target hosting environment still needs a smoke check after deployment, including HTTPS and IP-derived location headers.
- The seasonal thresholds remain planning heuristics. Historical forecast-as-issued calibration has not been performed, and the application does not certify road conditions or driving safety.
