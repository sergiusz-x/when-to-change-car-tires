import { describe, expect, it } from "vitest"
import { computeRecommendation, deriveTireAction } from "@/lib/recommendation/engine"
import { CITY, forecastDay, NOW, weatherFixture } from "@/tests/weatherFixtures"
import type { DailyWeatherPoint, TireSetup } from "@/types"

const assess = (weather = weatherFixture(), refreshOutcome: "SUCCESS" | "FAILURE" = "SUCCESS", now = NOW) =>
    computeRecommendation(weather, CITY, { now, refreshOutcome })
const change = (offset: number, fields: Partial<DailyWeatherPoint>) => weatherFixture({
    forecast: Array.from({ length: 16 }, (_, index) => forecastDay(index, index === offset ? fields : {})),
})

describe("weather assessment and tire actions", () => {
    it("prioritizes tomorrow's frost over fourteen warm days", () => {
        const result = assess(change(1, { tempMinC: -3 }))
        expect(result.state).toBe("WINTER_PRECAUTION")
        expect(deriveTireAction(result, "SUMMER")).toMatchObject({ kind: "PLAN_WINTER", booking: { from: "2026-10-23", to: "2026-10-23" } })
        expect(deriveTireAction(result, "WINTER")).toEqual({ kind: "NO_CHANGE", setup: "WINTER", conditional: false })
    })

    it.each([0, 1, 2, 3, 6, 7, 9, 10, 15, 16])("handles a freezing forecast at D%i without shifting the event", (offset) => {
        const weather = change(offset, { tempMinC: 0 })
        if (offset === 16) weather.forecast.push(forecastDay(16, { tempMinC: 0 }))
        const result = assess(weather)
        expect(result.state).toBe(offset < 7 ? "WINTER_PRECAUTION" : offset < 16 ? "WATCH_OUTLOOK" : "SUMMER_CANDIDATE")
        const action = deriveTireAction(result, "SUMMER")
        if (offset === 0 || offset >= 7) expect(action.booking).toBeUndefined()
        if (offset > 0 && offset < 7) expect(action.booking!.to < forecastDay(offset).date).toBe(true)
    })

    it("plans winter tires for sustained cold without any frost", () => {
        const result = assess(weatherFixture({ forecast: Array.from({ length: 16 }, (_, index) => forecastDay(index, { tempMeanC: 5, tempMinC: 2 })) }))
        expect(result.state).toBe("COOL_TREND")
        expect(result.coldDays).toBe(7)
        expect(deriveTireAction(result, "SUMMER").kind).toBe("PLAN_WINTER")
    })

    it("requires all seven means before identifying a cold trend", () => {
        const weather = weatherFixture({ forecast: Array.from({ length: 16 }, (_, index) => forecastDay(index, { tempMeanC: index < 5 ? 5 : index < 7 ? null : 12, tempMinC: 4.5 })) })
        expect(assess(weather)).toMatchObject({ state: "INSUFFICIENT", coldDays: null })
    })

    it.each([4, 5])("uses the explicit 5-of-7 cold threshold (%i cold days)", (count) => {
        const weather = weatherFixture({ forecast: Array.from({ length: 16 }, (_, index) => forecastDay(index, { tempMeanC: index < count ? 6.9 : 7, tempMinC: 5 })) })
        expect(assess(weather).state).toBe(count === 5 ? "COOL_TREND" : "MIXED")
    })

    it.each([7, 7.01])("treats mean %s°C at the summer boundary explicitly", (mean) => {
        expect(assess(change(0, { tempMeanC: mean })).state).toBe(mean > 7 ? "SUMMER_CANDIDATE" : "MIXED")
    })

    it.each([0, 0.01, 4, 4.01])("handles minimum %s°C at guard boundaries", (min) => {
        expect(assess(change(0, { tempMinC: min })).state).toBe(min <= 0 ? "WINTER_PRECAUTION" : min <= 4 ? "MIXED" : "SUMMER_CANDIDATE")
    })

    it.each([0.01, 0.99, 1])("distinguishes trace snowfall %s cm from winter precautions", (snowfallCm) => {
        expect(assess(change(1, { snowfallCm })).state).toBe(snowfallCm >= 1 ? "WINTER_PRECAUTION" : "MIXED")
    })

    it.each([48, 56, 57, 66, 67, 73, 75, 86])("keeps WMO %i actionable even when temperatures are missing", (weatherCode) => {
        expect(assess(change(1, { tempMeanC: null, tempMinC: null, weatherCode })).state).toBe("WINTER_PRECAUTION")
    })

    it.each([71, 77, 85])("reports light snow code %i without forcing a seasonal swap", (weatherCode) => {
        expect(assess(change(1, { weatherCode })).state).toBe("MIXED")
    })

    it.each([95, 96, 99])("does not turn thunderstorm/hail code %i into a winter switch", (weatherCode) => {
        expect(assess(change(1, { weatherCode })).state).toBe("SUMMER_CANDIDATE")
    })

    it.each(["tempMeanC", "tempMinC", "snowfallCm", "weatherCode"] as const)("missing %s in D9 cannot permit a summer suggestion", (field) => {
        expect(assess(change(9, { [field]: null })).state).toBe("INSUFFICIENT")
    })

    it("keeps a known hazard despite unrelated missing data, without an optimistic booking interval", () => {
        const weather = change(5, { tempMinC: -2 })
        weather.forecast[1].tempMinC = null
        const result = assess(weather)
        expect(result.state).toBe("WINTER_PRECAUTION")
        expect(deriveTireAction(result, "SUMMER").booking).toBeUndefined()
        expect(result.signals.some((signal) => signal.date === forecastDay(5).date && signal.kind === "FREEZING_AIR")).toBe(true)
    })

    it("keeps today's event untimed with no before-today booking", () => {
        const result = assess(change(0, { tempMinC: -1 }))
        expect(result.state).toBe("WINTER_PRECAUTION")
        expect(deriveTireAction(result, "UNKNOWN")).toMatchObject({ kind: "PLAN_WINTER", conditional: true })
        expect(deriveTireAction(result, "UNKNOWN").booking).toBeUndefined()
    })

    it("uses calendar keys even if the provider skips or reorders dates", () => {
        const weather = change(2, { tempMinC: -1 })
        weather.forecast = weather.forecast.filter((day) => day.date !== forecastDay(1).date).reverse()
        const result = assess(weather)
        expect(result.state).toBe("WINTER_PRECAUTION")
        expect(result.missing[0].date).toBe(forecastDay(1).date)
        expect(deriveTireAction(result, "SUMMER").booking).toBeUndefined()
    })

    it.each([1, 10])("vetoes summer when duplicate winter reports conflict on D%i", (offset) => {
        const weather = weatherFixture()
        weather.forecast.push(forecastDay(offset, { snowfallCm: 1 }))
        const result = assess(weather)
        expect(result.state).toBe(offset < 7 ? "VERIFY_WARNING" : "WATCH_OUTLOOK")
        expect(result.signals.some((signal) => !signal.confirmed && signal.kind === "SNOW")).toBe(true)
        expect(deriveTireAction(result, "WINTER").booking).toBeUndefined()
    })

    it("keeps a lesser duplicate conflict unknown instead of clear", () => {
        const weather = weatherFixture()
        weather.forecast.push(forecastDay(2, { snowfallCm: 0.2 }))
        const result = assess(weather)
        expect(result.state).toBe("INSUFFICIENT")
        expect(result.signals.some((signal) => !signal.confirmed && signal.kind === "LIGHT_SNOW")).toBe(true)
    })

    it("ignores seasonal changes entirely, including seasonal duplicates of ordinary days", () => {
        const baseline = assess()
        const weather = weatherFixture()
        weather.forecast.push(...Array.from({ length: 46 }, (_, index) => forecastDay(index, { source: "SEASONAL", tempMeanC: -20, tempMinC: -30, snowfallCm: 50, weatherCode: 75 })))
        expect(assess(weather)).toEqual(baseline)
    })

    it.each([{ forecast: [] }, { forecast: [forecastDay(0, { source: "SEASONAL" })] }])("does not fall back to history or seasonal-only data", ({ forecast }) => {
        expect(assess(weatherFixture({ history: [forecastDay(-1)], forecast })).state).toBe("UNAVAILABLE")
    })

    it("fails closed after a refresh error even while the retained data is CURRENT", () => {
        for (const weather of [weatherFixture(), change(1, { tempMinC: -2 })]) {
            const result = assess(weather, "FAILURE")
            expect(result.state).toBe("REFRESH_REQUIRED")
            for (const setup of ["SUMMER", "WINTER", "UNKNOWN", "ALL_SEASON"] as TireSetup[]) {
                expect(deriveTireAction(result, setup)).toMatchObject({ kind: "REFRESH" })
                expect(deriveTireAction(result, setup).booking).toBeUndefined()
            }
            expect(result.signals.every((signal) => !signal.confirmed)).toBe(true)
            expect(assess(weather, "SUCCESS").state).not.toBe("REFRESH_REQUIRED")
        }
    })

    it.each([[6, "CURRENT"], [6.0001, "STALE"], [24, "STALE"], [24.0001, "EXPIRED"]] as const)("handles freshness age %s hours", (age, freshness) => {
        const weather = weatherFixture({ fetchedAt: new Date(NOW.getTime() - age * 3_600_000).toISOString() })
        const result = assess(weather)
        expect(result.freshness).toBe(freshness)
        if (age > 6) expect(result.state).toBe("REFRESH_REQUIRED")
    })

    it.each(["invalid", "2026-02-30T10:00:00Z", "2026-10-23T11:00:00Z"])("does not permit actions for invalid timestamp %s", (fetchedAt) => {
        expect(assess(weatherFixture({ fetchedAt })).state).toBe("UNAVAILABLE")
    })

    it("tolerates at most five minutes of clock skew and discloses it", () => {
        expect(assess(weatherFixture({ fetchedAt: new Date(NOW.getTime() + 300_000).toISOString() }))).toMatchObject({ state: "SUMMER_CANDIDATE", clockSkew: true })
    })

    it.each([{ timezone: "Invalid/Timezone" }, { locationId: "another-city" }])("rejects mismatched metadata %o", (changes) => {
        expect(assess(weatherFixture(changes)).state).toBe("UNAVAILABLE")
    })

    it("never emits an automatic seasonal change for all-season tires", () => {
        for (const weather of [weatherFixture(), change(0, { tempMinC: -5 }), change(4, { snowfallCm: 2 })]) {
            expect(deriveTireAction(assess(weather), "ALL_SEASON")).toMatchObject({ kind: "ALL_SEASON_INFO" })
            expect(deriveTireAction(assess(weather), "ALL_SEASON").booking).toBeUndefined()
        }
    })

    it("makes summer advice conditional when the setup is unknown", () => {
        const result = assess()
        expect(deriveTireAction(result, "UNKNOWN")).toEqual({ kind: "CONSIDER_SUMMER", setup: "UNKNOWN", conditional: true })
        expect(deriveTireAction(result, "WINTER").kind).toBe("CONSIDER_SUMMER")
        expect(deriveTireAction(result, "SUMMER").kind).toBe("NO_CHANGE")
    })

    it("does not enable summer by deleting guard evidence or adding a winter signal", () => {
        for (let offset = 0; offset < 10; offset++) {
            for (const field of ["tempMeanC", "tempMinC", "snowfallCm", "weatherCode"] as const) {
                expect(assess(change(offset, { [field]: null })).state).not.toBe("SUMMER_CANDIDATE")
            }
            expect(assess(change(offset, { tempMinC: -1 })).state).not.toBe("SUMMER_CANDIDATE")
        }
    })

    it("is deterministic for fixed input and does not mutate provider data", () => {
        const weather = change(2, { tempMinC: -1 })
        const original = structuredClone(weather)
        expect(assess(weather)).toEqual(assess(weather))
        expect(weather).toEqual(original)
    })
})
