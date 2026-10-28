import { isDateKey } from "@/lib/weather/dates"

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
    common: {
        notYetVisible: string;
        notAvailable: string;
        minPrefix: string;
        unknownCountry: string;
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
            title: "Kiedy zmienić opony?",
        },
        meta: {
            title: "Planer wymiany opon",
            description: "Sprawdź prognozę i zobacz, kiedy zmienić opony na letnie lub zimowe.",
        },
        debug: {
            showPanel: "Pokaż panel debug",
            controlsAriaLabel: "Ustawienia symulacji pogody",
            title: "Debug",
            reset: "Reset",
            hide: "Ukryj",
            enableOverrides: "Włącz symulację pogody",
            setupAriaLabel: "Ustawienia debug",
            transitionNow: "Kierunek zmiany",
            transitionModeAriaLabel: "Kierunek zmiany opon",
            summerToWinter: "Letnie na zimowe",
            winterToSummer: "Zimowe na letnie",
            generateMilestoneWindow: "Symuluj zmianę pogody",
            randomizeAndApply: "Losuj i zastosuj",
            activeTitle: "Tryb debug aktywny",
            activeDescription:
                "Widzisz symulowaną pogodę zgodną z ustawieniami testowymi. Rzeczywista prognoza nie jest używana.",
            chipMode: "Tryb",
            chipWindow: "Zmiana pogody",
            chipDate: "Data",
            chipYes: "tak",
            chipNo: "nie",
        },
        form: {
            cityLabel: "Miasto",
            cityPlaceholder: "Wpisz nazwę miasta",
            detectingCity: "Wykrywanie Twojego miasta...",
            citySuggestionsAriaLabel: "Podpowiedzi miast",
            searchingCities: "Szukanie miast...",
            noCityFound: "Nie znaleziono miasta. Spróbuj innej nazwy.",
            checking: "Sprawdzanie...",
            showSummerRecommendation: "Pokaż rekomendację na opony letnie",
            showWinterRecommendation: "Pokaż rekomendację na opony zimowe",
            showRecommendation: "Pokaż rekomendację",
            mechanismSummary: "Jak to obliczamy?",
            mechanismIntro:
                "Sprawdzamy temperatury, zimowe opady i kompletność prognozy. Zalecenie uwzględnia opony wybrane w formularzu.",
            mechanismBullets: [
                "Mróz, marznące opady i wyraźny opad śniegu w najbliższych dniach mają pierwszeństwo przed średnią temperaturą.",
                "5 z 7 dni ze średnią temperaturą poniżej 7°C to sygnał do planowania zmiany na zimowe, nawet bez przymrozków.",
                "Zmianę na letnie można rozważyć, gdy przez 7 dni średnia temperatura przekracza 7°C. Potrzebna jest też pełna prognoza na 10 dni, z temperaturą minimalną powyżej 4°C i bez oznak zimowej pogody.",
                "Zapowiedź zimowej pogody w dalszych dniach zwykłej prognozy wstrzymuje zalecenie zmiany na letnie.",
                "Pokazujemy braki, sprzeczne dane i błędy pobierania prognozy. Dalszy trend temperatur służy tylko do podglądu.",
                "Podany termin dotyczy umówienia wymiany. Nie gwarantuje bezpiecznej jazdy do tego dnia.",
            ],
        },
        errors: {
            autoCityDetection: "Nie udało się automatycznie wykryć Twojego miasta. Wybierz je ręcznie.",
            recommendationLoading: "Nie udało się pobrać prognozy. Spróbuj ponownie.",
        },
        emptyState: {
            title: "Zacznij od wyboru miasta",
            description: "Na podstawie prognozy sprawdzimy, czy warto już zmienić opony.",
        },
        common: {
            notYetVisible: "Jeszcze niewidoczne",
            notAvailable: "Brak danych",
            minPrefix: "min",
            unknownCountry: "Nieznany",
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
            title: "When to change your tires?",
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
            generateMilestoneWindow: "Simulate weather transition",
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
                "The app checks winter weather signals, temperature trends and forecast coverage. Advice depends on the tires you actually use.",
            mechanismBullets: [
                "Near-term freezing temperatures, freezing precipitation and substantial snowfall take priority over averages.",
                "5 out of 7 days with means below 7°C prompt winter planning, even without frost.",
                "Summer tires can be considered with 7 means above 7°C and a complete 10-day guard with minima above 4°C and no winter signals.",
                "Possible winter weather later in the ordinary forecast defers a new summer suggestion.",
                "Missing or conflicting data and failed refreshes are visible. Seasonal data is trend-only context.",
                "Suggested dates concern booking a change, not a guarantee that driving is safe until a deadline.",
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
        common: {
            notYetVisible: "Not yet visible",
            notAvailable: "Not available",
            minPrefix: "min",
            unknownCountry: "Unknown",
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
    if (!date || !isDateKey(date)) {
        return fallback
    }

    const parsedDate = new Date(`${date}T12:00:00Z`)
    if (Number.isNaN(parsedDate.getTime())) {
        return fallback
    }

    const localeTag = locale === "pl" ? "pl-PL" : "en-GB"
    return new Intl.DateTimeFormat(localeTag, {
        timeZone: "UTC",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(parsedDate)
}
