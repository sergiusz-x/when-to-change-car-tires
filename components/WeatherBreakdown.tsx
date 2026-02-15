import type { RecommendationResult, WeatherSeries } from "@/types"
import { formatDateForLocale, getTranslations, type Locale } from "@/lib/i18n"

type WeatherBreakdownProps = {
    weather: WeatherSeries;
    recommendation: RecommendationResult;
    locale: Locale;
}

function clampPercent(value: number): number {
    return Math.max(0, Math.min(100, value))
}

function meanToPercent(tempMeanC: number): number {
    const min = -12
    const max = 22
    return clampPercent(((tempMeanC - min) / (max - min)) * 100)
}

function isInsideWindow(date: string, from?: string, to?: string): boolean {
    if (!from || !to) {
        return false
    }

    return date >= from && date <= to
}

export default function WeatherBreakdown({
    weather,
    recommendation,
    locale,
}: WeatherBreakdownProps) {
    const messages = getTranslations(locale)
    const formatDate = (date: string | undefined, fallback: string = messages.common.notAvailable): string =>
        formatDateForLocale(date, locale, fallback)

    const daysToShow = weather.forecast.length
    const preview = weather.forecast.slice(0, daysToShow)
    const accurateForecast = preview.filter((day) => day.accuracy !== "LOW")
    const longRangeForecast = preview.filter((day) => day.accuracy === "LOW")

    const renderRows = (days: WeatherSeries["forecast"]) =>
        days.map((day) => {
            const coldDay = day.tempMeanC < 7
            const frost = day.tempMinC <= 0
            const inWindow = isInsideWindow(
                day.date,
                recommendation.recommended.dateFrom,
                recommendation.recommended.dateTo,
            )

            return (
                <div className={`weatherRow ${inWindow ? "window" : ""}`} key={day.date}>
                    <span className="weatherDate">{formatDate(day.date)}</span>
                    <div className="tempBar" aria-hidden>
                        <span className="threshold" />
                        <span className="meanMarker" style={{ left: `${meanToPercent(day.tempMeanC)}%` }} />
                    </div>
                    <span className={`tag meanTag ${coldDay ? "cold" : "warm"}`}>{day.tempMeanC.toFixed(1)}°C</span>
                    <span className={`tag minTag ${frost ? "frost" : "safe"}`}>
                        {messages.common.minPrefix} {day.tempMinC.toFixed(1)}°C
                    </span>
                </div>
            )
        })

    return (
        <section className="weatherCard" aria-live="polite">
            <h3>{messages.weather.title}</h3>
            <p className="muted">{messages.weather.overview(preview.length)}</p>
            <p className="muted compact weatherAccuracyNote">{messages.weather.accuracyNote}</p>
            <p className="muted compact">
                {messages.weather.canStartFrom} {formatDate(recommendation.canStart.date)} | {messages.weather.recommendedWindow}: {" "}
                {formatDate(recommendation.recommended.dateFrom)} - {" "}
                {formatDate(recommendation.recommended.dateTo)}
            </p>

            <div className="weatherLegend" aria-label={messages.weather.legendAriaLabel}>
                <span className="legendItem">
                    <span className="legendSwatch forecast" aria-hidden /> {messages.weather.legendForecastDay}
                </span>
                <span className="legendItem">
                    <span className="legendSwatch window" aria-hidden /> {messages.weather.legendInWindow}
                </span>
                <span className="legendItem">
                    <span className="legendSwatch threshold" aria-hidden /> {messages.weather.legendThreshold}
                </span>
                <span className="legendItem">
                    <span className="legendSwatch marker" aria-hidden /> {messages.weather.legendMeanMarker}
                </span>
            </div>

            <div className="weatherList">
                {accurateForecast.length > 0 && (
                    <div className="forecastGroup">
                        <p className="forecastGroupTitle">{messages.weather.accurateSectionTitle}</p>
                        <p className="muted compact">{messages.weather.accurateSectionHint}</p>
                        {renderRows(accurateForecast)}
                    </div>
                )}

                {longRangeForecast.length > 0 && (
                    <div className="forecastGroup forecastGroupLongRange">
                        <p className="forecastGroupTitle">{messages.weather.longRangeSectionTitle}</p>
                        <p className="muted compact">{messages.weather.longRangeSectionHint}</p>
                        {renderRows(longRangeForecast)}
                    </div>
                )}
            </div>
        </section>
    )
}
