export type TireSetup = "UNKNOWN" | "SUMMER" | "WINTER" | "ALL_SEASON"

export type GeoLocation = {
    id: string;
    name: string;
    country: string;
    admin1?: string;
    latitude: number;
    longitude: number;
    timezone: string;
}

export type WeatherField = "tempMeanC" | "tempMinC" | "snowfallCm" | "weatherCode"
export type SignalKind = "FREEZING_AIR" | "FREEZING_PRECIPITATION" | "SNOW" | "LIGHT_SNOW" | "NEAR_FREEZING"

export type ForecastSignal = {
    date: string;
    kind: SignalKind;
    field: WeatherField;
    value: number;
    confirmed: boolean;
}

export type DailyWeatherPoint = {
    date: string;
    tempMeanC: number | null;
    tempMinC: number | null;
    snowfallCm: number | null;
    weatherCode: number | null;
    source: "FORECAST" | "SEASONAL";
    conflicts?: WeatherField[];
    invalidFields?: WeatherField[];
    unconfirmedSignals?: ForecastSignal[];
}

export type WeatherSeries = {
    locationId: string;
    history: DailyWeatherPoint[];
    forecast: DailyWeatherPoint[];
    fetchedAt: string;
    timezone: string;
    seasonalAvailable: boolean;
    simulated?: boolean;
}

export type AssessmentState =
    | "UNAVAILABLE" | "REFRESH_REQUIRED" | "WINTER_PRECAUTION" | "VERIFY_WARNING"
    | "COOL_TREND" | "WATCH_OUTLOOK" | "MIXED" | "SUMMER_CANDIDATE" | "INSUFFICIENT"

export type RefreshOutcome = "SUCCESS" | "FAILURE"
export type DatePeriod = { from: string; to: string }

export type RecommendationResult = {
    state: AssessmentState;
    today?: string;
    assessedThrough?: string;
    fetchedAt: string;
    freshness: "CURRENT" | "STALE" | "EXPIRED" | "INVALID";
    refreshOutcome: RefreshOutcome;
    clockSkew: boolean;
    days: DailyWeatherPoint[];
    signals: ForecastSignal[];
    missing: { date: string; fields: WeatherField[] }[];
    coldDays: number | null;
    outlookIncomplete: string[];
    dataIssues: { date: string; fields: WeatherField[]; kind: "INVALID" | "CONFLICT" }[];
    metadataValid: boolean;
}

export type TireAction = {
    kind: "PLAN_WINTER" | "CONSIDER_SUMMER" | "NO_CHANGE" | "WAIT" | "MONITOR" | "VERIFY" | "REFRESH" | "NO_ASSESSMENT" | "ALL_SEASON_INFO";
    setup: TireSetup;
    conditional: boolean;
    booking?: DatePeriod;
}
