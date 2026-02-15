import type {
    Confidence,
    DailyWeatherPoint,
    RecommendationResult,
    TireType,
    WeatherSeries,
} from "@/types"
import { DEFAULT_LOCALE, getTranslations, type Locale } from "@/lib/i18n"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function average(values: number[]): number {
    if (values.length === 0) return 0
    return values.reduce((sum, v) => sum + v, 0) / values.length
}

/** Rolling average of `tempMeanC` ending at `endIndex` (inclusive), up to `windowSize` days. */
function rollingAvg(series: DailyWeatherPoint[], endIndex: number, windowSize: number): number {
    const start = Math.max(0, endIndex - windowSize + 1)
    return average(series.slice(start, endIndex + 1).map((p) => p.tempMeanC))
}

/** Count frost nights (tempMinC <= 0) in slice [fromIndex+1 .. fromIndex+days]. */
function frostNightsAhead(series: DailyWeatherPoint[], fromIndex: number, days: number): number {
    return series.slice(fromIndex + 1, fromIndex + 1 + days).filter((p) => p.tempMinC <= 0).length
}

/** True when any of the next `days` days has tempMinC <= 0. */
function frostWithin(series: DailyWeatherPoint[], fromIndex: number, days: number): boolean {
    return series.slice(fromIndex + 1, fromIndex + 1 + days).some((p) => p.tempMinC <= 0)
}

// ---------------------------------------------------------------------------
// Milestone scanning
// ---------------------------------------------------------------------------

/**
 * Scans the full timeline forward from `startIdx`, returns the index of the
 * first day that passes the given `test` for at least `consecutive` days in a
 * row.  Returns `null` when no such run exists.
 */
function findFirstRun(
    series: DailyWeatherPoint[],
    startIdx: number,
    test: (day: DailyWeatherPoint, index: number) => boolean,
    consecutive: number,
): number | null {
    let streak = 0
    for (let i = startIdx; i < series.length; i++) {
        if (test(series[i], i)) {
            streak++
            if (streak >= consecutive) return i - consecutive + 1
        } else {
            streak = 0
        }
    }
    return null
}

// ---------------------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------------------

/**
 * Decides whether the forecast contains enough of a seasonal transition to
 * produce milestone dates.
 *
 * We intentionally return `null` dates when the forecast does not show a
 * transition — instead of inventing a fallback date.
 */
export function computeRecommendation(
    weather: WeatherSeries,
    currentTire: TireType,
    locale: Locale = DEFAULT_LOCALE,
): RecommendationResult {
    const messages = getTranslations(locale)
    const timeline: DailyWeatherPoint[] = [...weather.history, ...weather.forecast]
    const todayIdx = weather.history.length - 1 // last history day = "today"
    const targetTire: TireType = currentTire === "SUMMER" ? "WINTER" : "SUMMER"

    if (timeline.length < 5) {
        return tooLittleData(targetTire, locale)
    }

    // ---- find milestones ----
    const milestones =
        currentTire === "WINTER"
            ? findWinterToSummer(timeline, todayIdx)
            : findSummerToWinter(timeline, todayIdx)

    // ---- enforce ordering  canStart <= recommended <= maxTime ----
    const canStartIdx = milestones.canStart
    let recommendedIdx = milestones.recommended
    let maxTimeIdx = milestones.maxTime

    if (canStartIdx !== null && recommendedIdx !== null && recommendedIdx < canStartIdx) {
        recommendedIdx = canStartIdx
    }
    if (recommendedIdx !== null && maxTimeIdx !== null && maxTimeIdx < recommendedIdx) {
        maxTimeIdx = recommendedIdx
    }
    if (canStartIdx !== null && maxTimeIdx !== null && maxTimeIdx < canStartIdx) {
        maxTimeIdx = canStartIdx
    }

    // ---- build recommended window ----
    const windowFrom: number | null = recommendedIdx
    let windowTo: number | null = null

    if (windowFrom !== null) {
        if (maxTimeIdx !== null) {
            windowTo = maxTimeIdx
        } else {
            // no deadline found – give a 7-day window capped to timeline
            windowTo = Math.min(windowFrom + 6, timeline.length - 1)
        }
        if (windowTo < windowFrom) windowTo = windowFrom
    }

    // ---- confidence ----
    const confidence = computeConfidence(timeline, todayIdx, currentTire, milestones)

    // ---- reasons ----
    const reasons = buildReasons(timeline, todayIdx, currentTire, locale)

    // ---- assemble result ----
    const dateOf = (idx: number | null) => (idx !== null ? timeline[idx]?.date : undefined)

    return {
        targetTire,
        canStart: {
            label: "CAN_START_PLANNING",
            date: dateOf(canStartIdx),
            statusText:
                canStartIdx !== null
                    ? messages.engine.canStartPlanningFrom(timeline[canStartIdx].date)
                    : messages.engine.noTransitionVisible,
        },
        recommended: {
            label: "RECOMMENDED_WINDOW",
            dateFrom: dateOf(windowFrom),
            dateTo: dateOf(windowTo),
            statusText:
                windowFrom !== null && windowTo !== null
                    ? messages.engine.bestWindowBetween(timeline[windowFrom].date, timeline[windowTo].date)
                    : messages.engine.notEnoughDataForWindow,
        },
        maxTime: {
            label: "MAX_TIME",
            date: dateOf(maxTimeIdx),
            statusText:
                maxTimeIdx !== null
                    ? messages.engine.latestSafeDate(timeline[maxTimeIdx].date)
                    : messages.engine.noDeadlineVisible,
        },
        confidence,
        reasons,
        computedAt: new Date().toISOString(),
    }
}

// ---------------------------------------------------------------------------
// WINTER → SUMMER  (user has winter tires, looking for warm transition)
// ---------------------------------------------------------------------------

type MilestoneIndices = {
    canStart: number | null;
    recommended: number | null;
    maxTime: number | null;
}

function findWinterToSummer(timeline: DailyWeatherPoint[], todayIdx: number): MilestoneIndices {
    // canStart – first run of 3 consecutive days with mean >= 7°C
    const canStart = findFirstRun(timeline, todayIdx, (day) => day.tempMeanC >= 7, 3)

    // recommended – first day (from canStart or today) where:
    //   rolling 5-day avg >= 7°C  AND  frost nights in next 7 days <= 1
    const recSearchFrom = canStart ?? todayIdx
    let recommended: number | null = null
    for (let i = recSearchFrom; i < timeline.length; i++) {
        const avg5 = rollingAvg(timeline, i, 5)
        const frost7 = frostNightsAhead(timeline, i, 7)
        if (avg5 >= 7 && frost7 <= 1) {
            recommended = i
            break
        }
    }

    // maxTime – first day (from recommended or today) where:
    //   rolling 5-day avg >= 12°C  AND  no frost in next 7 days
    //   (winter tires degrade fast in heat)
    const maxSearchFrom = recommended ?? todayIdx
    let maxTime: number | null = null
    for (let i = maxSearchFrom; i < timeline.length; i++) {
        const avg5 = rollingAvg(timeline, i, 5)
        const frost7 = frostNightsAhead(timeline, i, 7)
        if (avg5 >= 12 && frost7 === 0) {
            maxTime = i
            break
        }
    }

    return { canStart, recommended, maxTime }
}

// ---------------------------------------------------------------------------
// SUMMER → WINTER  (user has summer tires, looking for cold transition)
// ---------------------------------------------------------------------------

function findSummerToWinter(timeline: DailyWeatherPoint[], todayIdx: number): MilestoneIndices {
    // canStart – first run of 3 consecutive days with mean < 7°C
    const canStart = findFirstRun(timeline, todayIdx, (day) => day.tempMeanC < 7, 3)

    // recommended – first day (from canStart or today) where:
    //   rolling 5-day avg < 7°C  AND  frost nights in next 7 days >= 2
    const recSearchFrom = canStart ?? todayIdx
    let recommended: number | null = null
    for (let i = recSearchFrom; i < timeline.length; i++) {
        const avg5 = rollingAvg(timeline, i, 5)
        const frost7 = frostNightsAhead(timeline, i, 7)
        if (avg5 < 7 && frost7 >= 2) {
            recommended = i
            break
        }
    }

    // maxTime – first day (from recommended or today) where:
    //   rolling 3-day avg < 3°C  OR  frost within 48h
    //   (summer tires are dangerous on ice)
    const maxSearchFrom = recommended ?? todayIdx
    let maxTime: number | null = null
    for (let i = maxSearchFrom; i < timeline.length; i++) {
        const avg3 = rollingAvg(timeline, i, 3)
        const frostSoon = frostWithin(timeline, i, 2)
        if (avg3 < 3 || frostSoon) {
            maxTime = i
            break
        }
    }

    return { canStart, recommended, maxTime }
}

// ---------------------------------------------------------------------------
// Confidence
// ---------------------------------------------------------------------------

function computeConfidence(
    timeline: DailyWeatherPoint[],
    todayIdx: number,
    currentTire: TireType,
    milestones: MilestoneIndices,
): Confidence {
    // No milestones at all → LOW
    if (milestones.canStart === null) return "LOW"

    const next7 = timeline.slice(todayIdx + 1, todayIdx + 8)
    const warmDays = next7.filter((d) => d.tempMeanC >= 7).length
    const coldDays = next7.filter((d) => d.tempMeanC < 7).length
    const frostNights = next7.filter((d) => d.tempMinC <= 0).length

    if (currentTire === "SUMMER") {
        // Looking for cold transition → switch to winter
        if (coldDays >= 5 || frostNights >= 3) return "HIGH"
        if (coldDays >= 3 || frostNights >= 1) return "MEDIUM"
        return "LOW"
    }

    // Looking for warm transition → switch to summer
    if (warmDays >= 5 && frostNights === 0) return "HIGH"
    if (warmDays >= 3 && frostNights <= 1) return "MEDIUM"
    return "LOW"
}

// ---------------------------------------------------------------------------
// Reasons
// ---------------------------------------------------------------------------

function buildReasons(
    timeline: DailyWeatherPoint[],
    todayIdx: number,
    currentTire: TireType,
    locale: Locale,
): string[] {
    const messages = getTranslations(locale)
    const avg5 = rollingAvg(timeline, todayIdx, 5)
    const next7 = timeline.slice(todayIdx + 1, todayIdx + 8)
    const next14 = timeline.slice(todayIdx + 1, todayIdx + 15)

    const frost7 = next7.filter((d) => d.tempMinC <= 0).length

    if (currentTire === "SUMMER") {
        const cold14 = next14.filter((d) => d.tempMeanC < 7).length
        return [
            messages.reasons.fiveDayAverage(avg5),
            messages.reasons.daysBelow7In14(cold14),
            messages.reasons.frostNightsIn7(frost7),
        ]
    }

    const warm14 = next14.filter((d) => d.tempMeanC >= 7).length
    return [
        messages.reasons.fiveDayAverage(avg5),
        messages.reasons.daysAbove7In14(warm14),
        messages.reasons.frostNightsIn7(frost7),
    ]
}

// ---------------------------------------------------------------------------
// Fallbacks
// ---------------------------------------------------------------------------

function tooLittleData(targetTire: TireType, locale: Locale): RecommendationResult {
    const messages = getTranslations(locale)

    return {
        targetTire,
        canStart: {
            label: "CAN_START_PLANNING",
            statusText: messages.engine.tooLittleDataCanStart,
        },
        recommended: {
            label: "RECOMMENDED_WINDOW",
            statusText: messages.engine.tooLittleDataRecommended,
        },
        maxTime: {
            label: "MAX_TIME",
            statusText: messages.engine.tooLittleDataMaxTime,
        },
        confidence: "LOW",
        reasons: [messages.reasons.tooLittleData],
        computedAt: new Date().toISOString(),
    }
}
