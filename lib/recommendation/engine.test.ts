import { describe, expect, it } from "vitest"
import { computeRecommendation } from "@/lib/recommendation/engine"
import type { DailyWeatherPoint, WeatherSeries } from "@/types"

function buildSeries(
    history: Array<{ date: string; mean: number; min: number }>,
    forecast: Array<{ date: string; mean: number; min: number }>,
): WeatherSeries {
    const toPoint = (item: { date: string; mean: number; min: number }): DailyWeatherPoint => ({
        date: item.date,
        tempMeanC: item.mean,
        tempMinC: item.min,
    })

    return {
        history: history.map(toPoint),
        forecast: forecast.map(toPoint),
        fetchedAt: new Date().toISOString(),
        timezone: "Europe/Warsaw",
    }
}

describe("computeRecommendation", () => {
    // ==========================================================================
    // WINTER → SUMMER  (user has winter tires, should switch to summer)
    // ==========================================================================

    describe("WINTER -> SUMMER", () => {
        it("recommends switching when spring warmth is stable", () => {
            const weather = buildSeries(
                [
                    { date: "2026-03-20", mean: 8, min: 2 },
                    { date: "2026-03-21", mean: 9, min: 3 },
                    { date: "2026-03-22", mean: 10, min: 4 },
                    { date: "2026-03-23", mean: 11, min: 5 },
                    { date: "2026-03-24", mean: 12, min: 6 },
                ],
                [
                    { date: "2026-03-25", mean: 12, min: 5 },
                    { date: "2026-03-26", mean: 13, min: 6 },
                    { date: "2026-03-27", mean: 12, min: 5 },
                    { date: "2026-03-28", mean: 11, min: 4 },
                    { date: "2026-03-29", mean: 12, min: 5 },
                    { date: "2026-03-30", mean: 13, min: 6 },
                    { date: "2026-03-31", mean: 14, min: 7 },
                ],
            )

            const r = computeRecommendation(weather, "WINTER")
            expect(r.targetTire).toBe("SUMMER")
            expect(r.confidence).toBe("HIGH")
            // canStart should be found (warm streak present)
            expect(r.canStart.date).toBeDefined()
            // recommended should exist and not be before canStart
            expect(r.recommended.dateFrom).toBeDefined()
            expect(r.recommended.dateFrom! >= r.canStart.date!).toBe(true)
        })

        it("returns NO milestone dates in deep winter (Feb, all frost)", () => {
            // Your actual scenario — February, -5 to -8°C, all frost
            const weather = buildSeries(
                [
                    { date: "2026-02-10", mean: -2, min: -5 },
                    { date: "2026-02-11", mean: -1, min: -4 },
                    { date: "2026-02-12", mean: 0, min: -3 },
                    { date: "2026-02-13", mean: -1, min: -5 },
                    { date: "2026-02-14", mean: -2, min: -4 },
                ],
                [
                    { date: "2026-02-15", mean: -5, min: -9 },
                    { date: "2026-02-16", mean: -8, min: -11 },
                    { date: "2026-02-17", mean: -7, min: -10 },
                    { date: "2026-02-18", mean: -4, min: -7 },
                    { date: "2026-02-19", mean: -5, min: -7 },
                    { date: "2026-02-20", mean: -5, min: -9 },
                    { date: "2026-02-21", mean: -3, min: -7 },
                    { date: "2026-02-22", mean: 2, min: -1 },
                    { date: "2026-02-23", mean: 4, min: 2 },
                    { date: "2026-02-24", mean: 2, min: 0 },
                ],
            )

            const r = computeRecommendation(weather, "WINTER")
            expect(r.targetTire).toBe("SUMMER")
            expect(r.confidence).toBe("LOW")
            // NO dates should be returned — it's deep winter!
            expect(r.canStart.date).toBeUndefined()
            expect(r.recommended.dateFrom).toBeUndefined()
            expect(r.maxTime.date).toBeUndefined()
        })

        it("finds canStart but not recommended when warm days are intermittent", () => {
            const weather = buildSeries(
                [
                    { date: "2026-03-05", mean: 3, min: -2 },
                    { date: "2026-03-06", mean: 4, min: -1 },
                    { date: "2026-03-07", mean: 5, min: 0 },
                    { date: "2026-03-08", mean: 4, min: -1 },
                    { date: "2026-03-09", mean: 5, min: 0 },
                ],
                [
                    { date: "2026-03-10", mean: 7, min: 1 },
                    { date: "2026-03-11", mean: 8, min: 2 },
                    { date: "2026-03-12", mean: 9, min: 3 },
                    // warm streak of 3 → canStart triggers
                    { date: "2026-03-13", mean: 3, min: -3 },
                    // frost returns → recommended should NOT trigger
                    { date: "2026-03-14", mean: 2, min: -4 },
                    { date: "2026-03-15", mean: 4, min: -2 },
                    { date: "2026-03-16", mean: 5, min: -1 },
                ],
            )

            const r = computeRecommendation(weather, "WINTER")
            expect(r.canStart.date).toBeDefined()
            expect(r.recommended.dateFrom).toBeUndefined()
            expect(r.maxTime.date).toBeUndefined()
            expect(r.confidence).toBe("LOW")
        })

        it("triggers maxTime in hot weather (winter tires degrade)", () => {
            const weather = buildSeries(
                [
                    { date: "2026-04-15", mean: 12, min: 5 },
                    { date: "2026-04-16", mean: 13, min: 6 },
                    { date: "2026-04-17", mean: 14, min: 7 },
                    { date: "2026-04-18", mean: 15, min: 8 },
                    { date: "2026-04-19", mean: 14, min: 7 },
                ],
                [
                    { date: "2026-04-20", mean: 15, min: 8 },
                    { date: "2026-04-21", mean: 16, min: 9 },
                    { date: "2026-04-22", mean: 15, min: 8 },
                    { date: "2026-04-23", mean: 14, min: 7 },
                    { date: "2026-04-24", mean: 15, min: 8 },
                    { date: "2026-04-25", mean: 16, min: 9 },
                    { date: "2026-04-26", mean: 17, min: 10 },
                ],
            )

            const r = computeRecommendation(weather, "WINTER")
            expect(r.maxTime.date).toBeDefined()
            // should be soon — avg is well above 12, no frost
            expect(r.maxTime.date! <= "2026-04-22").toBe(true)
        })

        it("uses a fallback recommended window when deadline is not visible yet", () => {
            const weather = buildSeries(
                [
                    { date: "2026-03-01", mean: 7, min: 2 },
                    { date: "2026-03-02", mean: 8, min: 3 },
                    { date: "2026-03-03", mean: 8, min: 3 },
                    { date: "2026-03-04", mean: 9, min: 4 },
                    { date: "2026-03-05", mean: 8, min: 3 },
                ],
                [
                    { date: "2026-03-06", mean: 8, min: 2 },
                    { date: "2026-03-07", mean: 8, min: 2 },
                    { date: "2026-03-08", mean: 9, min: -1 },
                    { date: "2026-03-09", mean: 8, min: 2 },
                    { date: "2026-03-10", mean: 8, min: 2 },
                ],
            )

            const r = computeRecommendation(weather, "WINTER")
            expect(r.recommended.dateFrom).toBe("2026-03-05")
            expect(r.recommended.dateTo).toBe("2026-03-10")
            expect(r.maxTime.date).toBeUndefined()
        })
    })

    // ==========================================================================
    // SUMMER → WINTER  (user has summer tires, should switch to winter)
    // ==========================================================================

    describe("SUMMER -> WINTER", () => {
        it("recommends switching when autumn cooling is clear", () => {
            const weather = buildSeries(
                [
                    { date: "2026-10-01", mean: 8, min: 3 },
                    { date: "2026-10-02", mean: 7, min: 3 },
                    { date: "2026-10-03", mean: 6, min: 2 },
                    { date: "2026-10-04", mean: 5, min: 1 },
                    { date: "2026-10-05", mean: 5, min: 0 },
                ],
                [
                    { date: "2026-10-06", mean: 4, min: -1 },
                    { date: "2026-10-07", mean: 3, min: -2 },
                    { date: "2026-10-08", mean: 4, min: -1 },
                    { date: "2026-10-09", mean: 3, min: -2 },
                    { date: "2026-10-10", mean: 2, min: -3 },
                    { date: "2026-10-11", mean: 3, min: -2 },
                    { date: "2026-10-12", mean: 2, min: -4 },
                ],
            )

            const r = computeRecommendation(weather, "SUMMER")
            expect(r.targetTire).toBe("WINTER")
            expect(r.canStart.date).toBeDefined()
            expect(r.recommended.dateFrom).toBeDefined()
            expect(r.confidence).not.toBe("LOW")
        })

        it("returns NO milestones in stable summer", () => {
            const weather = buildSeries(
                [
                    { date: "2026-07-01", mean: 25, min: 18 },
                    { date: "2026-07-02", mean: 26, min: 19 },
                    { date: "2026-07-03", mean: 25, min: 18 },
                    { date: "2026-07-04", mean: 24, min: 17 },
                    { date: "2026-07-05", mean: 25, min: 18 },
                ],
                [
                    { date: "2026-07-06", mean: 26, min: 19 },
                    { date: "2026-07-07", mean: 27, min: 20 },
                    { date: "2026-07-08", mean: 26, min: 19 },
                    { date: "2026-07-09", mean: 25, min: 18 },
                    { date: "2026-07-10", mean: 26, min: 19 },
                ],
            )

            const r = computeRecommendation(weather, "SUMMER")
            expect(r.targetTire).toBe("WINTER")
            expect(r.confidence).toBe("LOW")
            // No cold transition visible → no dates
            expect(r.canStart.date).toBeUndefined()
            expect(r.recommended.dateFrom).toBeUndefined()
            expect(r.maxTime.date).toBeUndefined()
        })

        it("triggers maxTime when frost is imminent", () => {
            const weather = buildSeries(
                [
                    { date: "2026-11-01", mean: 4, min: 0 },
                    { date: "2026-11-02", mean: 3, min: -1 },
                    { date: "2026-11-03", mean: 2, min: -2 },
                    { date: "2026-11-04", mean: 2, min: -3 },
                    { date: "2026-11-05", mean: 1, min: -4 },
                ],
                [
                    { date: "2026-11-06", mean: 0, min: -6 },
                    { date: "2026-11-07", mean: -1, min: -8 },
                    { date: "2026-11-08", mean: -2, min: -9 },
                    { date: "2026-11-09", mean: -3, min: -10 },
                    { date: "2026-11-10", mean: -2, min: -9 },
                ],
            )

            const r = computeRecommendation(weather, "SUMMER")
            expect(r.maxTime.date).toBeDefined()
            // Should be very soon — already freezing
            expect(r.maxTime.date! <= "2026-11-06").toBe(true)
        })

        it("gives LOW confidence when weather is mild and ambiguous", () => {
            const weather = buildSeries(
                [
                    { date: "2026-09-20", mean: 14, min: 8 },
                    { date: "2026-09-21", mean: 13, min: 7 },
                    { date: "2026-09-22", mean: 12, min: 6 },
                    { date: "2026-09-23", mean: 13, min: 7 },
                    { date: "2026-09-24", mean: 14, min: 8 },
                ],
                [
                    { date: "2026-09-25", mean: 13, min: 7 },
                    { date: "2026-09-26", mean: 12, min: 6 },
                    { date: "2026-09-27", mean: 14, min: 8 },
                    { date: "2026-09-28", mean: 13, min: 7 },
                    { date: "2026-09-29", mean: 14, min: 8 },
                    { date: "2026-09-30", mean: 13, min: 7 },
                    { date: "2026-10-01", mean: 12, min: 6 },
                ],
            )

            const r = computeRecommendation(weather, "SUMMER")
            expect(r.confidence).toBe("LOW")
        })
    })

    // ==========================================================================
    // ORDERING INVARIANT — must ALWAYS hold when dates exist
    // ==========================================================================

    describe("ordering", () => {
        it("always maintains canStart <= recommended.dateFrom <= recommended.dateTo <= maxTime", () => {
            const weather = buildSeries(
                [
                    { date: "2026-10-01", mean: 10, min: 5 },
                    { date: "2026-10-02", mean: 9, min: 4 },
                    { date: "2026-10-03", mean: 8, min: 3 },
                    { date: "2026-10-04", mean: 7, min: 2 },
                    { date: "2026-10-05", mean: 6, min: 1 },
                ],
                [
                    { date: "2026-10-06", mean: 5, min: -1 },
                    { date: "2026-10-07", mean: 4, min: -2 },
                    { date: "2026-10-08", mean: 3, min: -1 },
                    { date: "2026-10-09", mean: 4, min: -2 },
                    { date: "2026-10-10", mean: 3, min: -3 },
                    { date: "2026-10-11", mean: 2, min: -4 },
                    { date: "2026-10-12", mean: 2, min: -3 },
                    { date: "2026-10-13", mean: 3, min: -2 },
                    { date: "2026-10-14", mean: 4, min: -1 },
                    { date: "2026-10-15", mean: 3, min: -2 },
                ],
            )

            const r = computeRecommendation(weather, "SUMMER")
            const { date: canStart } = r.canStart
            const { dateFrom, dateTo } = r.recommended
            const { date: maxTime } = r.maxTime

            // Only check ordering between dates that actually exist
            if (canStart && dateFrom) expect(canStart <= dateFrom).toBe(true)
            if (dateFrom && dateTo) expect(dateFrom <= dateTo).toBe(true)
            if (dateTo && maxTime) expect(dateTo <= maxTime).toBe(true)
            if (canStart && maxTime) expect(canStart <= maxTime).toBe(true)
        })
    })

    // ==========================================================================
    // EDGE CASES
    // ==========================================================================

    describe("edge cases", () => {
        it("handles too little data gracefully", () => {
            const weather = buildSeries(
                [{ date: "2026-01-01", mean: 0, min: -5 }],
                [{ date: "2026-01-02", mean: -1, min: -6 }],
            )

            const r = computeRecommendation(weather, "WINTER", "en")
            expect(r.confidence).toBe("LOW")
            expect(r.reasons).toEqual(expect.arrayContaining([expect.stringContaining("too little data")]))
        })

        it("does not crash with history-only data (empty forecast)", () => {
            const weather = buildSeries(
                [
                    { date: "2026-06-01", mean: 20, min: 14 },
                    { date: "2026-06-02", mean: 21, min: 15 },
                    { date: "2026-06-03", mean: 22, min: 16 },
                    { date: "2026-06-04", mean: 21, min: 15 },
                    { date: "2026-06-05", mean: 20, min: 14 },
                ],
                [],
            )

            // Should not throw
            const r = computeRecommendation(weather, "SUMMER")
            expect(r.targetTire).toBe("WINTER")
            expect(r.canStart.date).toBeUndefined()
            expect(r.recommended.dateFrom).toBeUndefined()
            expect(r.maxTime.date).toBeUndefined()
            expect(r.confidence).toBe("LOW")
        })

        it("reasons include all expected metrics for SUMMER->WINTER", () => {
            const weather = buildSeries(
                [
                    { date: "2026-10-01", mean: 6, min: 1 },
                    { date: "2026-10-02", mean: 5, min: 0 },
                    { date: "2026-10-03", mean: 5, min: -1 },
                    { date: "2026-10-04", mean: 4, min: -2 },
                    { date: "2026-10-05", mean: 4, min: -1 },
                ],
                [
                    { date: "2026-10-06", mean: 3, min: -3 },
                    { date: "2026-10-07", mean: 2, min: -4 },
                ],
            )

            const r = computeRecommendation(weather, "SUMMER", "en")
            expect(r.reasons).toHaveLength(3)
            expect(r.reasons).toEqual(
                expect.arrayContaining([
                    expect.stringContaining("5-day average"),
                    expect.stringContaining("Days below 7°C"),
                    expect.stringContaining("Frost nights"),
                ]),
            )
        })

        it("reasons include all expected metrics for WINTER->SUMMER", () => {
            const weather = buildSeries(
                [
                    { date: "2026-04-01", mean: 10, min: 4 },
                    { date: "2026-04-02", mean: 11, min: 5 },
                    { date: "2026-04-03", mean: 12, min: 6 },
                    { date: "2026-04-04", mean: 11, min: 5 },
                    { date: "2026-04-05", mean: 10, min: 4 },
                ],
                [
                    { date: "2026-04-06", mean: 12, min: 5 },
                    { date: "2026-04-07", mean: 13, min: 6 },
                ],
            )

            const r = computeRecommendation(weather, "WINTER", "en")
            expect(r.reasons).toHaveLength(3)
            expect(r.reasons).toEqual(
                expect.arrayContaining([
                    expect.stringContaining("5-day average"),
                    expect.stringContaining("Days above 7°C"),
                    expect.stringContaining("Frost nights"),
                ]),
            )
        })
    })
})
