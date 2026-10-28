import { describe, expect, it } from "vitest"
import { seasonalTireDefault } from "@/lib/recommendation/seasonalDefault"
import { CITY } from "@/tests/weatherFixtures"

describe("seasonal view defaults", () => {
    it.each(["2026-03-01", "2026-04-30", "2026-08-31", "2026-09-30"])("assesses a change to summer tires from March through September: %s", (date) => {
        expect(seasonalTireDefault(new Date(`${date}T12:00:00Z`), CITY)).toBe("WINTER")
    })

    it.each(["2026-10-01", "2026-12-15", "2027-02-28"])("assesses a change to winter tires from October through February: %s", (date) => {
        expect(seasonalTireDefault(new Date(`${date}T12:00:00Z`), CITY)).toBe("SUMMER")
    })

    it("uses the selected location's calendar date at a seasonal boundary", () => {
        const now = new Date("2026-09-30T23:30:00Z")
        expect(seasonalTireDefault(now, CITY)).toBe("SUMMER")
        expect(seasonalTireDefault(now, { latitude: 40.7, timezone: "America/New_York" })).toBe("WINTER")
    })

    it("starts checking summer tires on March 1 in the selected city's timezone", () => {
        const now = new Date("2026-02-28T23:30:00Z")
        expect(seasonalTireDefault(now, CITY)).toBe("WINTER")
        expect(seasonalTireDefault(now, { latitude: 40.7, timezone: "America/New_York" })).toBe("SUMMER")
    })

    it("reverses the preset in the southern hemisphere", () => {
        expect(seasonalTireDefault(new Date("2026-12-15T12:00:00Z"), { latitude: -33.9, timezone: "Australia/Sydney" })).toBe("WINTER")
    })

    it("does not guess a preset for an invalid clock", () => {
        expect(seasonalTireDefault(new Date(NaN), CITY)).toBe("UNKNOWN")
    })
})
