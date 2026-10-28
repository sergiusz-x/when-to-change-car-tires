import type { AssessmentState, DailyWeatherPoint, GeoLocation, RecommendationResult, RefreshOutcome, TireAction, TireSetup, WeatherSeries } from "@/types"
import { addDays, isDateKey, localDate } from "@/lib/weather/dates"
import { isWinterPrecaution, normalizeDailyPoints, signalsForDay, WEATHER_FIELDS } from "@/lib/weather/normalize"

import { ASSESSMENT_DAYS, CAUTION_MIN_C, COLD_DAYS_REQUIRED, SEASONAL_MEAN_C, SUMMER_GUARD_DAYS, TREND_DAYS } from "@/lib/recommendation/policy"

export const CURRENT_FORECAST_MS = 6 * 60 * 60 * 1000
const EXPIRED_FORECAST_MS = 24 * 60 * 60 * 1000
const CLOCK_SKEW_MS = 5 * 60 * 1000
const HAZARD_FIELDS = ["tempMinC", "snowfallCm", "weatherCode"] as const

export function computeRecommendation(
    weather: WeatherSeries,
    location: GeoLocation,
    options: { now: Date; refreshOutcome: RefreshOutcome },
): RecommendationResult {
    const { now, refreshOutcome } = options
    const today = localDate(now, weather.timezone)
    const timestampValid = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|\+00:00)$/.test(weather.fetchedAt) &&
        isDateKey(weather.fetchedAt.slice(0, 10)) && Number(weather.fetchedAt.slice(11, 13)) < 24 &&
        Number(weather.fetchedAt.slice(14, 16)) < 60 && Number(weather.fetchedAt.slice(17, 19)) < 60
    const fetchedMs = timestampValid ? Date.parse(weather.fetchedAt) : NaN
    const rawAge = now.getTime() - fetchedMs
    const validTime = Number.isFinite(rawAge) && rawAge >= -CLOCK_SKEW_MS
    const age = Math.max(0, rawAge)
    const freshness = !validTime ? "INVALID" : age <= CURRENT_FORECAST_MS ? "CURRENT" : age <= EXPIRED_FORECAST_MS ? "STALE" : "EXPIRED"
    const metadataValid = Boolean(today && validTime && weather.locationId === location.id && location.id &&
        weather.timezone === location.timezone && Number.isFinite(location.latitude) && Math.abs(location.latitude) <= 90 &&
        Number.isFinite(location.longitude) && Math.abs(location.longitude) <= 180)
    // Filter provenance BEFORE normalization: seasonal values cannot poison a forecast day.
    const days = today ? normalizeDailyPoints(weather.forecast.filter((day) => day.source === "FORECAST"))
        .filter((day) => day.date >= today && day.date <= addDays(today, ASSESSMENT_DAYS - 1)) : []
    const byDate = new Map(days.map((day) => [day.date, day]))
    const block = today ? Array.from({ length: SUMMER_GUARD_DAYS }, (_, index) => ({ date: addDays(today, index), day: byDate.get(addDays(today, index)) })) : []
    const missing = block.map(({ date, day }) => ({ date, fields: WEATHER_FIELDS.filter((field) => day?.[field] == null) }))
        .filter((item) => item.fields.length > 0)
    const outlookIncomplete = today ? Array.from({ length: ASSESSMENT_DAYS - SUMMER_GUARD_DAYS }, (_, index) => addDays(today, index + SUMMER_GUARD_DAYS))
        .filter((date) => HAZARD_FIELDS.some((field) => byDate.get(date)?.[field] == null)) : []
    const dataIssues: RecommendationResult["dataIssues"] = days.flatMap((day) => [
        ...(day.invalidFields?.length ? [{ date: day.date, fields: day.invalidFields, kind: "INVALID" as const }] : []),
        ...(day.conflicts?.length ? [{ date: day.date, fields: day.conflicts, kind: "CONFLICT" as const }] : []),
    ])
    const rawSignals = days.flatMap((day) => [...signalsForDay(day), ...(day.unconfirmedSignals ?? [])])
    const canIssueAction = metadataValid && freshness === "CURRENT" && refreshOutcome === "SUCCESS"
    const signals = rawSignals.map((signal) => ({ ...signal, confirmed: signal.confirmed && canIssueAction }))
    const firstWeek = block.slice(0, TREND_DAYS)
    const completeMeans = firstWeek.length === TREND_DAYS && firstWeek.every(({ day }) => day?.tempMeanC != null)
    const coldDays = completeMeans ? firstWeek.filter(({ day }) => day!.tempMeanC! < SEASONAL_MEAN_C).length : null
    const weekEnd = today ? addDays(today, TREND_DAYS - 1) : undefined
    const guardEnd = today ? addDays(today, SUMMER_GUARD_DAYS - 1) : undefined
    const nearTerm = weekEnd ? rawSignals.filter((signal) => signal.date <= weekEnd) : []
    let state: AssessmentState
    if (!metadataValid || !days.some((day) => WEATHER_FIELDS.some((field) => day[field] !== null))) state = "UNAVAILABLE"
    else if (!canIssueAction) state = "REFRESH_REQUIRED"
    else if (nearTerm.some((signal) => signal.confirmed && isWinterPrecaution(signal))) state = "WINTER_PRECAUTION"
    else if (nearTerm.some((signal) => !signal.confirmed && isWinterPrecaution(signal))) state = "VERIFY_WARNING"
    else if (coldDays !== null && coldDays >= COLD_DAYS_REQUIRED) state = "COOL_TREND"
    else if (rawSignals.some(isWinterPrecaution)) state = "WATCH_OUTLOOK"
    else if (rawSignals.some((signal) => signal.confirmed && guardEnd && signal.date <= guardEnd)) state = "MIXED"
    else if (missing.length === 0 && firstWeek.every(({ day }) => day!.tempMeanC! > SEASONAL_MEAN_C) && block.every(({ day }) => day!.tempMinC! > CAUTION_MIN_C)) state = "SUMMER_CANDIDATE"
    else state = missing.length ? "INSUFFICIENT" : "MIXED"

    return {
        state, today, assessedThrough: today ? addDays(today, ASSESSMENT_DAYS - 1) : undefined, fetchedAt: weather.fetchedAt,
        freshness, refreshOutcome, clockSkew: validTime && rawAge < 0, days, signals, missing, coldDays, outlookIncomplete, dataIssues, metadataValid,
    }
}

function completeHazards(days: DailyWeatherPoint[], today: string, through: string): boolean {
    const byDate = new Map(days.map((day) => [day.date, day]))
    for (let date = today; date <= through; date = addDays(date, 1)) {
        const day = byDate.get(date)
        if (!day || HAZARD_FIELDS.some((field) => day[field] === null) || day.unconfirmedSignals?.length) return false
    }
    return true
}

export function deriveTireAction(result: RecommendationResult, setup: TireSetup): TireAction {
    const action: TireAction = { kind: "NO_ASSESSMENT", setup, conditional: setup === "UNKNOWN" }
    if (result.state === "REFRESH_REQUIRED") return { ...action, kind: "REFRESH" }
    if (["UNAVAILABLE", "INSUFFICIENT"].includes(result.state)) return action
    if (result.state === "VERIFY_WARNING") return { ...action, kind: "VERIFY" }
    if (setup === "ALL_SEASON") return { ...action, kind: "ALL_SEASON_INFO" }
    if (["WINTER_PRECAUTION", "COOL_TREND"].includes(result.state)) {
        if (setup === "WINTER") return { ...action, kind: "NO_CHANGE" }
        action.kind = "PLAN_WINTER"
        const first = result.signals.find((signal) => signal.confirmed && isWinterPrecaution(signal))
        if (result.today && result.state === "WINTER_PRECAUTION" && first && first.date > result.today &&
            completeHazards(result.days, result.today, first.date)) {
            const before = addDays(first.date, -1)
            action.booking = { from: result.today, to: before < addDays(result.today, 3) ? before : addDays(result.today, 3) }
        }
        if (result.today && result.state === "COOL_TREND" && completeHazards(result.days, result.today, addDays(result.today, 3))) {
            action.booking = { from: result.today, to: addDays(result.today, 3) }
        }
        return action
    }
    if (result.state === "SUMMER_CANDIDATE") return { ...action, kind: setup === "SUMMER" ? "NO_CHANGE" : "CONSIDER_SUMMER" }
    return { ...action, kind: setup === "WINTER" ? "WAIT" : "MONITOR" }
}
