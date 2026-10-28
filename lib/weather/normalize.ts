import type { DailyWeatherPoint, ForecastSignal, SignalKind, WeatherField } from "@/types"
import { isDateKey } from "@/lib/weather/dates"
import { CAUTION_MIN_C, WINTER_SNOW_CM } from "@/lib/recommendation/policy"

export const WEATHER_FIELDS: WeatherField[] = ["tempMeanC", "tempMinC", "snowfallCm", "weatherCode"]
const WEATHER_CODES = new Set([0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99])
const FREEZING_CODES = new Set([48, 56, 57, 66, 67])
const SNOW_CODES = new Set([73, 75, 86])
const LIGHT_SNOW_CODES = new Set([71, 77, 85])

export function validValue(field: WeatherField, value: unknown): number | null {
    if (typeof value !== "number" || !Number.isFinite(value)) return null
    if (field === "weatherCode") return WEATHER_CODES.has(value) ? value : null
    if (field === "snowfallCm") return value >= 0 && value <= 500 ? value : null
    return value >= -100 && value <= 70 ? value : null
}

export function isWinterPrecaution(signal: ForecastSignal): boolean {
    return ["FREEZING_AIR", "FREEZING_PRECIPITATION", "SNOW"].includes(signal.kind)
}

export function signalsForDay(day: DailyWeatherPoint): ForecastSignal[] {
    const signals: ForecastSignal[] = []
    const add = (kind: SignalKind, field: WeatherField, value: number) => {
        signals.push({ date: day.date, kind, field, value, confirmed: true })
    }
    if (day.tempMinC !== null) {
        if (day.tempMinC <= 0) add("FREEZING_AIR", "tempMinC", day.tempMinC)
        else if (day.tempMinC <= CAUTION_MIN_C) add("NEAR_FREEZING", "tempMinC", day.tempMinC)
    }
    if (day.snowfallCm !== null && day.snowfallCm > 0) {
        add(day.snowfallCm >= WINTER_SNOW_CM ? "SNOW" : "LIGHT_SNOW", "snowfallCm", day.snowfallCm)
    }
    if (day.weatherCode !== null) {
        if (FREEZING_CODES.has(day.weatherCode)) add("FREEZING_PRECIPITATION", "weatherCode", day.weatherCode)
        if (SNOW_CODES.has(day.weatherCode)) add("SNOW", "weatherCode", day.weatherCode)
        if (LIGHT_SNOW_CODES.has(day.weatherCode)) add("LIGHT_SNOW", "weatherCode", day.weatherCode)
    }
    return signals
}

/** Preserve missing fields and conflicting reports instead of manufacturing reassuring values. */
export function normalizeDailyPoints(points: DailyWeatherPoint[]): DailyWeatherPoint[] {
    const groups = new Map<string, DailyWeatherPoint[]>()
    for (const point of points) {
        if (!isDateKey(point.date)) continue
        const normalized: DailyWeatherPoint = { ...point }
        const invalid = new Set(point.invalidFields ?? [])
        for (const field of WEATHER_FIELDS) {
            normalized[field] = validValue(field, point[field])
            if (point[field] != null && normalized[field] === null) invalid.add(field)
        }
        if (normalized.tempMinC !== null && normalized.tempMeanC !== null && normalized.tempMinC > normalized.tempMeanC) {
            invalid.add("tempMinC")
            invalid.add("tempMeanC")
            normalized.tempMinC = null
            normalized.tempMeanC = null
        }
        normalized.invalidFields = [...invalid]
        const key = `${point.source}:${point.date}`
        groups.set(key, [...(groups.get(key) ?? []), normalized])
    }
    return [...groups.values()].map((group) => {
        const day = { ...group[0] }
        const conflicts = new Set(group.flatMap((item) => item.conflicts ?? []))
        const warnings = group.flatMap((item) => item.unconfirmedSignals ?? [])
        for (const field of WEATHER_FIELDS) {
            const values = new Set(group.map((item) => item[field]))
            if (values.size > 1 || conflicts.has(field)) {
                conflicts.add(field)
                day[field] = null
                for (const point of group) {
                    warnings.push(...signalsForDay(point).filter((signal) => signal.field === field)
                        .map((signal) => ({ ...signal, confirmed: false })))
                }
            }
        }
        day.conflicts = [...conflicts]
        day.invalidFields = [...new Set(group.flatMap((item) => item.invalidFields ?? []))]
        day.unconfirmedSignals = warnings.filter((signal, index) =>
            warnings.findIndex((other) => other.kind === signal.kind && other.field === signal.field && other.value === signal.value) === index,
        )
        return day
    }).sort((left, right) => left.date.localeCompare(right.date))
}
