/** Calendar arithmetic operates on date keys, never elapsed local 24-hour intervals. */
export function isDateKey(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
    const parsed = new Date(`${value}T12:00:00Z`)
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

export function addDays(date: string, count: number): string {
    const parsed = new Date(`${date}T12:00:00Z`)
    parsed.setUTCDate(parsed.getUTCDate() + count)
    return parsed.toISOString().slice(0, 10)
}

export function localDate(now: Date, timezone: string): string | undefined {
    if (!Number.isFinite(now.getTime()) || !timezone.trim()) return undefined
    try {
        const parts = new Intl.DateTimeFormat("en-US", {
            timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
        }).formatToParts(now)
        const part = (type: string) => parts.find((item) => item.type === type)?.value
        return `${part("year")}-${part("month")}-${part("day")}`
    } catch {
        return undefined
    }
}

/** Providers may return an equivalent alias, e.g. GMT for a requested UTC zone. */
export function sameTimezone(left: string, right: string): boolean {
    if (!left.trim() || !right.trim()) return false
    try {
        const canonical = (zone: string) => new Intl.DateTimeFormat("en-US", { timeZone: zone }).resolvedOptions().timeZone
        return canonical(left) === canonical(right)
    } catch {
        return false
    }
}
