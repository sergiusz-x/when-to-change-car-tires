import type { GeoLocation, WeatherSeries } from "@/types"

import { addDays, isDateKey, localDate } from "@/lib/weather/dates"

export type DebugTransitionMode = "SUMMER_TO_WINTER" | "WINTER_TO_SUMMER"

type DebugSettings = {
    active: boolean;
    mode: DebugTransitionMode;
    hasWindow: boolean;
    dateOverride?: string;
    seed: number;
}

const DISABLED_DEBUG_SETTINGS: DebugSettings = {
    active: false,
    mode: "SUMMER_TO_WINTER",
    hasWindow: false,
    seed: 1,
}

function parseBoolean(value: string | null): boolean {
    if (!value) {
        return false
    }

    return ["1", "true", "yes", "on"].includes(value.toLowerCase())
}

function parseDateOverride(value: string | null): string | undefined {
    if (!value) {
        return undefined
    }

    const normalized = value.trim()
    if (!isDateKey(normalized)) {
        return undefined
    }

    return normalized
}

function parseMode(value: string | null): DebugTransitionMode {
    if (value?.toLowerCase() === "winter_to_summer") {
        return "WINTER_TO_SUMMER"
    }

    return "SUMMER_TO_WINTER"
}

function parseSeed(value: string | null): number {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) {
        return 1
    }

    return Math.abs(Math.floor(parsed)) || 1
}

function hasAnyDebugParam(searchParams: URLSearchParams): boolean {
    return (
        searchParams.has("debugMode") ||
    searchParams.has("debugHasWindow") ||
    searchParams.has("debugDate") ||
    searchParams.has("debugSeed")
    )
}

export function parseDebugSettings(
    searchParams: URLSearchParams,
    options?: { enabled?: boolean },
): DebugSettings {
    if (options?.enabled === false) {
        return { ...DISABLED_DEBUG_SETTINGS }
    }

    const mode = parseMode(searchParams.get("debugMode"))
    const hasWindow = parseBoolean(searchParams.get("debugHasWindow"))
    const dateOverride = parseDateOverride(searchParams.get("debugDate"))
    const seed = parseSeed(searchParams.get("debugSeed"))
    const active = parseBoolean(searchParams.get("debug")) || hasAnyDebugParam(searchParams)

    return {
        active,
        mode,
        hasWindow,
        dateOverride,
        seed,
    }
}

function roundToOne(value: number): number {
    return Math.round(value * 10) / 10
}

function createSeededRandom(seed: number): () => number {
    let state = (seed || 1) % 2147483647
    if (state <= 0) {
        state += 2147483646
    }

    return () => {
        state = (state * 16807) % 2147483647
        return (state - 1) / 2147483646
    }
}

function jitter(random: () => number, amount: number): number {
    return (random() * 2 - 1) * amount
}

function clampMinBelowMean(mean: number, min: number): number {
    if (min > mean - 0.3) {
        return roundToOne(mean - 0.3)
    }

    return roundToOne(min)
}

type GeneratedPoint = { tempMeanC: number; tempMinC: number }

function generatePoint(
    mode: DebugTransitionMode,
    hasWindow: boolean,
    timelineIndex: number,
    todayIndex: number,
    random: () => number,
): GeneratedPoint {
    const forecastDay = Math.max(0, timelineIndex - todayIndex)

    if (mode === "SUMMER_TO_WINTER") {
        if (!hasWindow) {
            const mean = 11 + jitter(random, 1.2)
            const min = mean - 5 + jitter(random, 0.8)
            return { tempMeanC: roundToOne(mean), tempMinC: clampMinBelowMean(mean, min) }
        }

        const mean = 9 - forecastDay * 1.25 + jitter(random, 0.8)
        const min = mean - 3.2 - Math.min(forecastDay * 0.22, 2.8) + jitter(random, 0.7)
        return { tempMeanC: roundToOne(mean), tempMinC: clampMinBelowMean(mean, min) }
    }

    if (!hasWindow) {
        const mean = 2 + jitter(random, 1.1)
        const min = mean - 3.8 + jitter(random, 0.9)
        return { tempMeanC: roundToOne(mean), tempMinC: clampMinBelowMean(mean, min) }
    }

    const mean = 10 + forecastDay * 0.2 + jitter(random, 0.7)
    const min = mean - 4 + jitter(random, 0.6)
    return { tempMeanC: roundToOne(mean), tempMinC: clampMinBelowMean(mean, min) }
}

export function applyDebugWeatherOverrides(weather: WeatherSeries, settings: DebugSettings): WeatherSeries {
    if (!settings.active) {
        return weather
    }

    const timelineLength = weather.history.length + weather.forecast.length
    const todayIndex = weather.history.length
    const random = createSeededRandom(settings.seed)

    const generated = Array.from({ length: timelineLength }, (_, index) =>
        generatePoint(settings.mode, settings.hasWindow, index, todayIndex, random),
    )

    return {
        ...weather,
        simulated: true,
        history: weather.history.map((point, index) => ({
            ...point,
            tempMeanC: generated[index].tempMeanC,
            tempMinC: generated[index].tempMinC,
            snowfallCm: 0,
            weatherCode: 0,
            invalidFields: [],
            conflicts: [],
            unconfirmedSignals: [],
        })),
        forecast: weather.forecast.map((point, index) => {
            const generatedIndex = weather.history.length + index
            return {
                ...point,
                tempMeanC: generated[generatedIndex].tempMeanC,
                tempMinC: generated[generatedIndex].tempMinC,
                snowfallCm: generated[generatedIndex].tempMeanC < 3 ? 1 : 0,
                weatherCode: generated[generatedIndex].tempMeanC < 3 ? 73 : 0,
                invalidFields: [],
                conflicts: [],
                unconfirmedSignals: [],
            }
        }),
    }
}

/** Complete synthetic data: debug previews never depend on a live weather request. */
export function createDebugWeather(location: GeoLocation, settings: DebugSettings, now: Date): WeatherSeries {
    const today = settings.dateOverride ?? localDate(now, location.timezone)!
    const point = (offset: number) => ({
        date: addDays(today, offset), tempMeanC: 10, tempMinC: 6, snowfallCm: 0, weatherCode: 0,
        source: offset < 16 ? "FORECAST" as const : "SEASONAL" as const,
    })
    const weather: WeatherSeries = {
        locationId: location.id,
        history: Array.from({ length: 14 }, (_, index) => point(index - 14)),
        forecast: Array.from({ length: 46 }, (_, index) => point(index)),
        fetchedAt: settings.dateOverride ? `${today}T12:00:00Z` : now.toISOString(),
        timezone: location.timezone,
        seasonalAvailable: true,
    }
    return applyDebugWeatherOverrides(weather, settings)
}
