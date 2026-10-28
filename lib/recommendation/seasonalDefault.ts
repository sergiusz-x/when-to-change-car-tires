import type { GeoLocation, TireSetup } from "@/types"
import { localDate } from "@/lib/weather/dates"

/** Start from the previous tire set to assess the seasonal change, not whether it already happened. */
export function seasonalTireDefault(now: Date, location: Pick<GeoLocation, "latitude" | "timezone"> | null): TireSetup {
    const date = localDate(now, location?.timezone ?? "Europe/Warsaw")
    if (!date) return "UNKNOWN"
    const month = Number(date.slice(5, 7))
    const seasonalMonth = location && location.latitude < 0 ? ((month + 5) % 12) + 1 : month
    return seasonalMonth >= 3 && seasonalMonth < 10 ? "WINTER" : "SUMMER"
}
