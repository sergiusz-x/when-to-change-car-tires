import { describe, expect, it } from "vitest"
import { normalizeDailyPoints, validValue } from "@/lib/weather/normalize"
import { addDays, isDateKey, localDate } from "@/lib/weather/dates"
import { forecastDay } from "@/tests/weatherFixtures"

it("rejects invalid dates rather than normalizing them into the next month", () => {
    expect(isDateKey("2026-02-30")).toBe(false)
    expect(isDateKey("2024-02-29")).toBe(true)
    expect(normalizeDailyPoints([forecastDay(0, { date: "2026-02-30" })])).toEqual([])
})

it("invalidates inconsistent temperatures without erasing valid precipitation", () => {
    const [day] = normalizeDailyPoints([forecastDay(0, { tempMeanC: 2, tempMinC: 5, snowfallCm: 3 })])
    expect(day).toMatchObject({ tempMeanC: null, tempMinC: null, snowfallCm: 3 })
})

it.each([NaN, Infinity, -101, 71, undefined, "5"])("rejects invalid temperature %s", (value) => {
    expect(validValue("tempMinC", value)).toBeNull()
})

it("checks unit-independent numeric and code sanity bounds", () => {
    expect(validValue("snowfallCm", -1)).toBeNull()
    expect(validValue("snowfallCm", 501)).toBeNull()
    expect(validValue("weatherCode", 68)).toBeNull()
    expect(validValue("weatherCode", 0)).toBe(0)
})

it("collapses identical duplicates and preserves conflicts across repeated normalization", () => {
    const points = [forecastDay(0), forecastDay(0), forecastDay(1), forecastDay(1, { tempMinC: -1 })]
    const normalized = normalizeDailyPoints(points)
    expect(normalized).toHaveLength(2)
    expect(normalized[1].tempMinC).toBeNull()
    expect(normalized[1].unconfirmedSignals).toContainEqual(expect.objectContaining({ kind: "FREEZING_AIR", confirmed: false }))
    expect(normalizeDailyPoints(normalized)).toEqual(normalized)
})

describe("local calendar dates", () => {
    it.each([
        ["2026-10-23T00:30:00Z", "America/Los_Angeles", "2026-10-22"],
        ["2026-10-23T12:30:00Z", "Pacific/Kiritimati", "2026-10-24"],
        ["2026-10-25T00:30:00Z", "Europe/Warsaw", "2026-10-25"],
        ["2026-10-25T02:30:00Z", "Europe/Warsaw", "2026-10-25"],
    ])("maps %s in %s to %s", (instant, zone, expected) => {
        expect(localDate(new Date(instant), zone)).toBe(expected)
    })
    it("adds calendar days over DST and month boundaries", () => {
        expect(addDays("2026-10-25", 1)).toBe("2026-10-26")
        expect(addDays("2026-03-29", 1)).toBe("2026-03-30")
        expect(addDays("2026-12-31", 1)).toBe("2027-01-01")
    })
    it("fails closed for an invalid clock or timezone", () => {
        expect(localDate(new Date(NaN), "Europe/Warsaw")).toBeUndefined()
        expect(localDate(new Date(), "Not/AZone")).toBeUndefined()
    })
})
