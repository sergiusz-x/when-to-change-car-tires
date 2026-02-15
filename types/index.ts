export type TireType = "SUMMER" | "WINTER"

export type GeoLocation = {
    id: string;
    name: string;
    country: string;
    admin1?: string;
    latitude: number;
    longitude: number;
    timezone: string;
}

export type DailyWeatherPoint = {
    date: string;
    tempMeanC: number;
    tempMinC: number;
    accuracy?: "HIGH" | "LOW";
}

export type WeatherSeries = {
    history: DailyWeatherPoint[];
    forecast: DailyWeatherPoint[];
    fetchedAt: string;
    timezone: string;
}

export type Confidence = "LOW" | "MEDIUM" | "HIGH"

export type Milestone = {
    label: "CAN_START_PLANNING" | "RECOMMENDED_WINDOW" | "MAX_TIME";
    dateFrom?: string;
    dateTo?: string;
    date?: string;
    statusText: string;
}

export type RecommendationResult = {
    targetTire: TireType;
    canStart: Milestone;
    recommended: Milestone;
    maxTime: Milestone;
    confidence: Confidence;
    reasons: string[];
    computedAt: string;
}
