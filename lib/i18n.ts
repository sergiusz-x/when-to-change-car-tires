import type { Confidence } from "@/types"

export const SUPPORTED_LOCALES = ["pl", "en"] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]
export const LOCALE_FLAGS: Record<Locale, string> = {
    pl: "/flags/pl.svg",
    en: "/flags/en.svg",
}

export const DEFAULT_LOCALE: Locale = "en"
export const LOCALE_STORAGE_KEY = "preferredLocale"

type Messages = {
    language: {
        label: string;
        ariaLabel: string;
        menuAriaLabel: string;
        optionCode: Record<Locale, string>;
        optionName: Record<Locale, string>;
    };
    header: {
        eyebrow: string;
        title: string;
    };
    meta: {
        title: string;
        description: string;
    };
    debug: {
        showPanel: string;
        controlsAriaLabel: string;
        title: string;
        reset: string;
        hide: string;
        enableOverrides: string;
        setupAriaLabel: string;
        transitionNow: string;
        transitionModeAriaLabel: string;
        summerToWinter: string;
        winterToSummer: string;
        generateMilestoneWindow: string;
        randomizeAndApply: string;
        activeTitle: string;
        activeDescription: string;
        chipMode: string;
        chipWindow: string;
        chipDate: string;
        chipYes: string;
        chipNo: string;
    };
    form: {
        cityLabel: string;
        cityPlaceholder: string;
        detectingCity: string;
        citySuggestionsAriaLabel: string;
        searchingCities: string;
        noCityFound: string;
        checking: string;
        showSummerRecommendation: string;
        showWinterRecommendation: string;
        showRecommendation: string;
        mechanismSummary: string;
        mechanismIntro: string;
        mechanismBullets: string[];
    };
    errors: {
        autoCityDetection: string;
        recommendationLoading: string;
    };
    emptyState: {
        title: string;
        description: string;
    };
    recommendation: {
        forCity: (city: string) => string;
        recommendedWinter: string;
        recommendedSummer: string;
        noTransitionVisible: string;
        canStartFrom: string;
        recommendedWindow: string;
        latestSafeDate: string;
        confidence: string;
        whyThisRecommendation: string;
    };
    weather: {
        title: string;
        overview: (days: number) => string;
        accuracyNote: string;
        canStartFrom: string;
        recommendedWindow: string;
        accurateSectionTitle: string;
        accurateSectionHint: string;
        longRangeSectionTitle: string;
        longRangeSectionHint: string;
        legendAriaLabel: string;
        legendForecastDay: string;
        legendInWindow: string;
        legendThreshold: string;
        legendMeanMarker: string;
    };
    common: {
        notYetVisible: string;
        notAvailable: string;
        minPrefix: string;
        unknownCountry: string;
    };
    confidence: Record<Confidence, string>;
    engine: {
        canStartPlanningFrom: (date: string) => string;
        noTransitionVisible: string;
        bestWindowBetween: (from: string, to: string) => string;
        notEnoughDataForWindow: string;
        latestSafeDate: (date: string) => string;
        noDeadlineVisible: string;
        tooLittleDataCanStart: string;
        tooLittleDataRecommended: string;
        tooLittleDataMaxTime: string;
    };
    reasons: {
        fiveDayAverage: (value: number) => string;
        daysBelow7In14: (days: number) => string;
        daysAbove7In14: (days: number) => string;
        frostNightsIn7: (nights: number) => string;
        tooLittleData: string;
    };
}

const MESSAGES: Record<Locale, Messages> = {
    pl: {
        language: {
            label: "Język",
            ariaLabel: "Przełącznik języka",
            menuAriaLabel: "Lista języków",
            optionCode: {
                pl: "PL",
                en: "EN",
            },
            optionName: {
                pl: "Polski",
                en: "Angielski",
            },
        },
        header: {
            eyebrow: "Planer wymiany opon",
            title: "Wybierz najlepszy moment na zmianę opon",
        },
        meta: {
            title: "Planer wymiany opon",
            description: "Pogodowe rekomendacje terminu wymiany opon letnich i zimowych.",
        },
        debug: {
            showPanel: "Pokaż panel debug",
            controlsAriaLabel: "Kontrolki debug",
            title: "Debug",
            reset: "Reset",
            hide: "Ukryj",
            enableOverrides: "Włącz nadpisywanie debug",
            setupAriaLabel: "Ustawienia debug",
            transitionNow: "Przejście teraz",
            transitionModeAriaLabel: "Tryb przejścia",
            summerToWinter: "Lato na zimę",
            winterToSummer: "Zima na lato",
            generateMilestoneWindow: "Generuj okno etapów",
            randomizeAndApply: "Losuj i zastosuj",
            activeTitle: "Tryb debug aktywny",
            activeDescription:
                "Symulowana pogoda jest generowana na podstawie opcji debug, realne temperatury są ignorowane.",
            chipMode: "Tryb",
            chipWindow: "Okno",
            chipDate: "Data",
            chipYes: "tak",
            chipNo: "nie",
        },
        form: {
            cityLabel: "Miasto",
            cityPlaceholder: "Zacznij wpisywać dowolne miasto na świecie",
            detectingCity: "Wykrywanie Twojego miasta...",
            citySuggestionsAriaLabel: "Podpowiedzi miast",
            searchingCities: "Szukanie miast...",
            noCityFound: "Nie znaleziono miasta. Spróbuj innej nazwy.",
            checking: "Sprawdzanie...",
            showSummerRecommendation: "Pokaż rekomendację na opony letnie",
            showWinterRecommendation: "Pokaż rekomendację na opony zimowe",
            showRecommendation: "Pokaż rekomendację",
            mechanismSummary: "Jak działa mechanizm rekomendacji?",
            mechanismIntro:
                "Aplikacja analizuje historię i prognozę temperatur dla Twojego miasta. Na tej podstawie wyznacza trzy daty: kiedy możesz zacząć planować, rekomendowane okno oraz najpóźniejszy bezpieczny termin.",
            mechanismBullets: [
                "Granica decyzji to 7°C średniej dobowej. Dla przejścia na zimowe szukamy ochłodzenia, a dla przejścia na letnie ocieplenia.",
                '"Możesz zacząć" pojawia się po 3 kolejnych dniach spełniających warunek sezonu (poniżej albo powyżej 7°C).',
                '"Rekomendowane okno" bierze pod uwagę średnią ruchomą z 5 dni oraz liczbę nocy z przymrozkiem w kolejnych 7 dniach.',
                '"Najpóźniejsza bezpieczna data" jest wyznaczana ostrzej: np. dla letnich opon wystarczy szybki mróz w 48 godzinach, żeby przyspieszyć wymianę.',
                "Poziom pewności zależy od spójności trendu na najbliższe 7 dni: liczby ciepłych lub chłodnych dni oraz przymrozków.",
            ],
        },
        errors: {
            autoCityDetection: "Nie udało się automatycznie wykryć Twojego miasta. Wybierz je ręcznie.",
            recommendationLoading: "Wystąpił błąd podczas pobierania rekomendacji.",
        },
        emptyState: {
            title: "Szybko i prosto",
            description: "Wybierz miasto i sprawdź okno wymiany opon na podstawie pogody.",
        },
        recommendation: {
            forCity: (city) => `Rekomendacja dla ${city}`,
            recommendedWinter: "Rekomendowane opony: zimowe",
            recommendedSummer: "Rekomendowane opony: letnie",
            noTransitionVisible:
                "Prognoza nie pokazuje wyraźnego okna zmiany. Ten typ opon pasuje do większości najbliższych dni.",
            canStartFrom: "Możesz zacząć od",
            recommendedWindow: "Rekomendowane okno",
            latestSafeDate: "Najpóźniejsza bezpieczna data",
            confidence: "Pewność",
            whyThisRecommendation: "Dlaczego taka rekomendacja",
        },
        weather: {
            title: "Przegląd pogody",
            overview: (days) =>
                `Średnia dobowa temperatura względem progu 7°C. Pokazujemy kolejne ${days} dni.`,
            accuracyNote:
                "Dni 1-16 są zwykle bardziej dokładne. Dni 17-46 to prognoza długoterminowa i może częściej się zmieniać.",
            canStartFrom: "Możesz zacząć od",
            recommendedWindow: "Rekomendowane okno",
            accurateSectionTitle: "Dni 1-16 (bardziej dokładne)",
            accurateSectionHint: "Ten zakres jest najbardziej wiarygodny do planowania terminu.",
            longRangeSectionTitle: "Dni 17-46 (mniej dokładne)",
            longRangeSectionHint: "Ten zakres traktuj jako orientacyjny trend temperatur.",
            legendAriaLabel: "Legenda przeglądu pogody",
            legendForecastDay: "Dzień prognozy",
            legendInWindow: "W rekomendowanym oknie",
            legendThreshold: "Próg 7°C",
            legendMeanMarker: "Wskaźnik średniej temperatury",
        },
        common: {
            notYetVisible: "Jeszcze niewidoczne",
            notAvailable: "Brak danych",
            minPrefix: "min",
            unknownCountry: "Nieznany",
        },
        confidence: {
            LOW: "NISKA",
            MEDIUM: "ŚREDNIA",
            HIGH: "WYSOKA",
        },
        engine: {
            canStartPlanningFrom: (date) => `Możesz zacząć planować od ${date}.`,
            noTransitionVisible: "W obecnej prognozie nie widać jeszcze zmiany sezonu.",
            bestWindowBetween: (from, to) => `Najlepszy czas na zmianę to okres ${from} - ${to}.`,
            notEnoughDataForWindow: "Za mało danych, aby wyznaczyć rekomendowane okno.",
            latestSafeDate: (date) => `Najpóźniejsza bezpieczna data to ${date}.`,
            noDeadlineVisible: "W obecnej prognozie nie widać terminu granicznego.",
            tooLittleDataCanStart: "Za mało danych pogodowych, aby oszacować datę rozpoczęcia planowania.",
            tooLittleDataRecommended: "Za mało danych pogodowych, aby oszacować rekomendowane okno.",
            tooLittleDataMaxTime: "Za mało danych pogodowych, aby oszacować najpóźniejszą bezpieczną datę.",
        },
        reasons: {
            fiveDayAverage: (value) => `Średnia temperatura z 5 dni: ${value.toFixed(1)}°C`,
            daysBelow7In14: (days) => `Dni poniżej 7°C w kolejnych 14 dniach: ${days}`,
            daysAbove7In14: (days) => `Dni powyżej 7°C w kolejnych 14 dniach: ${days}`,
            frostNightsIn7: (nights) => `Noce z przymrozkiem (<=0°C) w kolejnych 7 dniach: ${nights}`,
            tooLittleData: "Serwis pogodowy zwrócił za mało danych do stabilnej rekomendacji.",
        },
    },
    en: {
        language: {
            label: "Language",
            ariaLabel: "Language switch",
            menuAriaLabel: "Language list",
            optionCode: {
                pl: "PL",
                en: "EN",
            },
            optionName: {
                pl: "Polish",
                en: "English",
            },
        },
        header: {
            eyebrow: "Tire Change Planner",
            title: "Pick the best moment to switch tires",
        },
        meta: {
            title: "Tire Change Advisor",
            description: "Weather-based timing for summer and winter tire changes.",
        },
        debug: {
            showPanel: "Show Dev Debug",
            controlsAriaLabel: "Debug controls",
            title: "Dev debug",
            reset: "Reset",
            hide: "Hide",
            enableOverrides: "Enable debug overrides",
            setupAriaLabel: "Debug setup",
            transitionNow: "Transition now",
            transitionModeAriaLabel: "Transition mode",
            summerToWinter: "Summer to winter",
            winterToSummer: "Winter to summer",
            generateMilestoneWindow: "Generate milestone window",
            randomizeAndApply: "Randomize and apply",
            activeTitle: "Debug mode active",
            activeDescription:
                "Mock weather is generated from selected debug options, real temperatures are ignored.",
            chipMode: "Mode",
            chipWindow: "Window",
            chipDate: "Date",
            chipYes: "yes",
            chipNo: "no",
        },
        form: {
            cityLabel: "City",
            cityPlaceholder: "Start typing any city worldwide",
            detectingCity: "Detecting your city...",
            citySuggestionsAriaLabel: "City suggestions",
            searchingCities: "Searching cities...",
            noCityFound: "No city found. Try a different name.",
            checking: "Checking...",
            showSummerRecommendation: "Show summer recommendation",
            showWinterRecommendation: "Show winter recommendation",
            showRecommendation: "Show recommendation",
            mechanismSummary: "How does the recommendation engine work?",
            mechanismIntro:
                "The app analyzes weather history and forecast for your city. Based on that, it sets three dates: when you can start planning, the recommended window, and the latest safe date.",
            mechanismBullets: [
                "The decision threshold is a 7°C daily average. For winter tires we look for cooling, and for summer tires we look for warming.",
                '"You can start" appears after 3 consecutive days matching the season condition (below or above 7°C).',
                '"Recommended window" uses a 5-day rolling average and the number of frost nights in the next 7 days.',
                '"Latest safe date" is stricter: for example, for summer tires, a quick frost within 48 hours can move the deadline earlier.',
                "Confidence depends on trend consistency in the next 7 days: number of warm or cold days and frost nights.",
            ],
        },
        errors: {
            autoCityDetection: "Could not detect your city automatically. Please choose it manually.",
            recommendationLoading: "Something went wrong while loading recommendation.",
        },
        emptyState: {
            title: "Quick and simple",
            description: "Choose your city and get a clear weather-based window for switching tires.",
        },
        recommendation: {
            forCity: (city) => `Recommendation for ${city}`,
            recommendedWinter: "Recommended tires: Winter",
            recommendedSummer: "Recommended tires: Summer",
            noTransitionVisible:
                "The forecast shows no clear switch window. These tires fit most of the upcoming days.",
            canStartFrom: "You can start from",
            recommendedWindow: "Recommended window",
            latestSafeDate: "Latest safe date",
            confidence: "Confidence",
            whyThisRecommendation: "Why this recommendation",
        },
        weather: {
            title: "Weather overview",
            overview: (days) =>
                `Daily mean temperature compared with the 7°C threshold. Showing next ${days} days.`,
            accuracyNote:
                "Days 1-16 are usually more reliable. Days 17-46 are long-range forecast and may change more often.",
            canStartFrom: "Can start from",
            recommendedWindow: "Recommended window",
            accurateSectionTitle: "Days 1-16 (more accurate)",
            accurateSectionHint: "Use this range as the primary basis for planning your switch date.",
            longRangeSectionTitle: "Days 17-46 (less accurate)",
            longRangeSectionHint: "Use this range as a directional temperature trend.",
            legendAriaLabel: "Weather overview legend",
            legendForecastDay: "Forecast day",
            legendInWindow: "In recommended window",
            legendThreshold: "7°C threshold",
            legendMeanMarker: "Mean temperature marker",
        },
        common: {
            notYetVisible: "Not yet visible",
            notAvailable: "Not available",
            minPrefix: "min",
            unknownCountry: "Unknown",
        },
        confidence: {
            LOW: "LOW",
            MEDIUM: "MEDIUM",
            HIGH: "HIGH",
        },
        engine: {
            canStartPlanningFrom: (date) => `You can start planning from ${date}.`,
            noTransitionVisible: "No transition visible in the current forecast yet.",
            bestWindowBetween: (from, to) => `Best time to switch is between ${from} and ${to}.`,
            notEnoughDataForWindow: "Not enough data to determine a recommended window.",
            latestSafeDate: (date) => `Latest safe date is ${date}.`,
            noDeadlineVisible: "No deadline visible in the current forecast.",
            tooLittleDataCanStart: "Not enough weather data to estimate planning date.",
            tooLittleDataRecommended: "Not enough weather data to estimate a recommended window.",
            tooLittleDataMaxTime: "Not enough weather data to estimate the latest safe date.",
        },
        reasons: {
            fiveDayAverage: (value) => `5-day average temperature: ${value.toFixed(1)}°C`,
            daysBelow7In14: (days) => `Days below 7°C in next 14 days: ${days}`,
            daysAbove7In14: (days) => `Days above 7°C in next 14 days: ${days}`,
            frostNightsIn7: (nights) => `Frost nights (<=0°C) in next 7 days: ${nights}`,
            tooLittleData: "Weather service returned too little data for a stable recommendation.",
        },
    },
}

export function normalizeLocale(value: string | null | undefined): Locale | null {
    if (!value) {
        return null
    }

    const normalized = value.trim().toLowerCase()
    if (normalized.startsWith("pl")) {
        return "pl"
    }

    if (normalized.startsWith("en")) {
        return "en"
    }

    return null
}

export function detectLocaleFromNavigator(language: string | null | undefined): Locale {
    return normalizeLocale(language) ?? DEFAULT_LOCALE
}

export function detectLocaleFromCountry(countryCode: string | null | undefined): Locale | null {
    if (!countryCode) {
        return null
    }

    return countryCode.trim().toUpperCase() === "PL" ? "pl" : "en"
}

export function getTranslations(locale: Locale): Messages {
    return MESSAGES[locale] ?? MESSAGES[DEFAULT_LOCALE]
}

export function formatDateForLocale(date: string | undefined, locale: Locale, fallback: string): string {
    if (!date) {
        return fallback
    }

    const parsedDate = new Date(`${date}T12:00:00Z`)
    if (Number.isNaN(parsedDate.getTime())) {
        return fallback
    }

    const localeTag = locale === "pl" ? "pl-PL" : "en-GB"
    return new Intl.DateTimeFormat(localeTag, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(parsedDate)
}
