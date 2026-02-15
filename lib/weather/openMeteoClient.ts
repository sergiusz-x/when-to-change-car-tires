import type { DailyWeatherPoint, GeoLocation, WeatherSeries } from "@/types"
import type { Locale } from "@/lib/i18n"

type GeocodingResponse = {
    results?: Array<{
        id: number;
        name: string;
        country: string;
        admin1?: string;
        latitude: number;
        longitude: number;
        timezone: string;
    }>;
}

type ForecastResponse = {
    timezone?: string;
    daily?: {
        time?: unknown;
        temperature_2m_mean?: unknown;
        temperature_2m_min?: unknown;
    };
}

type SeasonalForecastResponse = {
    timezone?: string;
    daily?: {
        time?: unknown;
        temperature_2m_mean?: unknown;
        temperature_2m_min?: unknown;
    };
}

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
const SEASONAL_FORECAST_URL = "https://seasonal-api.open-meteo.com/v1/seasonal"
const ACCURATE_FORECAST_DAYS = 16
const TOTAL_FORECAST_DAYS = 46
const REQUEST_TIMEOUT_MS = 9000
const MAX_CITY_QUERY_LENGTH = 80

function isFiniteNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value)
}

function sanitizeCityQuery(query: string): string {
    return query.trim().slice(0, MAX_CITY_QUERY_LENGTH)
}

function sanitizeLatitude(value: number): number {
    return Math.max(-90, Math.min(90, value))
}

function sanitizeLongitude(value: number): number {
    return Math.max(-180, Math.min(180, value))
}

function sanitizeTimezone(timezone: string | null | undefined): string {
    if (!timezone) {
        return "UTC"
    }

    const candidate = timezone.trim()
    if (!candidate) {
        return "UTC"
    }

    try {
        new Intl.DateTimeFormat("en-US", { timeZone: candidate }).format(new Date())
        return candidate
    } catch {
        return "UTC"
    }
}

function normalizeLocation(location: GeoLocation): GeoLocation {
    return {
        ...location,
        latitude: sanitizeLatitude(location.latitude),
        longitude: sanitizeLongitude(location.longitude),
        timezone: sanitizeTimezone(location.timezone),
    }
}

function createRequestSignal(signal?: AbortSignal): { signal: AbortSignal; cleanup: () => void } {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
        controller.abort()
    }, REQUEST_TIMEOUT_MS)

    const onAbort = () => {
        controller.abort()
    }

    if (signal) {
        if (signal.aborted) {
            controller.abort()
        } else {
            signal.addEventListener("abort", onAbort, { once: true })
        }
    }

    return {
        signal: controller.signal,
        cleanup: () => {
            clearTimeout(timeoutId)
            signal?.removeEventListener("abort", onAbort)
        },
    }
}

async function fetchJson<T>(url: URL, signal?: AbortSignal): Promise<T> {
    const { signal: requestSignal, cleanup } = createRequestSignal(signal)

    try {
        const response = await fetch(url, {
            cache: "no-store",
            signal: requestSignal,
        })

        if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`)
        }

        return (await response.json()) as T
    } finally {
        cleanup()
    }
}

function toDailyPoints(
    timeValues: unknown,
    meanValues: unknown,
    minValues: unknown,
): DailyWeatherPoint[] {
    if (!Array.isArray(timeValues) || !Array.isArray(meanValues)) {
        return []
    }

    const minArray = Array.isArray(minValues) ? minValues : []
    const total = Math.min(timeValues.length, meanValues.length)
    const points: DailyWeatherPoint[] = []

    for (let index = 0; index < total; index++) {
        const date = timeValues[index]
        const mean = meanValues[index]
        const min = minArray[index]

        if (typeof date !== "string" || !isFiniteNumber(mean)) {
            continue
        }

        const safeMin = isFiniteNumber(min) ? Math.min(min, mean) : mean
        points.push({
            date,
            tempMeanC: mean,
            tempMinC: safeMin,
        })
    }

    return points
}

export async function searchCities(query: string, locale: Locale = "en", signal?: AbortSignal): Promise<GeoLocation[]> {
    const normalizedQuery = sanitizeCityQuery(query)
    if (normalizedQuery.length < 2) {
        return []
    }

    const url = new URL(GEOCODING_URL)
    url.searchParams.set("name", normalizedQuery)
    url.searchParams.set("count", "7")
    url.searchParams.set("language", locale)
    url.searchParams.set("format", "json")

    const data = await fetchJson<GeocodingResponse>(url, signal)
    const items = data.results ?? []

    return items
        .filter((item) => {
            return (
                isFiniteNumber(item.id) &&
                typeof item.name === "string" &&
                item.name.trim().length > 0 &&
                typeof item.country === "string" &&
                item.country.trim().length > 0 &&
                isFiniteNumber(item.latitude) &&
                isFiniteNumber(item.longitude)
            )
        })
        .map((item) => ({
            id: String(item.id),
            name: item.name.trim(),
            country: item.country.trim(),
            admin1: typeof item.admin1 === "string" ? item.admin1.trim() : undefined,
            latitude: sanitizeLatitude(item.latitude),
            longitude: sanitizeLongitude(item.longitude),
            timezone: sanitizeTimezone(item.timezone),
        }))
}

function getTodayInTimezone(timezone: string): string {
    try {
        const formatter = new Intl.DateTimeFormat("en-CA", {
            timeZone: sanitizeTimezone(timezone),
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        })

        return formatter.format(new Date())
    } catch {
        return new Intl.DateTimeFormat("en-CA", {
            timeZone: "UTC",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).format(new Date())
    }
}

export async function fetchWeatherSeries(location: GeoLocation, signal?: AbortSignal): Promise<WeatherSeries> {
    const normalizedLocation = normalizeLocation(location)

    const url = new URL(FORECAST_URL)
    url.searchParams.set("latitude", String(normalizedLocation.latitude))
    url.searchParams.set("longitude", String(normalizedLocation.longitude))
    url.searchParams.set("timezone", normalizedLocation.timezone || "UTC")
    url.searchParams.set("daily", "temperature_2m_mean,temperature_2m_min")
    url.searchParams.set("past_days", "14")
    url.searchParams.set("forecast_days", String(ACCURATE_FORECAST_DAYS))

    const seasonalUrl = new URL(SEASONAL_FORECAST_URL)
    seasonalUrl.searchParams.set("latitude", String(normalizedLocation.latitude))
    seasonalUrl.searchParams.set("longitude", String(normalizedLocation.longitude))
    seasonalUrl.searchParams.set("timezone", normalizedLocation.timezone || "UTC")
    seasonalUrl.searchParams.set("daily", "temperature_2m_mean,temperature_2m_min")
    seasonalUrl.searchParams.set("forecast_days", String(TOTAL_FORECAST_DAYS))

    const data = await fetchJson<ForecastResponse>(url, signal)
    const daily = toDailyPoints(
        data.daily?.time,
        data.daily?.temperature_2m_mean,
        data.daily?.temperature_2m_min,
    )

    if (daily.length === 0) {
        throw new Error("Weather service returned no usable daily data.")
    }

    let seasonalData: SeasonalForecastResponse | null = null

    try {
        seasonalData = await fetchJson<SeasonalForecastResponse>(seasonalUrl, signal)
    } catch {
        seasonalData = null
    }

    const timezone = sanitizeTimezone(data.timezone || normalizedLocation.timezone)
    const today = getTodayInTimezone(timezone)

    const history = daily.filter((point) => point.date <= today)
    const accurateForecast = daily
        .filter((point) => point.date > today)
        .map((point) => ({
            ...point,
            accuracy: "HIGH" as const,
        }))

    const accurateDates = new Set(accurateForecast.map((point) => point.date))
    const longRangeForecast = seasonalData
        ? toDailyPoints(
            seasonalData.daily?.time,
            seasonalData.daily?.temperature_2m_mean,
            seasonalData.daily?.temperature_2m_min,
        )
            .filter((point) => point.date > today && !accurateDates.has(point.date))
            .map((point) => ({
                ...point,
                accuracy: "LOW" as const,
            }))
        : []

    const forecast = [...accurateForecast, ...longRangeForecast]
        .sort((left, right) => left.date.localeCompare(right.date))
        .slice(0, TOTAL_FORECAST_DAYS)

    return {
        history,
        forecast,
        fetchedAt: new Date().toISOString(),
        timezone,
    }
}
