import type { GeoLocation, RecommendationResult, TireSetup } from "@/types"
import { formatDateForLocale, type Locale } from "@/lib/i18n"
import { deriveTireAction } from "@/lib/recommendation/engine"
import { getPlannerMessages } from "@/lib/recommendation/messages"
import { addDays } from "@/lib/weather/dates"
import { isWinterPrecaution } from "@/lib/weather/normalize"

export default function RecommendationCard({ location, recommendation, setup, locale }: {
    location: GeoLocation;
    recommendation: RecommendationResult;
    setup: TireSetup;
    locale: Locale;
}) {
    const m = getPlannerMessages(locale)
    const action = deriveTireAction(recommendation, setup)
    const date = (value?: string) => formatDateForLocale(value, locale, m.missingValue)
    let headline = m.actions[action.kind]
    if (action.conditional && action.kind === "PLAN_WINTER") headline = m.conditionalWinter
    if (action.conditional && action.kind === "CONSIDER_SUMMER") headline = m.conditionalSummer
    if (action.kind === "NO_CHANGE" && (setup === "SUMMER" || setup === "WINTER")) headline = m.keepTires[setup]
    if (action.kind === "MONITOR" && setup === "SUMMER") {
        headline = recommendation.state === "WATCH_OUTLOOK" ? m.prepareWinter : m.waitWinter
    }
    const description = action.kind === "MONITOR" && setup === "SUMMER" && recommendation.state === "MIXED" && recommendation.coldDays !== null
        ? m.winterWaitReason(recommendation.coldDays)
        : m.assessments[recommendation.state]
    const todaySignal = recommendation.signals.some((signal) => signal.date === recommendation.today)
    const firstWinterSignal = recommendation.signals.find((signal) => isWinterPrecaution(signal) &&
        (recommendation.state === "VERIFY_WARNING" ? !signal.confirmed : signal.confirmed))
    const showFirstSignal = firstWinterSignal && ["WINTER_PRECAUTION", "VERIFY_WARNING", "WATCH_OUTLOOK"].includes(recommendation.state)
    const hasDataIssues = recommendation.missing.length > 0 || recommendation.dataIssues.length > 0 || recommendation.outlookIncomplete.length > 0
    // Keep detailed evidence available without repeating every daily warning on the card.
    const visibleSignals = recommendation.signals.filter((signal, index, all) => all.findIndex((other) =>
        other.kind === signal.kind && other.confirmed === signal.confirmed &&
        Boolean(recommendation.today && other.date >= addDays(recommendation.today, 7)) ===
        Boolean(recommendation.today && signal.date >= addDays(recommendation.today, 7)),
    ) === index)
    let fetched = m.missingValue
    try {
        if (Number.isFinite(Date.parse(recommendation.fetchedAt))) {
            fetched = new Intl.DateTimeFormat(locale === "pl" ? "pl-PL" : "en-GB", {
                timeZone: location.timezone, dateStyle: "short", timeStyle: "short",
            }).format(new Date(recommendation.fetchedAt))
        }
    } catch { /* Invalid metadata is explained in the assessment details. */ }

    return (
        <section className="resultCard" aria-label={m.city(location.name)} aria-live="polite" data-assessment={recommendation.state}>
            <h2>{headline}</h2>
            <p className="resultDescription">
                {recommendation.refreshOutcome === "FAILURE" ? m.refreshFailed : showFirstSignal ? (
                    <>{date(firstWinterSignal.date)}: {m.signals[firstWinterSignal.kind]}
                        {firstWinterSignal.field === "tempMinC" ? ` (${firstWinterSignal.value.toFixed(1)}°C)` : firstWinterSignal.field === "snowfallCm" ? ` (${firstWinterSignal.value} cm)` : ""}.
                        {!firstWinterSignal.confirmed && <> {m.unconfirmed}.</>}
                        {recommendation.state === "WATCH_OUTLOOK" && <> {m.outlook}.</>}
                    </>
                ) : description}
            </p>
            {recommendation.freshness !== "CURRENT" && <p className="resultNotice">{m.freshness[recommendation.freshness]}</p>}
            {todaySignal ? <p className="resultNotice">{m.todayWarning}</p>
                : action.kind === "PLAN_WINTER" && recommendation.state === "WINTER_PRECAUTION" && <p className="resultNotice">{m.winterTravel}</p>}
            {action.booking && (
                <div className="bookingPeriod">
                    <p>{m.booking}</p>
                    <strong>{date(action.booking.from)}{action.booking.to !== action.booking.from ? ` – ${date(action.booking.to)}` : ""}</strong>
                </div>
            )}
            {action.kind === "PLAN_WINTER" && !action.booking && !todaySignal && <p className="resultNotice">{m.incompleteTiming}</p>}
            {hasDataIssues && !["INSUFFICIENT", "VERIFY_WARNING", "UNAVAILABLE"].includes(recommendation.state) && <p className="resultNotice">{m.dataNotice}</p>}

            <details className="assessmentDetails">
                <summary>{m.details}</summary>
                <div className="assessmentDetailsContent">
                    {action.kind === "NO_CHANGE" && <p>{m.noChange}</p>}
                    {setup === "ALL_SEASON" && <p>{m.allSeason}</p>}
                    {recommendation.state === "SUMMER_CANDIDATE" && <p>{m.summerReason}</p>}
                    {recommendation.coldDays !== null && <p>{m.coldReason(recommendation.coldDays)}</p>}
                    {action.booking && <p>{m.bookingNote}</p>}
                    {recommendation.signals.length > 0 && (
                        <div>
                            <p className="whyTitle">{m.evidence}</p>
                            <ul className="reasons">
                                {visibleSignals.map((signal, index) => (
                                    <li key={`${signal.date}-${signal.kind}-${signal.field}-${index}`}>
                                        <strong>{date(signal.date)}</strong>: {m.signals[signal.kind]}
                                        {signal.field === "tempMinC" ? ` (${signal.value.toFixed(1)}°C)` : signal.field === "snowfallCm" ? ` (${signal.value} cm)` : ""}
                                        {!signal.confirmed && <> — {m.unconfirmed}</>}
                                        {recommendation.today && signal.date >= addDays(recommendation.today, 7) && <> — {m.outlook}</>}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {recommendation.missing.length > 0 && (
                        <div>
                            <p className="whyTitle">{m.missing}</p>
                            <ul className="reasons">
                                {recommendation.missing.map((item) => <li key={item.date}>{date(item.date)}: {item.fields.map((field) => m.fields[field]).join(", ")}</li>)}
                            </ul>
                        </div>
                    )}
                    {recommendation.dataIssues.length > 0 && (
                        <ul className="reasons">
                            {recommendation.dataIssues.map((issue) => <li key={`${issue.date}-${issue.kind}`}>{date(issue.date)}: {issue.kind === "INVALID" ? m.invalidData : m.conflictingData} — {issue.fields.map((field) => m.fields[field]).join(", ")}</li>)}
                        </ul>
                    )}
                    {recommendation.outlookIncomplete.length > 0 && <p>{m.outlookIncomplete} {recommendation.outlookIncomplete.map(date).join(", ")}</p>}
                    {!recommendation.metadataValid && <p>{m.metadataInvalid}</p>}
                    {recommendation.clockSkew && <p>{m.clockSkew}</p>}
                    <p>{m.retrieved}: {fetched}</p>
                    <p>{m.assessed}: {date(recommendation.today)} – {date(recommendation.assessedThrough)}</p>
                    <p>{m.forecastNote}</p>
                </div>
            </details>
        </section>
    )
}
