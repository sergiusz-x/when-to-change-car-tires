# 🚗 When To Change Car Tires

## 📋 Overview

Simple weather-based app that helps decide when to switch between summer and winter tires.

Choose a city (or use auto-detection) to see the forecast and suggested action. A seasonal tire preset supplies the initial change direction; a small optional control lets you choose your own tires. The app evaluates near-term winter signals, sustained temperature trends, and forecast coverage before suggesting an action.

## 🌐 Live Preview

Visit the live website at: **[when-to-change-car-tires.vercel.app](https://when-to-change-car-tires.vercel.app/)**


## 🖼️ Preview

![Home screen](docs/screenshots/home.png)

![Recommendation result](docs/screenshots/recommendation.png)

![Weather breakdown](docs/screenshots/weather-breakdown.png)

## ✨ Features

- Auto-detects city from IP (with manual search fallback)
- City autocomplete for locations worldwide
- Seasonal tire preset with an optional override: summer, winter, all-season, or unspecified
- Setup-specific advice with conditional wording when the setup is unknown
- Freezing air, freezing precipitation and snowfall warnings before temperature trends
- Winter planning for sustained cold without requiring frost
- Summer suggestions only with complete, stable forecast evidence
- Suggested booking periods instead of invented safety deadlines
- Visible notices for missing/conflicting or stale data, with detailed evidence available on demand
- Compact forecast tables with equal-height rows and all long-range days visible
- English and Polish language support

## 🧰 Requirements

- Node.js 20.9+
- npm

## 📦 Installation

```bash
npm install
```

## ▶️ Run Locally

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

## ⚙️ Available Scripts

```bash
npm run dev    # run development server
npm run build  # build for production
npm run start  # start production build
npm run lint   # run ESLint
npm run test   # run Vitest tests
```

## 🛠️ Tech Stack

- Next.js
- React
- TypeScript
- Vitest
- Open-Meteo APIs

## Recommendation policy

The current policy is specified in [the reviewed redesign](docs/recommendation-redesign/proposal-v3.md).
The UI defaults to assessing a change to summer tires from March 1 through September 30 and to winter tires from October 1 through the end of February in the northern hemisphere, shifted six months in the southern hemisphere. It starts from the previous tire set instead of assuming that the user has already changed tires. The default label names the change being assessed; an explicit current-tire choice takes precedence. Weather assessment and freshness gates remain independent of this preset.
The engine evaluates ordinary forecasts only: seven days for the temperature trend, ten days for summer eligibility, and up to sixteen days for winter-signal outlooks. Seasonal temperature data remains visible as context and cannot change an action or date. Today is a forecast day; daily minima do not identify a future hour or measure road ice.

Five of seven complete daily means below 7°C prompt winter planning. Summer eligibility needs seven means strictly above 7°C, complete ten-day hazard coverage, minima strictly above 4°C, and no winter/trace-snow signals in that guard. A known or conflicting winter precaution later in the ordinary forecast also defers summer advice. Thresholds are planning heuristics, not calibrated safety probabilities.

A failed refresh or data older than six hours blocks new switching instructions and booking periods. Warnings remain visible; timestamps and supporting evidence are available in the assessment details. The main form button can request a new assessment. Location changes cancel obsolete requests and clear the actionable result; each result remains bound to its source city.

Run `npm test`, `npm run lint:check`, `npx tsc --noEmit`, and `npm run build` before release. Engine, provider, normalization/date, and rendered-copy regression tests cover the main policy boundaries. Historical forecast-as-issued calibration remains future work.
