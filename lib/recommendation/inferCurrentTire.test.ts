import { describe, expect, it } from "vitest"
import { inferCurrentTire } from "@/lib/recommendation/inferCurrentTire"

describe("inferCurrentTire", () => {
    it("returns WINTER for northern hemisphere winter months", () => {
        const tire = inferCurrentTire("Europe/Warsaw", 52.23, "2026-01-15")
        expect(tire).toBe("WINTER")
    })

    it("returns SUMMER for northern hemisphere summer months", () => {
        const tire = inferCurrentTire("Europe/Warsaw", 52.23, "2026-07-15")
        expect(tire).toBe("SUMMER")
    })

    it("returns WINTER for southern hemisphere winter months", () => {
        const tire = inferCurrentTire("Australia/Sydney", -33.87, "2026-07-15")
        expect(tire).toBe("WINTER")
    })

    it("returns SUMMER for southern hemisphere summer months", () => {
        const tire = inferCurrentTire("Australia/Sydney", -33.87, "2026-01-15")
        expect(tire).toBe("SUMMER")
    })
})
