import { headers } from "next/headers"
import { NextResponse } from "next/server"

type IpLocationResponse = {
    city?: string;
    country_name?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
}

const NO_STORE_CACHE_CONTROL = "no-store, no-cache, must-revalidate, proxy-revalidate"

function sanitizeText(value: string | null, maxLength: number): string | undefined {
    if (!value) {
        return undefined
    }

    const normalized = value.trim().slice(0, maxLength)
    return normalized.length > 0 ? normalized : undefined
}

function parseCoordinate(value: string | null, min: number, max: number): number | undefined {
    if (!value) {
        return undefined
    }

    const numeric = Number(value)
    if (!Number.isFinite(numeric) || numeric < min || numeric > max) {
        return undefined
    }

    return numeric
}

function sanitizeTimezone(value: string | null): string | undefined {
    if (!value) {
        return undefined
    }

    const candidate = value.trim()
    if (!candidate) {
        return undefined
    }

    try {
        new Intl.DateTimeFormat("en-US", { timeZone: candidate }).format(new Date())
        return candidate
    } catch {
        return undefined
    }
}

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
    const requestHeaders = await headers()
    const city = sanitizeText(requestHeaders.get("x-vercel-ip-city"), 120)
    const countryCode = sanitizeText(requestHeaders.get("x-vercel-ip-country"), 2)?.toUpperCase()
    const countryName = sanitizeText(requestHeaders.get("x-vercel-ip-country-name"), 120)
    const latitude = parseCoordinate(requestHeaders.get("x-vercel-ip-latitude"), -90, 90)
    const longitude = parseCoordinate(requestHeaders.get("x-vercel-ip-longitude"), -180, 180)
    const timezone = sanitizeTimezone(requestHeaders.get("x-vercel-ip-timezone"))

    const payload: IpLocationResponse = {}
    if (city) {
        payload.city = city
    }
    if (countryName) {
        payload.country_name = countryName
    }
    if (countryCode) {
        payload.country = countryCode
    }
    if (latitude !== undefined) {
        payload.latitude = latitude
    }
    if (longitude !== undefined) {
        payload.longitude = longitude
    }
    if (timezone) {
        payload.timezone = timezone
    }

    return NextResponse.json(payload, {
        headers: {
            "Cache-Control": NO_STORE_CACHE_CONTROL,
        },
    })
}
