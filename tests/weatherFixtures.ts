import type { DailyWeatherPoint, GeoLocation, WeatherSeries } from "@/types"
import { addDays } from "@/lib/weather/dates"

export const NOW = new Date("2026-10-23T10:00:00Z")
export const CITY: GeoLocation = { id: "warsaw", name: "Warszawa", country: "Polska", latitude: 52.23, longitude: 21.01, timezone: "Europe/Warsaw" }
export function forecastDay(offset: number, changes: Partial<DailyWeatherPoint> = {}): DailyWeatherPoint {
    return { date: addDays("2026-10-23", offset), tempMeanC: 12, tempMinC: 6, snowfallCm: 0, weatherCode: 0, source: "FORECAST", ...changes }
}
export function weatherFixture(changes: Partial<WeatherSeries> = {}): WeatherSeries {
    return {
        locationId: CITY.id, fetchedAt: NOW.toISOString(), timezone: CITY.timezone, seasonalAvailable: false,
        history: [], forecast: Array.from({ length: 16 }, (_, index) => forecastDay(index)), ...changes,
    }
}
