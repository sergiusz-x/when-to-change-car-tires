import type { TireType, WeatherSeries } from "@/types"

/** Picks the tire type that fits the majority of the reliable near-term forecast. */
export function inferRecommendedTire(weather: WeatherSeries): TireType {
    const nearTerm = weather.forecast
        .filter((day) => day.accuracy !== "LOW")
        .slice(0, 14)

    const sample = nearTerm.length > 0 ? nearTerm : weather.history.slice(-14)
    if (sample.length === 0) {
        return "WINTER"
    }

    const coldDays = sample.filter((day) => day.tempMeanC < 7 || day.tempMinC <= 0).length
    const warmDays = sample.length - coldDays

    if (coldDays !== warmDays) {
        return coldDays > warmDays ? "WINTER" : "SUMMER"
    }

    const meanTemperature = sample.reduce((sum, day) => sum + day.tempMeanC, 0) / sample.length
    return meanTemperature < 7 ? "WINTER" : "SUMMER"
}
