import type { AssessmentState, SignalKind, TireAction, TireSetup, WeatherField } from "@/types"
import type { Locale } from "@/lib/i18n"

type PlannerMessages = {
    setupLabel: string;
    setupCaption: string;
    checkingChange: Record<"SUMMER" | "WINTER", string>;
    changeSetup: string;
    setupDefaultHint: string;
    setups: Record<TireSetup, string>;
    actions: Record<TireAction["kind"], string>;
    assessments: Record<AssessmentState, string>;
    signals: Record<SignalKind, string>;
    fields: Record<WeatherField, string>;
    city: (name: string) => string;
    conditionalWinter: string;
    conditionalSummer: string;
    keepTires: Record<"SUMMER" | "WINTER", string>;
    waitWinter: string;
    prepareWinter: string;
    winterWaitReason: (coldDays: number) => string;
    winterTravel: string;
    todayWarning: string;
    allSeason: string;
    noChange: string;
    summerReason: string;
    coldReason: (days: number) => string;
    booking: string;
    bookingNote: string;
    missing: string;
    invalidData: string;
    conflictingData: string;
    incompleteTiming: string;
    outlookIncomplete: string;
    outlook: string;
    unconfirmed: string;
    metadataInvalid: string;
    clockSkew: string;
    retrieved: string;
    assessed: string;
    details: string;
    dataNotice: string;
    refreshFailed: string;
    freshness: Record<"CURRENT" | "STALE" | "EXPIRED" | "INVALID", string>;
    weatherTitle: string;
    forecast: string;
    forecastHint: string;
    chartHint: string;
    seasonal: string;
    seasonalHint: string;
    seasonalUnavailable: string;
    missingValue: string;
    today: string;
    min: string;
    mean: string;
    day: string;
    conditions: string;
    snow: string;
    evidence: string;
    forecastNote: string;
    simulated: string;
}

const MESSAGES: Record<Locale, PlannerMessages> = {
    pl: {
        setupLabel: "Jakie opony masz teraz?",
        setupCaption: "Opony",
        checkingChange: { SUMMER: "Sprawdzam zmianę na letnie", WINTER: "Sprawdzam zmianę na zimowe" },
        changeSetup: "zmień",
        setupDefaultHint: "Zakładamy, że dopiero planujesz sezonową wymianę. Jeśli masz inne opony, wybierz je tutaj.",
        setups: { UNKNOWN: "Nieokreślone", SUMMER: "Letnie", WINTER: "Zimowe", ALL_SEASON: "Wielosezonowe" },
        actions: {
            PLAN_WINTER: "Zaplanuj zmianę na zimowe",
            CONSIDER_SUMMER: "Możesz rozważyć zmianę na letnie",
            NO_CHANGE: "Na razie zostań przy obecnych oponach",
            WAIT: "Poczekaj ze zmianą na letnie",
            MONITOR: "Sprawdź prognozę ponownie za kilka dni",
            VERIFY: "Potwierdź warunki przed jazdą",
            REFRESH: "Sprawdź prognozę ponownie",
            NO_ASSESSMENT: "Brakuje danych, by wskazać termin wymiany",
            ALL_SEASON_INFO: "Wielosezonowe: sprawdź warunki przed jazdą",
        },
        assessments: {
            UNAVAILABLE: "Nie udało się potwierdzić danych dla tej lokalizacji.",
            REFRESH_REQUIRED: "Prognoza jest nieaktualna. Sprawdź ją ponownie przed decyzją.",
            WINTER_PRECAUTION: "Prognoza wskazuje warunki zimowe. Przygotuj odpowiednie opony przed jazdą.",
            VERIFY_WARNING: "Dane o możliwym mrozie lub zimowych opadach są sprzeczne.",
            COOL_TREND: "Przez większość najbliższego tygodnia prognozowana średnia temperatura jest poniżej 7°C.",
            WATCH_OUTLOOK: "Dalsza prognoza wskazuje możliwe warunki zimowe.",
            MIXED: "Prognoza nie daje jeszcze wyraźnego sygnału do zmiany opon. Sprawdź ją ponownie za kilka dni.",
            SUMMER_CANDIDATE: "Prognoza wskazuje ciepłe dni bez oznak zimowej pogody. Sprawdź ją ponownie przed wymianą.",
            INSUFFICIENT: "Brakuje części danych potrzebnych do sprawdzenia terminu wymiany.",
        },
        signals: { FREEZING_AIR: "Temperatura powietrza 0°C lub niższa", FREEZING_PRECIPITATION: "Marznące opady lub szadź", SNOW: "Wyraźny opad śniegu", LIGHT_SNOW: "Lekki lub śladowy opad śniegu", NEAR_FREEZING: "Temperatura bliska zeru (do 4°C)" },
        fields: { tempMeanC: "średnia temperatura", tempMinC: "temperatura minimalna", snowfallCm: "opad śniegu", weatherCode: "rodzaj pogody" },
        city: (name) => `Pogoda i opony: ${name}`,
        conditionalWinter: "Jeśli masz letnie opony, zaplanuj zmianę na zimowe",
        conditionalSummer: "Jeśli masz zimowe opony, możesz rozważyć zmianę na letnie.",
        keepTires: { SUMMER: "Na razie zostań przy letnich", WINTER: "Na razie zostań przy zimowych" },
        waitWinter: "Na razie poczekaj ze zmianą na zimowe",
        prepareWinter: "Przygotuj się do zmiany na zimowe",
        winterWaitReason: (days) => days === 0
            ? "W prognozie na najbliższe 7 dni średnia temperatura nie spada poniżej 7°C. Sprawdź ją ponownie za kilka dni."
            : `W ${days} z 7 najbliższych dni prognozowana średnia temperatura jest poniżej 7°C. Sprawdź prognozę ponownie za kilka dni.`,
        winterTravel: "Zadbaj o odpowiednie opony przed jazdą w tych warunkach.",
        todayWarning: "Dzisiejsza prognoza nie podaje godziny wystąpienia tych warunków. Sprawdź aktualną pogodę przed jazdą.",
        allSeason: "Nie znamy modelu ani stanu Twoich opon wielosezonowych, więc nie możemy ocenić ich możliwości. Sprawdź zalecenia producenta i ostrzeżenia pogodowe.",
        noChange: "Zalecenie dotyczy sezonowej wymiany opon. Nie ocenia ich stanu ani bezpieczeństwa jazdy.",
        summerReason: "W prognozie przez 7 kolejnych dni średnia temperatura przekracza 7°C. Przez 10 dni temperatura minimalna jest powyżej 4°C, bez oznak zimowej pogody w tych dniach.",
        coldReason: (days) => `Dni ze średnią temperaturą poniżej 7°C: ${days} z 7.`,
        booking: "Kiedy umówić wymianę",
        bookingNote: "Termin dotyczy umówienia wymiany. Nie gwarantuje wolnego miejsca w serwisie ani bezpiecznej jazdy do tego dnia. Sama rezerwacja nie oznacza wymiany opon.",
        missing: "Niepełne dane",
        invalidData: "Nieprawidłowe dane lub jednostki",
        conflictingData: "Sprzeczne dane",
        incompleteTiming: "Brakuje danych o wcześniejszych dniach, więc nie wskazujemy terminu wymiany. Sprawdź warunki przed jazdą.",
        outlookIncomplete: "Nie oceniamy warunków w tych dniach, bo brakuje danych:",
        outlook: "Dalsza prognoza — mniej pewna",
        unconfirmed: "Wymaga potwierdzenia",
        metadataInvalid: "Nie udało się potwierdzić lokalizacji, strefy czasowej lub daty pobrania.",
        clockSkew: "Czas pobrania jest nieco późniejszy niż czas na Twoim urządzeniu.",
        retrieved: "Pobrano",
        assessed: "Zakres oceny",
        details: "Szczegóły oceny",
        dataNotice: "Część danych jest niepełna lub sprzeczna.",
        refreshFailed: "Nie udało się pobrać nowych danych. Poniżej jest poprzednia prognoza.",
        freshness: { CURRENT: "Ostatnio pobrana prognoza", STALE: "Dane starsze niż 6 godzin", EXPIRED: "Dane starsze niż dobę", INVALID: "Nieprawidłowy czas pobrania" },
        weatherTitle: "Prognoza na kolejne dni",
        forecast: "Najbliższe dni",
        forecastHint: "Temperatury w °C · śnieg w cm",
        chartHint: "Kreska: 7°C",
        seasonal: "Dalszy trend temperatur",
        seasonalHint: "To orientacyjny trend temperatur. Nie wpływa na termin wymiany.",
        seasonalUnavailable: "Dalszy trend temperatur jest teraz niedostępny.",
        missingValue: "Brak danych",
        today: "Dzisiaj",
        min: "Min.",
        mean: "Średnia",
        day: "Dzień",
        conditions: "Warunki w tym dniu",
        snow: "Śnieg",
        evidence: "Co pokazuje prognoza",
        forecastNote: "Temperatura powietrza i prognoza opadów nie pokazują stanu jezdni. Progi pomagają zaplanować sezonową wymianę opon, ale nie gwarantują bezpieczeństwa jazdy.",
        simulated: "Dane symulowane",
    },
    en: {
        setupLabel: "Which tires do you currently use?",
        setupCaption: "Tires",
        checkingChange: { SUMMER: "Checking a change to summer tires", WINTER: "Checking a change to winter tires" },
        changeSetup: "change",
        setupDefaultHint: "We start from the previous set to assess a seasonal change. You can select your own tires.",
        setups: { UNKNOWN: "Not specified", SUMMER: "Summer", WINTER: "Winter", ALL_SEASON: "All-season" },
        actions: {
            PLAN_WINTER: "Plan your winter tires",
            CONSIDER_SUMMER: "Consider switching to summer tires",
            NO_CHANGE: "The forecast does not prompt a seasonal change",
            WAIT: "Wait before switching to summer tires",
            MONITOR: "Monitor the forecast before changing tires",
            VERIFY: "Verify conflicting reports before travel",
            REFRESH: "Refresh the forecast before deciding",
            NO_ASSESSMENT: "Not enough data to assess timing",
            ALL_SEASON_INFO: "Check conditions for your all-season tires",
        },
        assessments: {
            UNAVAILABLE: "The forecast data for this location could not be verified.",
            REFRESH_REQUIRED: "This forecast is out of date. Check it again before deciding.",
            WINTER_PRECAUTION: "The forecast contains a signal to prepare for winter conditions.",
            VERIFY_WARNING: "The forecast contains conflicting reports about possible winter conditions.",
            COOL_TREND: "Mean temperatures will be below 7°C for most of the coming week.",
            WATCH_OUTLOOK: "The longer outlook suggests a possible return of winter conditions.",
            MIXED: "Conditions are mixed. Check the forecast again in a few days.",
            SUMMER_CANDIDATE: "A warm period with no winter signals is forecast. Check again before changing tires.",
            INSUFFICIENT: "Some data needed for the assessment is missing.",
        },
        signals: { FREEZING_AIR: "Air temperature at or below 0°C", FREEZING_PRECIPITATION: "Freezing precipitation or depositing rime", SNOW: "Moderate or heavy snowfall", LIGHT_SNOW: "Light or trace snowfall", NEAR_FREEZING: "Near-freezing air temperature (up to 4°C)" },
        fields: { tempMeanC: "mean temperature", tempMinC: "minimum temperature", snowfallCm: "snowfall", weatherCode: "weather type" },
        city: (name) => `Weather and tires: ${name}`,
        conditionalWinter: "If you use summer tires, plan a winter set.",
        conditionalSummer: "If you use winter tires, consider switching to summer tires.",
        keepTires: { SUMMER: "Keep your summer tires for now", WINTER: "Keep your winter tires for now" },
        waitWinter: "Wait before switching to winter tires",
        prepareWinter: "Prepare to switch to winter tires",
        winterWaitReason: (days) => days === 0
            ? "No day in the coming week has a mean below 7°C. Check the forecast again in a few days."
            : `${days} of the coming 7 days have means below 7°C. Cool weather is not yet sustained through most of the week.`,
        winterTravel: "Arrange suitable tires before driving in these conditions.",
        todayWarning: "Today's forecast conditions may already have passed. Check current weather before driving.",
        allSeason: "The all-season label alone cannot establish your particular model's capability or tire condition. Check the manufacturer's guidance; weather warnings still apply.",
        noChange: "This concerns changing seasonal sets, not your tires' condition or whether driving is safe.",
        summerReason: "7 consecutive days with means above 7°C; 10 days with minima above 4°C and no winter signals in that period.",
        coldReason: (days) => `${days} out of 7 days with means below 7°C.`,
        booking: "Suggested booking period",
        bookingNote: "A planning suggestion, not a safe-driving deadline or a guarantee of workshop availability. Booking is not completing a tire change.",
        missing: "Incomplete data",
        invalidData: "Invalid data or units",
        conflictingData: "Conflicting data",
        incompleteTiming: "The forecast is incomplete, so no date is suggested. Check conditions before driving.",
        outlookIncomplete: "The later outlook is incomplete; conditions are not assessed for these dates:",
        outlook: "Longer outlook — less certain",
        unconfirmed: "Needs verification",
        metadataInvalid: "The location, timezone or retrieval timestamp could not be verified.",
        clockSkew: "The retrieval time is slightly ahead of this device's clock.",
        retrieved: "Retrieved",
        assessed: "Assessment range",
        details: "Assessment details",
        dataNotice: "Some forecast data is missing or conflicting.",
        refreshFailed: "New data could not be retrieved. The previous forecast is shown below.",
        freshness: { CURRENT: "Last retrieved forecast", STALE: "Data older than 6 hours", EXPIRED: "Data older than 24 hours", INVALID: "Invalid retrieval timestamp" },
        weatherTitle: "Forecast for the coming days",
        forecast: "Coming days",
        forecastHint: "Temperatures in °C · snow in cm",
        chartHint: "Line: 7°C",
        seasonal: "Long-range temperature trend",
        seasonalHint: "Tentative context. This range does not determine switching dates.",
        seasonalUnavailable: "The long-range temperature trend is currently unavailable.",
        missingValue: "Not available",
        today: "Today",
        min: "Min.",
        mean: "Mean",
        day: "Day",
        conditions: "Conditions for this day",
        snow: "Snow",
        evidence: "Forecast signals",
        forecastNote: "Air temperature and precipitation forecasts do not measure road conditions. These thresholds support seasonal planning, not a guarantee of safety.",
        simulated: "Simulated data",
    },
}

export function getPlannerMessages(locale: Locale): PlannerMessages {
    return MESSAGES[locale]
}
