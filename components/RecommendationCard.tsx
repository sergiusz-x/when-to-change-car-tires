import type { GeoLocation, RecommendationResult } from "@/types"
import { formatDateForLocale, getTranslations, type Locale } from "@/lib/i18n"

type RecommendationCardProps = {
    location: GeoLocation;
    recommendation: RecommendationResult;
    locale: Locale;
}

function hasAnyMilestone(recommendation: RecommendationResult): boolean {
    return Boolean(
        recommendation.canStart.date ||
      recommendation.recommended.dateFrom ||
      recommendation.maxTime.date,
    )
}

export default function RecommendationCard({
    location,
    recommendation,
    locale,
}: RecommendationCardProps) {
    const messages = getTranslations(locale)
    const formatDate = (date?: string): string =>
        formatDateForLocale(date, locale, messages.common.notYetVisible)
    const milestonesFound = hasAnyMilestone(recommendation)

    return (
        <section className="resultCard" aria-live="polite">
            <p className="eyebrow">{messages.recommendation.forCity(location.name)}</p>
            <h2>
                {recommendation.targetTire === "WINTER"
                    ? messages.recommendation.recommendedWinter
                    : messages.recommendation.recommendedSummer}
            </h2>

            {!milestonesFound && (
                <p className="muted">{messages.recommendation.noTransitionVisible}</p>
            )}

            <div className="milestones">
                <div className="milestoneRow">
                    <span>{messages.recommendation.canStartFrom}</span>
                    <strong>{formatDate(recommendation.canStart.date)}</strong>
                </div>
                <div className="milestoneRow">
                    <span>{messages.recommendation.recommendedWindow}</span>
                    <strong>
                        {recommendation.recommended.dateFrom
                            ? `${formatDate(recommendation.recommended.dateFrom)} - ${formatDate(recommendation.recommended.dateTo)}`
                            : messages.common.notYetVisible}
                    </strong>
                </div>
                <div className="milestoneRow warning">
                    <span>{messages.recommendation.latestSafeDate}</span>
                    <strong>{formatDate(recommendation.maxTime.date)}</strong>
                </div>
            </div>

            <p className="confidence">
                {messages.recommendation.confidence}: {messages.confidence[recommendation.confidence]}
            </p>

            <div>
                <p className="whyTitle">{messages.recommendation.whyThisRecommendation}</p>
                <ul className="reasons">
                    {recommendation.reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                    ))}
                </ul>
            </div>
        </section>
    )
}
