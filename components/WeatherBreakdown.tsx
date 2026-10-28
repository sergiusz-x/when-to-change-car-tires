import type { RecommendationResult, WeatherSeries } from "@/types"
import { formatDateForLocale, type Locale } from "@/lib/i18n"
import { getPlannerMessages } from "@/lib/recommendation/messages"
import { normalizeDailyPoints } from "@/lib/weather/normalize"
import { addDays } from "@/lib/weather/dates"
import { SEASONAL_MEAN_C, TREND_DAYS } from "@/lib/recommendation/policy"

export default function WeatherBreakdown({ weather, recommendation, locale }: {
    weather: WeatherSeries;
    recommendation: RecommendationResult;
    locale: Locale;
}) {
    const m = getPlannerMessages(locale)
    const forecast = normalizeDailyPoints(weather.forecast)
        .filter((day) => !recommendation.today || day.date >= recommendation.today)
    const outlookStart = recommendation.today ? addDays(recommendation.today, TREND_DAYS) : undefined
    const groups = [
        { key: "near", title: m.forecast, days: forecast.filter((day) => day.source === "FORECAST" && (!outlookStart || day.date < outlookStart)) },
        { key: "outlook", title: m.outlook, days: forecast.filter((day) => day.source === "FORECAST" && outlookStart && day.date >= outlookStart) },
        { key: "seasonal", title: m.seasonal, days: forecast.filter((day) => day.source === "SEASONAL") },
    ]
    const formatDate = (value: string) => formatDateForLocale(value, locale, m.missingValue)
    const temperature = (value: number | null) => value === null ? "—" : `${value.toFixed(1)}°`
    const snowfall = (value: number | null) => value === null ? "—" : value > 0 && value < 0.1 ? "<0.1" : Number(value.toFixed(1)).toString()
    const percent = (value: number) => Math.max(0, Math.min(98, ((value + 12) / 34) * 100))

    return (
        <section className="weatherCard" aria-live="polite">
            <h3>{m.weatherTitle}</h3>
            {weather.simulated && <p className="warningText">{m.simulated}</p>}
            <p className="forecastUnits">{m.forecastHint}<span className="chartHint"> · {m.chartHint}</span></p>
            <div className="weatherList">
                {groups.filter((group) => group.days.length > 0).map((group) => (
                    <div className={`forecastGroup ${group.key === "seasonal" ? "forecastGroupLongRange" : ""}`} key={group.key}>
                        <p className="forecastGroupTitle">{group.title}</p>
                        {group.key === "seasonal" && <p className="forecastGroupHint">{m.seasonalHint}</p>}
                        <table className="weatherTable" aria-label={group.title}>
                            <colgroup>
                                <col className="weatherDateColumn" />
                                <col className="weatherChart" />
                                <col className="weatherTemperatureColumn" />
                                <col className="weatherTemperatureColumn" />
                                <col className="weatherSnowColumn" />
                            </colgroup>
                            <thead>
                                <tr>
                                    <th scope="col">{m.day}</th>
                                    <th scope="col" className="weatherChart"><span className="srOnly">{m.chartHint}</span></th>
                                    <th scope="col">{m.mean}</th>
                                    <th scope="col">{m.min}</th>
                                    <th scope="col">{m.snow}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {group.days.map((day) => {
                                    const signals = day.source === "FORECAST" ? recommendation.signals.filter((signal) => signal.date === day.date) : []
                                    const kinds = [...new Set(signals.map((signal) => signal.kind))]
                                    const missing = day.source === "FORECAST" && [day.tempMeanC, day.tempMinC, day.snowfallCm, day.weatherCode].some((value) => value === null)
                                    const hasNotice = kinds.length > 0 || missing
                                    return (
                                        <tr className={`weatherRow ${hasNotice ? "risk" : ""}`} key={day.date} data-date={day.date}>
                                            <td>
                                                <div className="weatherDate">
                                                    <time dateTime={day.date} aria-label={formatDate(day.date)}>
                                                        <span className="weatherDateFull">{formatDate(day.date)}</span>
                                                        <span className="weatherDateShort" aria-hidden="true">{locale === "pl" ? `${day.date.slice(8, 10)}.${day.date.slice(5, 7)}` : `${day.date.slice(8, 10)}/${day.date.slice(5, 7)}`}</span>
                                                    </time>
                                                    {day.date === recommendation.today && <span className="todayDot" title={m.today} aria-label={m.today} />}
                                                    {hasNotice && (
                                                        <details className="dayConditions" name="forecast-day-conditions">
                                                            <summary aria-label={`${formatDate(day.date)}: ${m.conditions}`} title={m.conditions}>
                                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M12 3 2 21h20L12 3Z" /><path d="M12 9v5m0 3v1" /></svg>
                                                            </summary>
                                                            <div className="dayConditionsContent">
                                                                <strong>{formatDate(day.date)}</strong>
                                                                {kinds.map((kind) => <p key={kind}>{m.signals[kind]}</p>)}
                                                                {signals.some((signal) => !signal.confirmed) && <p>{m.unconfirmed}</p>}
                                                                {missing && <p>{m.missing}</p>}
                                                            </div>
                                                        </details>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="weatherChart">
                                                <div className="tempBar" aria-hidden="true">
                                                    <span className="threshold" style={{ left: `${percent(SEASONAL_MEAN_C)}%` }} />
                                                    {day.tempMeanC !== null && <span className="meanMarker" style={{ left: `${percent(day.tempMeanC)}%` }} />}
                                                </div>
                                            </td>
                                            <td className="weatherMean" title={day.tempMeanC === null ? m.missingValue : `${day.tempMeanC.toFixed(1)}°C`}>{temperature(day.tempMeanC)}</td>
                                            <td title={day.tempMinC === null ? m.missingValue : `${day.tempMinC.toFixed(1)}°C`}>{temperature(day.tempMinC)}</td>
                                            <td title={day.source === "SEASONAL" || day.snowfallCm === null ? m.missingValue : `${day.snowfallCm} cm`}>{day.source === "SEASONAL" ? "—" : snowfall(day.snowfallCm)}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                ))}
                {!weather.seasonalAvailable && <p className="forecastGroupHint">{m.seasonalUnavailable}</p>}
            </div>
        </section>
    )
}
