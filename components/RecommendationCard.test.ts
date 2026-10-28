import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import RecommendationCard from "@/components/RecommendationCard"
import WeatherBreakdown from "@/components/WeatherBreakdown"
import { computeRecommendation } from "@/lib/recommendation/engine"
import { getPlannerMessages } from "@/lib/recommendation/messages"
import { formatDateForLocale, type Locale } from "@/lib/i18n"
import { CITY, forecastDay, NOW, weatherFixture } from "@/tests/weatherFixtures"
import type { TireSetup, WeatherSeries } from "@/types"

const render = (weather: WeatherSeries, setup: TireSetup, locale: Locale, failed = false) => {
    const recommendation = computeRecommendation(weather, CITY, { now: NOW, refreshOutcome: failed ? "FAILURE" : "SUCCESS" })
    return renderToStaticMarkup(createElement(RecommendationCard, { location: CITY, recommendation, setup, locale }))
}

describe.each(["pl", "en"] as const)("driver copy in %s", (locale) => {
    const m = getPlannerMessages(locale)
    const frost = weatherFixture()
    frost.forecast[1].tempMinC = -2

    it("explains a mixed forecast as waiting for a winter change, with the actual cold-day count", () => {
        const weather = weatherFixture()
        weather.forecast[9].tempMinC = 3
        const html = render(weather, "SUMMER", locale)
        expect(html).toContain(`<h2>${m.waitWinter}</h2>`)
        expect(html).toContain(m.winterWaitReason(0))
        expect(html).not.toContain(m.booking)
        expect(render(weather, "UNKNOWN", locale)).not.toContain(m.waitWinter)
        expect(render(weather, "WINTER", locale)).toContain(m.actions.WAIT)
    })

    it("does not tell summer-tire users to wait when winter weather appears in the later outlook", () => {
        const weather = weatherFixture()
        weather.forecast[10].tempMinC = -2
        const html = render(weather, "SUMMER", locale)
        expect(html).toContain(`<h2>${m.prepareWinter}</h2>`)
        expect(html).not.toContain(m.waitWinter)
        expect(html).toContain(m.signals.FREEZING_AIR)
        expect(html).not.toContain(m.booking)
    })

    it("uses conditional advice for an unknown setup, with a same-day booking prompt for tomorrow's frost", () => {
        const html = render(frost, "UNKNOWN", locale)
        expect(html).toContain(m.conditionalWinter)
        expect(html).toContain(m.booking)
        expect(html).not.toContain("Latest safe")
        expect(html).not.toContain("bezpieczna data")
        expect(html).not.toContain(m.actions.CONSIDER_SUMMER)
    })

    it.each(["WINTER", "ALL_SEASON"] as const)("does not tell a %s user to book a winter change", (setup) => {
        const html = render(frost, setup, locale)
        expect(html).not.toContain(m.booking)
        expect(html).not.toContain(m.actions.PLAN_WINTER)
        expect(html).toContain(m.signals.FREEZING_AIR)
        if (setup === "WINTER") expect(html).toContain(`<h2>${m.keepTires.WINTER}</h2>`)
    })

    it("names the summer tires the user can retain without hiding the assessment details", () => {
        const html = render(weatherFixture(), "SUMMER", locale)
        expect(html).toContain(`<h2>${m.keepTires.SUMMER}</h2>`)
        expect(html.replaceAll("&#x27;", "'")).toContain(m.noChange)
        expect(html).not.toContain(m.booking)
    })

    it("does not retain a summer headline after refresh failure", () => {
        const html = render(weatherFixture(), "WINTER", locale, true)
        expect(html).toContain(m.actions.REFRESH)
        expect(html).toContain(m.refreshFailed)
        expect(html).not.toContain(m.actions.CONSIDER_SUMMER)
        expect(html).not.toContain(m.booking)
    })

    it("does not recommend a default tire when there is no forecast", () => {
        const html = render(weatherFixture({ forecast: [] }), "UNKNOWN", locale)
        expect(html).toContain(m.actions.NO_ASSESSMENT)
        expect(html).not.toContain(m.conditionalSummer)
        expect(html).not.toContain(m.conditionalWinter)
    })

    it("explains today's untimed signal without a booking date", () => {
        const today = weatherFixture()
        today.forecast[0].tempMinC = -1
        const html = render(today, "SUMMER", locale)
        expect(html.replaceAll("&#x27;", "'" )).toContain(m.todayWarning)
        expect(html).not.toContain(m.booking)
    })

    it("keeps all 46 forecast rows and labels seasonal context separately", () => {
        const weather = weatherFixture({ seasonalAvailable: true })
        weather.forecast.push(...Array.from({ length: 30 }, (_, index) => forecastDay(index + 16, { source: "SEASONAL", tempMeanC: null, tempMinC: null })))
        const recommendation = computeRecommendation(weather, CITY, { now: NOW, refreshOutcome: "SUCCESS" })
        const html = renderToStaticMarkup(createElement(WeatherBreakdown, { weather, recommendation, locale }))
        expect(html.match(/data-date=/g)).toHaveLength(46)
        expect(html).toContain(m.seasonalHint)
        expect(html).toContain(m.missingValue)
        expect(html).toContain(m.today)
    })
})

it("formats date keys independently of the viewer's timezone and rejects impossible dates", () => {
    expect(formatDateForLocale("2026-02-30", "pl", "missing")).toBe("missing")
    expect(formatDateForLocale("2026-10-23", "pl", "missing")).toBe("23.10.2026")
})
