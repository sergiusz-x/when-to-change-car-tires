import type { GeoLocation, RecommendationResult, TireType } from "@/types"
import { formatDateForLocale, getTranslations, type Locale } from "@/lib/i18n"

type RecommendationCardProps = {
    location: GeoLocation;
    recommendation: RecommendationResult;
    currentTire: TireType;
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
    currentTire,
    locale,
}: RecommendationCardProps) {
    const messages = getTranslations(locale)
    const formatDate = (date?: string): string =>
        formatDateForLocale(date, locale, messages.common.notYetVisible)
    const milestonesFound = hasAnyMilestone(recommendation)

    return (
        <section className="resultCard" aria-live="polite">
            <p className="eyebrow">{messages.recommendation.forCity(location.name)}</p>
            <p className="muted compact">
                {currentTire === "WINTER"
                    ? messages.recommendation.currentSetupWinter
                    : messages.recommendation.currentSetupSummer}
            </p>

            {milestonesFound ? (
                <h2>
                    {recommendation.targetTire === "WINTER"
                        ? messages.recommendation.switchToWinter
                        : messages.recommendation.switchToSummer}
                </h2>
            ) : (
                <h2>
                    {currentTire === "WINTER" ? messages.recommendation.keepWinter : messages.recommendation.keepSummer}
                </h2>
            )}

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
