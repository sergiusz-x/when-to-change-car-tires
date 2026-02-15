import type { TireType } from "@/types"

const NORTH_WINTER_MONTHS = new Set([10, 11, 12, 1, 2, 3])
const SOUTH_WINTER_MONTHS = new Set([4, 5, 6, 7, 8, 9])

function getMonthInTimezone(timezone: string, referenceDate?: string): number {
    const dateCandidate = referenceDate ? new Date(`${referenceDate}T12:00:00Z`) : new Date()
    const date = Number.isNaN(dateCandidate.getTime()) ? new Date() : dateCandidate
    const monthText = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        month: "numeric",
    }).format(date)

    return Number(monthText)
}

export function inferCurrentTire(timezone: string, latitude: number, referenceDate?: string): TireType {
    const month = getMonthInTimezone(timezone, referenceDate)
    const isNorthernHemisphere = latitude >= 0
    const winterMonths = isNorthernHemisphere ? NORTH_WINTER_MONTHS : SOUTH_WINTER_MONTHS

    return winterMonths.has(month) ? "WINTER" : "SUMMER"
}
