"use client"

import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import RecommendationCard from "@/components/RecommendationCard"
import SeasonBackground from "@/components/SeasonBackground"
import WeatherBreakdown from "@/components/WeatherBreakdown"
import {
    DEFAULT_LOCALE,
    LOCALE_FLAGS,
    LOCALE_STORAGE_KEY,
    SUPPORTED_LOCALES,
    detectLocaleFromCountry,
    detectLocaleFromNavigator,
    getTranslations,
    normalizeLocale,
    type Locale,
} from "@/lib/i18n"
import {
    applyDebugWeatherOverrides,
    parseDebugSettings,
} from "@/lib/debug/overrides"
import type { DebugTransitionMode } from "@/lib/debug/overrides"
import { computeRecommendation } from "@/lib/recommendation/engine"
import { inferRecommendedTire } from "@/lib/recommendation/inferRecommendedTire"
import { fetchWeatherSeries, searchCities } from "@/lib/weather/openMeteoClient"
import type { GeoLocation, TireType, WeatherSeries } from "@/types"

type IpLocationResponse = {
    city?: string;
    country_name?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
}

type UiErrorKey = "AUTO_CITY_DETECTION" | "RECOMMENDATION_LOADING"

const MAX_CITY_QUERY_LENGTH = 80

function isFiniteCoordinate(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value)
}

function isValidLatitude(value: unknown): value is number {
    return isFiniteCoordinate(value) && value >= -90 && value <= 90
}

function isValidLongitude(value: unknown): value is number {
    return isFiniteCoordinate(value) && value >= -180 && value <= 180
}

function safeTimezone(value: unknown): string {
    if (typeof value !== "string" || value.trim().length === 0) {
        return "UTC"
    }

    try {
        new Intl.DateTimeFormat("en-US", { timeZone: value.trim() }).format(new Date())
        return value.trim()
    } catch {
        return "UTC"
    }
}

function HomeContent() {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const manualCityChangeRef = useRef(false)
    const localeManuallySelectedRef = useRef(false)
    const languageMenuRef = useRef<HTMLDivElement | null>(null)
    const [query, setQuery] = useState("")
    const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE)
    const [cityOptions, setCityOptions] = useState<GeoLocation[]>([])
    const [selectedCity, setSelectedCity] = useState<GeoLocation | null>(null)
    const [currentTire, setCurrentTire] = useState<TireType | null>(null)
    const [weather, setWeather] = useState<WeatherSeries | null>(null)
    const [loadingAutoCity, setLoadingAutoCity] = useState(true)
    const [autoCityError, setAutoCityError] = useState<UiErrorKey | null>(null)
    const [loadingCities, setLoadingCities] = useState(false)
    const [loadingResult, setLoadingResult] = useState(false)
    const [error, setError] = useState<UiErrorKey | null>(null)
    const [devPanelVisible, setDevPanelVisible] = useState(true)
    const [languageMenuOpen, setLanguageMenuOpen] = useState(false)
    const messages = useMemo(() => getTranslations(locale), [locale])

    const recommendation = useMemo(() => {
        if (!weather || !currentTire) {
            return null
        }

        return computeRecommendation(weather, currentTire, locale)
    }, [weather, currentTire, locale])

    const isDev = process.env.NODE_ENV === "development"
    const debugSettings = useMemo(
        () =>
            parseDebugSettings(new URLSearchParams(searchParams.toString()), {
                enabled: isDev,
            }),
        [isDev, searchParams],
    )
    const debugChips = useMemo(() => {
        if (!debugSettings.active) {
            return []
        }

        const modeLabel =
            debugSettings.mode === "SUMMER_TO_WINTER" ? messages.debug.summerToWinter : messages.debug.winterToSummer

        const chips = [
            `${messages.debug.chipMode}: ${modeLabel}`,
            `${messages.debug.chipWindow}: ${debugSettings.hasWindow ? messages.debug.chipYes : messages.debug.chipNo}`,
        ]

        if (debugSettings.dateOverride) {
            chips.push(`${messages.debug.chipDate}: ${debugSettings.dateOverride}`)
        }

        return chips
    }, [debugSettings, messages.debug])

    useEffect(() => {
        if (typeof window === "undefined") {
            return
        }

        const savedLocale = normalizeLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY))
        if (savedLocale) {
            localeManuallySelectedRef.current = true
            setLocale(savedLocale)
            return
        }

        setLocale(detectLocaleFromNavigator(window.navigator.language))
    }, [])

    useEffect(() => {
        if (typeof document === "undefined") {
            return
        }

        document.documentElement.lang = locale
    }, [locale])

    useEffect(() => {
        if (typeof document === "undefined") {
            return
        }

        document.title = messages.meta.title

        const descriptionTag = document.querySelector('meta[name="description"]')
        if (descriptionTag) {
            descriptionTag.setAttribute("content", messages.meta.description)
        }
    }, [messages.meta.description, messages.meta.title])

    useEffect(() => {
        if (typeof document === "undefined") {
            return
        }

        const handlePointerDown = (event: PointerEvent) => {
            if (!languageMenuRef.current) {
                return
            }

            if (!languageMenuRef.current.contains(event.target as Node)) {
                setLanguageMenuOpen(false)
            }
        }

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setLanguageMenuOpen(false)
            }
        }

        document.addEventListener("pointerdown", handlePointerDown)
        document.addEventListener("keydown", handleEscape)

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown)
            document.removeEventListener("keydown", handleEscape)
        }
    }, [])

    useEffect(() => {
        if (!isDev || typeof window === "undefined") {
            return
        }

        const savedValue = window.localStorage.getItem("devDebugPanelVisible")
        if (savedValue === "0") {
            setDevPanelVisible(false)
        }
    }, [isDev])

    useEffect(() => {
        if (!isDev || typeof window === "undefined") {
            return
        }

        window.localStorage.setItem("devDebugPanelVisible", devPanelVisible ? "1" : "0")
    }, [devPanelVisible, isDev])

    const updateSearchParams = (updates: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString())

        Object.entries(updates).forEach(([key, value]) => {
            if (!value) {
                params.delete(key)
            } else {
                params.set(key, value)
            }
        })

        const queryString = params.toString()
        router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false })
    }

    const setLanguage = (nextLocale: Locale) => {
        localeManuallySelectedRef.current = true
        setLocale(nextLocale)
        setLanguageMenuOpen(false)

        if (typeof window !== "undefined") {
            window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale)
        }
    }

    const renderLocaleFlag = (targetLocale: Locale) => {
        return (
            <span className={`languageFlagImage ${targetLocale}`} aria-hidden>
                <Image
                    className="languageFlagIcon"
                    src={LOCALE_FLAGS[targetLocale]}
                    alt=""
                    width={20}
                    height={14}
                    sizes="20px"
                />
            </span>
        )
    }

    const randomInt = (min: number, max: number): number => {
        return Math.floor(Math.random() * (max - min + 1)) + min
    }

    const randomDateByMode = (mode: DebugTransitionMode): string => {
        const year = new Date().getFullYear()

        if (mode === "SUMMER_TO_WINTER") {
            const month = String(randomInt(9, 11)).padStart(2, "0")
            const day = String(randomInt(1, 30)).padStart(2, "0")
            return `${year}-${month}-${day}`
        }

        const month = String(randomInt(2, 4)).padStart(2, "0")
        const day = String(randomInt(1, 28)).padStart(2, "0")
        return `${year}-${month}-${day}`
    }

    const resetDebug = () => {
        updateSearchParams({
            debug: null,
            debugMode: null,
            debugHasWindow: null,
            debugDate: null,
            debugSeed: null,
        })
    }

    const enableDebug = () => {
        const mode: DebugTransitionMode = "SUMMER_TO_WINTER"
        updateSearchParams({
            debug: "1",
            debugMode: mode.toLowerCase(),
            debugHasWindow: "1",
            debugDate: randomDateByMode(mode),
            debugSeed: String(Date.now()),
        })
    }

    const setDebugMode = (mode: DebugTransitionMode) => {
        updateSearchParams({
            debug: "1",
            debugMode: mode.toLowerCase(),
            debugDate: randomDateByMode(mode),
            debugSeed: String(Date.now() + randomInt(1, 5000)),
        })
    }

    const setDebugHasWindow = (enabled: boolean) => {
        updateSearchParams({
            debug: "1",
            debugHasWindow: enabled ? "1" : "0",
            debugSeed: String(Date.now() + randomInt(1, 5000)),
        })
    }

    const randomizeDebug = () => {
        if (!debugSettings.active) {
            return
        }

        updateSearchParams({
            debug: "1",
            debugMode: debugSettings.mode.toLowerCase(),
            debugHasWindow: debugSettings.hasWindow ? "1" : "0",
            debugDate: randomDateByMode(debugSettings.mode),
            debugSeed: String(Date.now() + randomInt(1, 100000)),
        })
    }

    useEffect(() => {
        let cancelled = false
        const controller = new AbortController()
        const normalizedQuery = query.trim().slice(0, MAX_CITY_QUERY_LENGTH)

        if (normalizedQuery.length < 2) {
            setCityOptions([])
            setLoadingCities(false)
            return
        }

        setLoadingCities(true)
        const timeout = setTimeout(async () => {
            try {
                const results = await searchCities(normalizedQuery, locale, controller.signal)
                if (!cancelled) {
                    setCityOptions(results)
                }
            } catch (error) {
                if (error instanceof DOMException && error.name === "AbortError") {
                    return
                }

                if (!cancelled) {
                    setCityOptions([])
                }
            } finally {
                if (!cancelled) {
                    setLoadingCities(false)
                }
            }
        }, 300)

        return () => {
            cancelled = true
            controller.abort()
            clearTimeout(timeout)
        }
    }, [query, locale])

    useEffect(() => {
        let cancelled = false
        const controller = new AbortController()

        const detectCityFromIp = async () => {
            try {
                const response = await fetch("/api/ip-location", {
                    cache: "no-store",
                    signal: controller.signal,
                })
                if (!response.ok) {
                    throw new Error("Unable to detect city by IP.")
                }

                const ipData = (await response.json()) as IpLocationResponse

                if (!cancelled && !localeManuallySelectedRef.current) {
                    const localeFromCountry = detectLocaleFromCountry(ipData.country)
                    if (localeFromCountry) {
                        setLocale(localeFromCountry)
                    }
                }

                if (
                    cancelled ||
          manualCityChangeRef.current ||
          !ipData.city ||
          !isValidLatitude(ipData.latitude) ||
          !isValidLongitude(ipData.longitude)
                ) {
                    return
                }

                const detectedCity: GeoLocation = {
                    id: `ip-${ipData.city}-${ipData.country ?? "unknown"}`,
                    name: ipData.city,
                    country:
            ipData.country_name ??
            ipData.country ??
            getTranslations(detectLocaleFromCountry(ipData.country) ?? DEFAULT_LOCALE).common.unknownCountry,
                    latitude: ipData.latitude,
                    longitude: ipData.longitude,
                    timezone: safeTimezone(ipData.timezone),
                }

                setSelectedCity(detectedCity)
                setQuery(`${detectedCity.name}, ${detectedCity.country}`)
                setAutoCityError(null)
            } catch (error) {
                if (error instanceof DOMException && error.name === "AbortError") {
                    return
                }

                if (!cancelled) {
                    setAutoCityError("AUTO_CITY_DETECTION")
                }
            } finally {
                if (!cancelled) {
                    setLoadingAutoCity(false)
                }
            }
        }

        detectCityFromIp()

        return () => {
            cancelled = true
            controller.abort()
        }
    }, [])

    const canRun = useMemo(() => selectedCity !== null, [selectedCity])

    const handleSubmit = async () => {
        if (!selectedCity) {
            return
        }

        setLoadingResult(true)
        setError(null)

        try {
            const weatherData = await fetchWeatherSeries(selectedCity)
            const weatherForRecommendation = applyDebugWeatherOverrides(weatherData, debugSettings)

            const recommendedTire = inferRecommendedTire(weatherForRecommendation)
            const currentTireToUse = debugSettings.active
                ? debugSettings.mode === "SUMMER_TO_WINTER"
                    ? "SUMMER"
                    : "WINTER"
                : recommendedTire === "WINTER"
                    ? "SUMMER"
                    : "WINTER"

            setCurrentTire(currentTireToUse)
            setWeather(weatherForRecommendation)
        } catch {
            setError("RECOMMENDATION_LOADING")

            setCurrentTire(null)
            setWeather(null)
        } finally {
            setLoadingResult(false)
        }
    }

    return (
        <>
            <SeasonBackground />
            <div className="pageShell">
                <div className="languageMenu" ref={languageMenuRef}>
                    <button
                        type="button"
                        className="languageMenuTrigger"
                        aria-label={messages.language.ariaLabel}
                        aria-haspopup="menu"
                        aria-expanded={languageMenuOpen}
                        onClick={() => setLanguageMenuOpen((current) => !current)}
                    >
                        {renderLocaleFlag(locale)}
                        <span className="languageTriggerCode">{messages.language.optionCode[locale]}</span>
                        <span className="languageTriggerChevron" aria-hidden>
                            ▾
                        </span>
                    </button>

                    {languageMenuOpen && (
                        <div className="languageMenuList" role="menu" aria-label={messages.language.menuAriaLabel}>
                            {SUPPORTED_LOCALES.map((availableLocale) => (
                                <button
                                    key={availableLocale}
                                    type="button"
                                    role="menuitem"
                                    className={`languageMenuItem ${locale === availableLocale ? "active" : ""}`}
                                    onClick={() => setLanguage(availableLocale)}
                                >
                                    {renderLocaleFlag(availableLocale)}
                                    <span>{messages.language.optionCode[availableLocale]}</span>
                                    <small>{messages.language.optionName[availableLocale]}</small>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <header className="pageHeader">
                    <div className="pageHeaderInner">
                        <div>
                            <p className="eyebrow">{messages.header.eyebrow}</p>
                            <h1>{messages.header.title}</h1>
                        </div>
                    </div>
                </header>

                {isDev && !devPanelVisible && (
                    <button type="button" className="devPanelToggle" onClick={() => setDevPanelVisible(true)}>
                        {messages.debug.showPanel}
                    </button>
                )}

                {isDev && devPanelVisible && (
                    <aside className="devPanel" aria-label={messages.debug.controlsAriaLabel}>
                        <div className="devPanelHead">
                            <p className="devPanelTitle">{messages.debug.title}</p>
                            <div className="devPanelActions">
                                <button type="button" className="devResetButton" onClick={resetDebug}>
                                    {messages.debug.reset}
                                </button>
                                <button type="button" className="devHideButton" onClick={() => setDevPanelVisible(false)}>
                                    {messages.debug.hide}
                                </button>
                            </div>
                        </div>

                        <label className="devField devSwitch">
                            <input
                                type="checkbox"
                                checked={debugSettings.active}
                                onChange={(event) => (event.target.checked ? enableDebug() : resetDebug())}
                            />
                            <span>{messages.debug.enableOverrides}</span>
                        </label>

                        <div className="devPresetBlock" aria-label={messages.debug.setupAriaLabel}>
                            <p className="devSectionTitle">{messages.debug.transitionNow}</p>
                            <div className="devPresetList" role="group" aria-label={messages.debug.transitionModeAriaLabel}>
                                <button
                                    type="button"
                                    className={`devPresetButton ${debugSettings.mode === "SUMMER_TO_WINTER" ? "active" : ""}`}
                                    disabled={!debugSettings.active}
                                    onClick={() => setDebugMode("SUMMER_TO_WINTER")}
                                >
                                    {messages.debug.summerToWinter}
                                </button>
                                <button
                                    type="button"
                                    className={`devPresetButton ${debugSettings.mode === "WINTER_TO_SUMMER" ? "active" : ""}`}
                                    disabled={!debugSettings.active}
                                    onClick={() => setDebugMode("WINTER_TO_SUMMER")}
                                >
                                    {messages.debug.winterToSummer}
                                </button>
                            </div>

                            <label className="devField devSwitch">
                                <input
                                    type="checkbox"
                                    checked={debugSettings.hasWindow}
                                    disabled={!debugSettings.active}
                                    onChange={(event) => setDebugHasWindow(event.target.checked)}
                                />
                                <span>{messages.debug.generateMilestoneWindow}</span>
                            </label>

                            <button
                                type="button"
                                className="devRandomButton"
                                disabled={!debugSettings.active}
                                onClick={randomizeDebug}
                            >
                                {messages.debug.randomizeAndApply}
                            </button>
                        </div>
                    </aside>
                )}

                {debugSettings.active && (
                    <section className="debugCard" aria-live="polite">
                        <p className="debugTitle">{messages.debug.activeTitle}</p>
                        <p className="muted compact">{messages.debug.activeDescription}</p>
                        <p className="debugChips">{debugChips.join(" | ")}</p>
                    </section>
                )}

                <main className="mainPanel">
                    <section className="formCard">
                        <label className="fieldLabel" htmlFor="citySearch">
                            {messages.form.cityLabel}
                        </label>
                        <input
                            id="citySearch"
                            type="text"
                            value={query}
                            placeholder={messages.form.cityPlaceholder}
                            onChange={(event) => {
                                manualCityChangeRef.current = true
                                setQuery(event.target.value.slice(0, MAX_CITY_QUERY_LENGTH))
                                setSelectedCity(null)
                                setAutoCityError(null)
                            }}
                            autoComplete="off"
                        />

                        {loadingAutoCity && <p className="helperText">{messages.form.detectingCity}</p>}
                        {!loadingAutoCity && autoCityError && <p className="errorText">{messages.errors.autoCityDetection}</p>}

                        {query.trim().length >= 2 && !selectedCity && (
                            <div className="autocompletePanel" role="listbox" aria-label={messages.form.citySuggestionsAriaLabel}>
                                {loadingCities && <p className="helperText">{messages.form.searchingCities}</p>}
                                {!loadingCities && cityOptions.length === 0 && (
                                    <p className="helperText">{messages.form.noCityFound}</p>
                                )}
                                {!loadingCities &&
                  cityOptions.map((option) => (
                      <button
                          className="suggestionButton"
                          key={option.id}
                          type="button"
                          onClick={() => {
                              manualCityChangeRef.current = true
                              setSelectedCity(option)
                              setQuery(`${option.name}, ${option.country}`)
                              setAutoCityError(null)
                          }}
                      >
                          {option.name}
                          {option.admin1 ? `, ${option.admin1}` : ""}, {option.country}
                      </button>
                  ))}
                            </div>
                        )}

                        <button
                            type="button"
                            className="primaryAction"
                            disabled={!canRun || loadingResult}
                            onClick={handleSubmit}
                        >
                            {loadingResult ? messages.form.checking : messages.form.showRecommendation}
                        </button>

                        <details className="mechanismDetails">
                            <summary className="mechanismToggle">{messages.form.mechanismSummary}</summary>
                            <div className="mechanismContent">
                                <p>{messages.form.mechanismIntro}</p>
                                <ul>
                                    {messages.form.mechanismBullets.map((bullet) => (
                                        <li key={bullet}>{bullet}</li>
                                    ))}
                                </ul>
                            </div>
                        </details>

                        {error && <p className="errorText">{messages.errors.recommendationLoading}</p>}
                    </section>

                    {recommendation && selectedCity && currentTire && (
                        <RecommendationCard
                            location={selectedCity}
                            recommendation={recommendation}
                            locale={locale}
                        />
                    )}

                    {recommendation && weather && (
                        <WeatherBreakdown weather={weather} recommendation={recommendation} locale={locale} />
                    )}

                    {!recommendation && !loadingResult && (
                        <section className="emptyState">
                            <h2>{messages.emptyState.title}</h2>
                            <p>{messages.emptyState.description}</p>
                        </section>
                    )}
                </main>
            </div>
        </>
    )
}

export default function Home() {
    return (
        <Suspense fallback={null}>
            <HomeContent />
        </Suspense>
    )
}
