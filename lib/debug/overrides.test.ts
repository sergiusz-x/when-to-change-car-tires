import { describe, expect, it } from "vitest"
import { applyDebugWeatherOverrides, parseDebugSettings } from "@/lib/debug/overrides"
import type { WeatherSeries } from "@/types"

function buildWeatherSeries(): WeatherSeries {
    return {
        fetchedAt: "2026-03-01T10:00:00.000Z",
        timezone: "Europe/Warsaw",
        history: [
            { date: "2026-02-26", tempMeanC: 1, tempMinC: -4 },
            { date: "2026-02-27", tempMeanC: 2, tempMinC: -3 },
            { date: "2026-02-28", tempMeanC: 3, tempMinC: -2 },
        ],
        forecast: [
            { date: "2026-03-01", tempMeanC: 4, tempMinC: -1 },
            { date: "2026-03-02", tempMeanC: 5, tempMinC: 0 },
            { date: "2026-03-03", tempMeanC: 6, tempMinC: 1 },
        ],
    }
}

describe("parseDebugSettings", () => {
    it("activates debug when any debug param is present", () => {
        const params = new URLSearchParams("debugMode=winter_to_summer")
        const settings = parseDebugSettings(params, { enabled: true })

        expect(settings.active).toBe(true)
        expect(settings.mode).toBe("WINTER_TO_SUMMER")
    })

    it("keeps debug enabled when explicitly allowed", () => {
        const params = new URLSearchParams("debug=1&debugMode=winter_to_summer&debugHasWindow=1&debugSeed=42")
        const settings = parseDebugSettings(params, { enabled: true })

        expect(settings.active).toBe(true)
        expect(settings.mode).toBe("WINTER_TO_SUMMER")
        expect(settings.hasWindow).toBe(true)
        expect(settings.seed).toBe(42)
    })

    it("parses date override and normalizes seed", () => {
        const params = new URLSearchParams("debug=on&debugDate=2026-12-01&debugSeed=-3.8")
        const settings = parseDebugSettings(params, { enabled: true })

        expect(settings.active).toBe(true)
        expect(settings.dateOverride).toBe("2026-12-01")
        expect(settings.seed).toBe(4)
    })

    it("falls back to defaults for invalid date and seed", () => {
        const params = new URLSearchParams("debug=1&debugDate=2026/12/01&debugSeed=oops")
        const settings = parseDebugSettings(params, { enabled: true })

        expect(settings.active).toBe(true)
        expect(settings.mode).toBe("SUMMER_TO_WINTER")
        expect(settings.hasWindow).toBe(false)
        expect(settings.dateOverride).toBeUndefined()
        expect(settings.seed).toBe(1)
    })

    it("disables all debug overrides when debug mode is not allowed", () => {
        const params = new URLSearchParams("debug=1&debugMode=winter_to_summer&debugHasWindow=1&debugDate=2026-12-01")
        const settings = parseDebugSettings(params, { enabled: false })

        expect(settings).toEqual({
            active: false,
            mode: "SUMMER_TO_WINTER",
            hasWindow: false,
            seed: 1,
        })
    })
})

describe("applyDebugWeatherOverrides", () => {
    it("returns the original weather object when debug is inactive", () => {
        const weather = buildWeatherSeries()
        const settings = parseDebugSettings(new URLSearchParams(), { enabled: true })

        const result = applyDebugWeatherOverrides(weather, settings)
        expect(result).toBe(weather)
    })

    it("generates deterministic data for the same seed and keeps timeline shape", () => {
        const weather = buildWeatherSeries()
        const settings = parseDebugSettings(
            new URLSearchParams("debug=1&debugMode=winter_to_summer&debugHasWindow=1&debugSeed=17"),
            { enabled: true },
        )

        const first = applyDebugWeatherOverrides(weather, settings)
        const second = applyDebugWeatherOverrides(buildWeatherSeries(), settings)

        expect(first).toEqual(second)
        expect(first.history).toHaveLength(weather.history.length)
        expect(first.forecast).toHaveLength(weather.forecast.length)
        expect(first.history.map((point) => point.date)).toEqual(weather.history.map((point) => point.date))
        expect(first.forecast.map((point) => point.date)).toEqual(weather.forecast.map((point) => point.date))

        const originalMeans = weather.history.concat(weather.forecast).map((point) => point.tempMeanC)
        const generatedMeans = first.history.concat(first.forecast).map((point) => point.tempMeanC)
        expect(generatedMeans).not.toEqual(originalMeans)

        for (const point of first.history.concat(first.forecast)) {
            expect(point.tempMinC).toBeLessThanOrEqual(point.tempMeanC - 0.3)
        }
    })
})
