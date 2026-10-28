import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fetchWeatherSeries, toDailyPoints } from "@/lib/weather/openMeteoClient"
import { computeRecommendation } from "@/lib/recommendation/engine"
import { CITY, forecastDay, NOW } from "@/tests/weatherFixtures"

function payload(offsets: number[]) {
    return {
        timezone: CITY.timezone,
        daily_units: { temperature_2m_mean: "°C", temperature_2m_min: "°C", snowfall_sum: "cm", weather_code: "wmo code" },
        daily: { time: offsets.map((index) => forecastDay(index).date), temperature_2m_mean: offsets.map(() => 12), temperature_2m_min: offsets.map(() => 6), snowfall_sum: offsets.map(() => 0), weather_code: offsets.map(() => 0) },
    }
}

beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(NOW)
})
afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
})

it("preserves missing minima and snow/code arrays instead of inventing values", () => {
    const data = payload([0])
    const parsed = toDailyPoints({ ...data, daily: { time: data.daily.time, temperature_2m_mean: [10] } }, "FORECAST")
    expect(parsed[0]).toMatchObject({ tempMeanC: 10, tempMinC: null, snowfallCm: null, weatherCode: null })
})

it("does not discard a freezing minimum when mean data is absent", () => {
    const data = payload([0])
    const parsed = toDailyPoints({ ...data, daily: { time: data.daily.time, temperature_2m_min: [-3] } }, "FORECAST")
    expect(parsed[0]).toMatchObject({ tempMeanC: null, tempMinC: -3 })
})

it("rejects unknown or unexpected units without guessing a conversion", () => {
    const data = payload([0])
    expect(toDailyPoints({ ...data, daily_units: { temperature_2m_mean: "°F" } }, "FORECAST")[0])
        .toMatchObject({ tempMeanC: null, tempMinC: null, snowfallCm: null, weatherCode: null })
})

describe("weather provider integration", () => {
    it("keeps today in ordinary forecast and appends long-range context without filling ordinary gaps", async () => {
        const ordinary = payload(Array.from({ length: 30 }, (_, index) => index - 14))
        const seasonal = payload(Array.from({ length: 46 }, (_, index) => index))
        const fetchMock = vi.fn().mockResolvedValueOnce(Response.json(ordinary)).mockResolvedValueOnce(Response.json(seasonal))
        vi.stubGlobal("fetch", fetchMock)
        const weather = await fetchWeatherSeries(CITY)
        expect(weather.history).toHaveLength(14)
        expect(weather.forecast).toHaveLength(46)
        expect(weather.forecast[0]).toMatchObject({ date: "2026-10-23", source: "FORECAST" })
        expect(weather.forecast[15].source).toBe("FORECAST")
        expect(weather.forecast[16].source).toBe("SEASONAL")
        const url = fetchMock.mock.calls[0][0] as URL
        expect(url.searchParams.get("daily")).toContain("snowfall_sum,weather_code")
        expect(url.searchParams.get("forecast_days")).toBe("16")
        expect(computeRecommendation(weather, CITY, { now: NOW, refreshOutcome: "SUCCESS" }).state).toBe("SUMMER_CANDIDATE")
    })

    it("retains ordinary forecast when the optional seasonal service fails", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json(payload(Array.from({ length: 16 }, (_, i) => i)))).mockRejectedValueOnce(new Error("seasonal unavailable")))
        const weather = await fetchWeatherSeries(CITY)
        expect(weather.seasonalAvailable).toBe(false)
        expect(weather.forecast).toHaveLength(16)
    })

    it("rejects unusable data and does not call optional services after primary failure", async () => {
        const fetchMock = vi.fn().mockResolvedValue(Response.json({ daily: { time: ["2026-10-23"] } }))
        vi.stubGlobal("fetch", fetchMock)
        await expect(fetchWeatherSeries(CITY)).rejects.toThrow("no usable daily data")
        expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it("does not interpret a different provider timezone as the selected city's dates", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json({ ...payload([0]), timezone: "America/New_York" })).mockRejectedValueOnce(new Error("no seasonal")))
        await expect(fetchWeatherSeries(CITY)).rejects.toThrow("unexpected timezone")
    })

    it("rejects a missing primary timezone instead of assuming the requested zone was used", async () => {
        const fetchMock = vi.fn().mockResolvedValue(Response.json({ ...payload([0]), timezone: undefined }))
        vi.stubGlobal("fetch", fetchMock)
        await expect(fetchWeatherSeries(CITY)).rejects.toThrow("unexpected timezone")
        expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it.each(["America/New_York", undefined])("retains the ordinary forecast when seasonal timezone is %s", async (timezone) => {
        vi.stubGlobal("fetch", vi.fn()
            .mockResolvedValueOnce(Response.json(payload(Array.from({ length: 16 }, (_, index) => index))))
            .mockResolvedValueOnce(Response.json({ ...payload(Array.from({ length: 46 }, (_, index) => index)), timezone })))
        const weather = await fetchWeatherSeries(CITY)
        expect(weather.seasonalAvailable).toBe(false)
        expect(weather.forecast).toHaveLength(16)
        expect(computeRecommendation(weather, CITY, { now: NOW, refreshOutcome: "SUCCESS" }).state).toBe("SUMMER_CANDIDATE")
    })

    it("accepts equivalent UTC/GMT timezone aliases from both providers", async () => {
        vi.stubGlobal("fetch", vi.fn()
            .mockResolvedValueOnce(Response.json({ ...payload(Array.from({ length: 16 }, (_, index) => index)), timezone: "GMT" }))
            .mockResolvedValueOnce(Response.json({ ...payload(Array.from({ length: 46 }, (_, index) => index)), timezone: "GMT" })))
        const location = { ...CITY, timezone: "UTC" }
        const weather = await fetchWeatherSeries(location)
        expect(weather.timezone).toBe("UTC")
        expect(weather.seasonalAvailable).toBe(true)
        expect(weather.forecast).toHaveLength(46)
        expect(computeRecommendation(weather, location, { now: NOW, refreshOutcome: "SUCCESS" }).state).toBe("SUMMER_CANDIDATE")
    })

    it("propagates cancellation even when the optional request fails", async () => {
        const controller = new AbortController()
        vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json(payload([0]))).mockImplementationOnce(() => {
            controller.abort()
            throw new DOMException("Aborted", "AbortError")
        }))
        await expect(fetchWeatherSeries(CITY, controller.signal)).rejects.toMatchObject({ name: "AbortError" })
    })
})
