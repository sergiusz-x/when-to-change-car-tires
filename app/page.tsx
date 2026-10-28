"use client"

import { Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
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
    createDebugWeather,
    parseDebugSettings,
} from "@/lib/debug/overrides"
import type { DebugTransitionMode } from "@/lib/debug/overrides"
import { computeRecommendation, CURRENT_FORECAST_MS } from "@/lib/recommendation/engine"
import { getPlannerMessages } from "@/lib/recommendation/messages"
import { seasonalTireDefault } from "@/lib/recommendation/seasonalDefault"
import { readStoredPreference, subscribeToStoredPreferences, writeStoredPreference } from "@/lib/browserStorage"
import { fetchWeatherSeries, searchCities } from "@/lib/weather/openMeteoClient"
import type { GeoLocation, RefreshOutcome, TireSetup, WeatherSeries } from "@/types"

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

function getBrowserLocale(): Locale {
    return normalizeLocale(readStoredPreference(LOCALE_STORAGE_KEY)) ?? detectLocaleFromNavigator(window.navigator.language)
}

function getStoredDevPanelVisibility(): boolean {
    return readStoredPreference("devDebugPanelVisible") !== "0"
}

function HomeContent() {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const manualCityChangeRef = useRef(false)
    const localeManuallySelectedRef = useRef(false)
    const languageMenuRef = useRef<HTMLDivElement | null>(null)
    const [query, setQuery] = useState("")
    const [localeSelection, setLocale] = useState<Locale | null>(null)
    const browserLocale = useSyncExternalStore(subscribeToStoredPreferences, getBrowserLocale, () => DEFAULT_LOCALE)
    const locale = localeSelection ?? browserLocale
    const [citySearch, setCitySearch] = useState<{ query: string; locale: Locale; items: GeoLocation[] } | null>(null)
    const [selectedCity, setSelectedCity] = useState<GeoLocation | null>(null)
    const [setupOverride, setSetupOverride] = useState<TireSetup | null>(null)
    const [result, setResult] = useState<{
        location: GeoLocation;
        weather: WeatherSeries;
        refreshOutcome: RefreshOutcome;
        debugKey: string;
    } | null>(null)
    const [now, setNow] = useState(() => new Date())
    const requestRef = useRef<{ generation: number; controller?: AbortController }>({ generation: 0 })
    const [loadingAutoCity, setLoadingAutoCity] = useState(true)
    const [autoCityError, setAutoCityError] = useState<UiErrorKey | null>(null)
    const [loadingResult, setLoadingResult] = useState(false)
    const [error, setError] = useState<UiErrorKey | null>(null)
    const [devPanelOverride, setDevPanelOverride] = useState<boolean | null>(null)
    const storedDevPanelVisibility = useSyncExternalStore(subscribeToStoredPreferences, getStoredDevPanelVisibility, () => true)
    const devPanelVisible = devPanelOverride ?? storedDevPanelVisibility
    const [languageMenuOpen, setLanguageMenuOpen] = useState(false)
    const messages = useMemo(() => getTranslations(locale), [locale])
    const setup = setupOverride ?? (selectedCity ? seasonalTireDefault(now, selectedCity) : "UNKNOWN")
    const normalizedQuery = query.trim().slice(0, MAX_CITY_QUERY_LENGTH)
    const matchingCitySearch = citySearch?.query === normalizedQuery && citySearch.locale === locale ? citySearch : null
    const cityOptions = matchingCitySearch?.items ?? []
    const loadingCities = normalizedQuery.length >= 2 && !selectedCity && !matchingCitySearch

    const plannerMessages = getPlannerMessages(locale)
    const debugKey = searchParams.toString()
    const visibleResult = result && result.location.id === selectedCity?.id && result.debugKey === debugKey ? result : null

    const selectCity = (city: GeoLocation | null) => {
        requestRef.current.controller?.abort()
        requestRef.current.generation++
        setSelectedCity(city)
        setCitySearch(null)
        setResult(null)
        setLoadingResult(false)
        setError(null)
    }

    useEffect(() => {
        const updateClock = () => setNow(new Date())
        const timer = window.setInterval(updateClock, 30_000)
        window.addEventListener("focus", updateClock)
        document.addEventListener("visibilitychange", updateClock)
        return () => {
            window.clearInterval(timer)
            window.removeEventListener("focus", updateClock)
            document.removeEventListener("visibilitychange", updateClock)
        }
    }, [])

    useEffect(() => {
        if (!result) return
        const expires = Date.parse(result.weather.fetchedAt) + CURRENT_FORECAST_MS + 1
        const remaining = expires - Date.now()
        if (remaining <= 0) return
        const timer = window.setTimeout(() => setNow(new Date()), remaining)
        return () => window.clearTimeout(timer)
    }, [result])

    useEffect(() => () => requestRef.current.controller?.abort(), [])

    const isDev = process.env.NODE_ENV === "development"
    const debugSettings = useMemo(
        () =>
            parseDebugSettings(new URLSearchParams(searchParams.toString()), {
                enabled: isDev,
            }),
        [isDev, searchParams],
    )
    const recommendation = useMemo(() => visibleResult ? computeRecommendation(
        visibleResult.weather, visibleResult.location, {
            now: visibleResult.weather.simulated && debugSettings.dateOverride ? new Date(`${debugSettings.dateOverride}T12:00:00Z`) : now,
            refreshOutcome: visibleResult.refreshOutcome,
        },
    ) : null, [visibleResult, now, debugSettings.dateOverride])

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

    const setDevPanelVisible = (visible: boolean) => {
        setDevPanelOverride(visible)
        writeStoredPreference("devDebugPanelVisible", visible ? "1" : "0")
    }

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

        writeStoredPreference(LOCALE_STORAGE_KEY, nextLocale)
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
        if (normalizedQuery.length < 2 || selectedCity) return

        const timeout = setTimeout(async () => {
            try {
                const results = await searchCities(normalizedQuery, locale, controller.signal)
                if (!cancelled) {
                    setCitySearch({ query: normalizedQuery, locale, items: results })
                }
            } catch (error) {
                if (error instanceof DOMException && error.name === "AbortError") {
                    return
                }

                if (!cancelled) {
                    setCitySearch({ query: normalizedQuery, locale, items: [] })
                }
            }
        }, 300)

        return () => {
            cancelled = true
            controller.abort()
            clearTimeout(timeout)
        }
    }, [normalizedQuery, locale, selectedCity])

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

                if (!cancelled && !localeManuallySelectedRef.current && !normalizeLocale(readStoredPreference(LOCALE_STORAGE_KEY))) {
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

                selectCity(detectedCity)
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
        if (!selectedCity) return
        requestRef.current.controller?.abort()
        const controller = new AbortController()
        const generation = ++requestRef.current.generation
        requestRef.current.controller = controller
        const location = selectedCity
        setLoadingResult(true)
        setError(null)
        try {
            const weather = debugSettings.active
                ? createDebugWeather(location, debugSettings, new Date())
                : await fetchWeatherSeries(location, controller.signal)
            if (generation !== requestRef.current.generation || controller.signal.aborted) return
            setResult({ location, weather, refreshOutcome: "SUCCESS", debugKey })
            setNow(new Date())
        } catch {
            if (generation !== requestRef.current.generation || controller.signal.aborted) return
            setError("RECOMMENDATION_LOADING")
            setResult((previous) => previous?.location.id === location.id
                ? { ...previous, refreshOutcome: "FAILURE" }
                : null)
            setNow(new Date())
        } finally {
            if (generation === requestRef.current.generation) setLoadingResult(false)
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
                                selectCity(null)
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
                              selectCity(option)
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

                        <details className="tireSetupDetails">
                            <summary>
                                {setupOverride === null && (setup === "SUMMER" || setup === "WINTER")
                                    ? plannerMessages.checkingChange[setup === "SUMMER" ? "WINTER" : "SUMMER"]
                                    : <>{plannerMessages.setupCaption}{(selectedCity || setupOverride !== null) && <>: {plannerMessages.setups[setup].toLocaleLowerCase(locale)}</>}</>}
                                <span>{plannerMessages.changeSetup}</span>
                            </summary>
                            <div className="tireSetupContent">
                                <label htmlFor="tireSetup">{plannerMessages.setupLabel}</label>
                                <select id="tireSetup" value={setup} onChange={(event) => setSetupOverride(event.target.value as TireSetup)}>
                                    {(["SUMMER", "WINTER", "ALL_SEASON", "UNKNOWN"] as const).map((value) => (
                                        <option key={value} value={value}>{plannerMessages.setups[value]}</option>
                                    ))}
                                </select>
                                <p>{plannerMessages.setupDefaultHint}</p>
                            </div>
                        </details>

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

                    {recommendation && visibleResult && (
                        <RecommendationCard
                            location={visibleResult.location}
                            recommendation={recommendation}
                            setup={setup}
                            locale={locale}
                        />
                    )}

                    {recommendation && visibleResult && (
                        <WeatherBreakdown weather={visibleResult.weather} recommendation={recommendation} locale={locale} />
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
