import type { DailyWeatherPoint, GeoLocation, WeatherField, WeatherSeries } from "@/types"
import type { Locale } from "@/lib/i18n"
import { localDate, sameTimezone } from "@/lib/weather/dates"
import { normalizeDailyPoints, validValue } from "@/lib/weather/normalize"

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
    daily_units?: Record<string, string>;
    daily?: {
        snowfall_sum?: unknown;
        weather_code?: unknown;
        time?: unknown;
        temperature_2m_mean?: unknown;
        temperature_2m_min?: unknown;
    };
}

type SeasonalForecastResponse = {
    timezone?: string;
    daily_units?: Record<string, string>;
    daily?: {
        snowfall_sum?: unknown;
        weather_code?: unknown;
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

export function toDailyPoints(data: ForecastResponse, source: DailyWeatherPoint["source"]): DailyWeatherPoint[] {
    const daily = data.daily
    if (!Array.isArray(daily?.time)) return []
    const read = (values: unknown, index: number) => Array.isArray(values) ? values[index] : null
    const unit = (key: string, expected: string) => data.daily_units?.[key] === expected
    return normalizeDailyPoints(daily.time.flatMap((date, index) => {
        if (typeof date !== "string") return []
        const invalidFields: WeatherField[] = []
        const field = (name: WeatherField, key: string, values: unknown, expectedUnit: string) => {
            const raw = read(values, index)
            const value = unit(key, expectedUnit) ? validValue(name, raw) : null
            if (raw != null && value === null) invalidFields.push(name)
            return value
        }
        const day: DailyWeatherPoint = {
            date, source,
            tempMeanC: field("tempMeanC", "temperature_2m_mean", daily.temperature_2m_mean, "°C"),
            tempMinC: field("tempMinC", "temperature_2m_min", daily.temperature_2m_min, "°C"),
            snowfallCm: field("snowfallCm", "snowfall_sum", daily.snowfall_sum, "cm"),
            weatherCode: field("weatherCode", "weather_code", daily.weather_code, "wmo code"),
            invalidFields,
        }
        return [day]
    }))
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

export async function fetchWeatherSeries(location: GeoLocation, signal?: AbortSignal): Promise<WeatherSeries> {
    const normalizedLocation = normalizeLocation(location)
    if (!localDate(new Date(), location.timezone) || !location.id ||
        !isFiniteNumber(location.latitude) || Math.abs(location.latitude) > 90 ||
        !isFiniteNumber(location.longitude) || Math.abs(location.longitude) > 180) {
        throw new Error("Invalid weather location.")
    }

    const url = new URL(FORECAST_URL)
    url.searchParams.set("latitude", String(normalizedLocation.latitude))
    url.searchParams.set("longitude", String(normalizedLocation.longitude))
    url.searchParams.set("timezone", normalizedLocation.timezone || "UTC")
    url.searchParams.set("daily", "temperature_2m_mean,temperature_2m_min,snowfall_sum,weather_code")
    url.searchParams.set("temperature_unit", "celsius")
    url.searchParams.set("past_days", "14")
    url.searchParams.set("forecast_days", String(ACCURATE_FORECAST_DAYS))

    const seasonalUrl = new URL(SEASONAL_FORECAST_URL)
    seasonalUrl.searchParams.set("latitude", String(normalizedLocation.latitude))
    seasonalUrl.searchParams.set("longitude", String(normalizedLocation.longitude))
    seasonalUrl.searchParams.set("timezone", normalizedLocation.timezone || "UTC")
    seasonalUrl.searchParams.set("daily", "temperature_2m_mean,temperature_2m_min")
    seasonalUrl.searchParams.set("forecast_days", String(TOTAL_FORECAST_DAYS))
    seasonalUrl.searchParams.set("temperature_unit", "celsius")

    const data = await fetchJson<ForecastResponse>(url, signal)
    const fetchedAt = new Date().toISOString()
    const daily = toDailyPoints(data, "FORECAST")
    if (!daily.some((day) => [day.tempMeanC, day.tempMinC, day.snowfallCm, day.weatherCode].some((value) => value !== null))) {
        throw new Error("Weather service returned no usable daily data.")
    }
    const timezone = normalizedLocation.timezone
    const today = localDate(new Date(fetchedAt), timezone)
    if (!today || !sameTimezone(data.timezone ?? "", timezone)) throw new Error("Weather service returned an unexpected timezone.")

    let seasonalData: SeasonalForecastResponse | null = null

    try {
        seasonalData = await fetchJson<SeasonalForecastResponse>(seasonalUrl, signal)
    } catch {
        seasonalData = null
    }

    if (signal?.aborted) throw new DOMException("Request aborted", "AbortError")
    if (seasonalData && !sameTimezone(seasonalData.timezone ?? "", timezone)) seasonalData = null

    const history = daily.filter((point) => point.date < today)
    const accurateForecast = daily.filter((point) => point.date >= today)
    const ordinaryEnd = accurateForecast.at(-1)?.date ?? today
    const longRangeForecast = seasonalData
        ? toDailyPoints(seasonalData, "SEASONAL").filter((point) => point.date > ordinaryEnd)
        : []

    const forecast = [...accurateForecast, ...longRangeForecast]
        .sort((left, right) => left.date.localeCompare(right.date))
        .slice(0, TOTAL_FORECAST_DAYS)

    return {
        locationId: location.id, history, forecast, fetchedAt, timezone,
        seasonalAvailable: longRangeForecast.length > 0,
    }
}
