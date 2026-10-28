# Adversarial review: data and algorithm correctness

Scope: branch ordering, calendar dates, incomplete/invalid inputs, forecast horizons, freshness, and decision properties. This is an independent review of proposal v1; no production code was changed.

## Findings

### 1. Cold-trend rule does not define the missing-data denominator — medium severity, specification defect

The cold trend is “at least 5 of the 7 means <7°C,” but unlike warm eligibility it does not explicitly require seven known means. Step 1 only says partial data cannot become affirmative warm evidence, so it does not settle whether five cold values plus two missing days count as a cold trend. If the implementation counts the available values, deleting data can create a winter recommendation; if it treats missing as not cold, the result differs from treating the seven-day block as incomplete. The property “deleting data cannot create warm eligibility” does not cover this cold branch.

```ts
const D0toD6 = [5, 5, 5, 5, 5, null, null]; // daily means in °C
// Proposed phrase alone: 5 available means < 7 => cold trend => WINTER.
// But two unknown days could be warm, and complete seven-day evidence is absent.
```

Expected: identify a cold tendency only when all seven means are available (or specify a different explicit denominator); otherwise retain the hazard scan and return mixed/insufficient with the missing dates. Smallest repair: state that cold trend requires a complete D0..D6 mean-temperature block. A separate known hard event may still produce a warning with incomplete coverage.

### 2. Any positive snowfall amount is promoted to a hard winter signal — medium severity, uncalibrated threshold / product tradeoff

`snowfall > 0 cm` has no noise or materiality threshold, while the same value can be a tiny trace. A model value of `0.01 cm` on D1 can therefore enter the urgent D0..D2 branch even with warm temperatures and no other winter evidence. This is deterministic per the draft, but its operational meaning (“winter conditions” and urgent switch) is not calibrated and may cause unnecessary urgent changes from trace amounts or model noise.

```ts
const day = { date: "D1", meanC: 12, minC: 8, snowfallCm: 0.01, code: 1 };
// Proposed: hard winter signal => urgent winter conditions.
// Expected behavior is a product choice; 0.01 cm does not establish a material road hazard.
```

Smallest repair: name and validate a minimum snowfall threshold, or classify any positive amount as a low-severity snow signal and reserve “urgent” for a separately defined severity. Preserve the conservative warning if desired, but do not describe the threshold as calibrated.

### 3. The data completeness of the guard horizon should be field-level explicit — low severity, specification gap

Warm eligibility explicitly requires known snowfall/code values for its seven-day block, then requires “complete guard data through d+9.” It is not explicit whether `complete` means each required field (mean, minimum, snowfall, code) is valid on every guard day, or only that date rows exist. A row with D8 present but `weatherCode = null` can then be treated differently by two implementations, despite the guard's purpose being to establish absence of a winter signal.

```ts
const D0toD9 = completeDates();
D8.weatherCode = null; // and snowfallCm = null
// If “complete guard data” means dates only, D0 can pass the guard without ruling out D8 snow.
```

Expected: no affirmative summer eligibility unless every signal-bearing field needed by the rule is known for every day through d+9. Smallest repair: define a valid guard day explicitly (valid mean/minimum/snowfall/code and date), or name the fields required for each hazard test.

## Resolved checks and limits

- **Branch ordering:** the order is coherent for complete data: D0..D2 hard events take urgent precedence, D3..D6 hard events take planning precedence, sustained cold does not require frost, and near-freezing-only blocks do not force an immediate seasonal change. A simultaneous earlier near-freezing day and later hard event should still show both facts; the proposal's risk-event output supports this, but copy should avoid suggesting the later event is the first concern.
- **Calendar/timezone/DST:** injected UTC `now`, IANA zone, local date strings, and local calendar arithmetic are the right model. Keep horizons as date-key ranges, never milliseconds/24-hour increments; a DST day is not always 24 hours. Validate that `fetchedAt` is a parseable UTC instant and not in the future before applying age buckets, or a bad clock value can make old data look current.
- **Missing days:** keeping gaps and prohibiting array-slice closure are sound. The hard-event scan should remain field-wise so a known snow/code/minimum hazard survives unrelated missing fields, while warm eligibility needs all fields required to rule hazards out.
- **Forecast bounds:** D3 summer candidate needs guard through D12, within the stated D0..D13 outlook. D13 is outlook only; D14 is outside the stated horizon. No off-by-one error is apparent if all ranges are inclusive as written. The provider's current 16-day forecast is enough for these blocks.
- **Provider weather codes:** the named freezing and snow codes match the subset documented by Open-Meteo, including its depositing-rime code 48. The current provider code table does not include mixed rain/snow WMO codes 68/69, so their omission is not a demonstrated defect for this specified provider. If provenance later permits another WMO source, revisit the supported-code set instead of assuming the Open-Meteo subset.
- **Freshness:** threshold inclusivity is clear (`<=6h`, `>6h..24h`, `>24h`). Date validity and whether a stale winter signal can trigger an action versus only an unconfirmed warning remain policy choices; spell out the displayed action if implementation needs a single answer.
- **Unvalidated but explicit heuristics:** 5/7 cold means, 3°C near-freezing boundary, 3-day summer candidate range, 10-day guard, trace snowfall, and 6/24-hour freshness are product rules, not weather probabilities. The proposal correctly says these need outcome-based calibration. Long periods of nightly minima `<=3°C` can suppress summer eligibility indefinitely; that may be intended conservatism, but should be measured as premature/late switching rather than called a correctness guarantee.

Official provider code table consulted for the subset note: https://open-meteo.com/en/docs#weathervariables
