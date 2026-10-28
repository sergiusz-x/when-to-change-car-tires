import { expect, test, type Page } from "@playwright/test"

const NOW = new Date("2026-10-23T10:00:00Z")
const ipLocation = { city: "Warszawa", country_name: "Polska", country: "PL", latitude: 52.23, longitude: 21.01, timezone: "Europe/Warsaw" }
function payload(length: number, mode = "warm") {
    return {
        timezone: "Europe/Warsaw",
        daily_units: { temperature_2m_mean: "°C", temperature_2m_min: "°C", snowfall_sum: "cm", weather_code: "wmo code" },
        daily: {
            time: Array.from({ length }, (_, index) => new Date(Date.UTC(2026, 9, 23 + index)).toISOString().slice(0, 10)),
            temperature_2m_mean: Array.from({ length }, () => mode === "cold" ? 5 : 12),
            temperature_2m_min: Array.from({ length }, (_, index) => mode === "cold" ? 2 : mode === "varied" && index === 4 ? null : mode === "varied" && index === 7 ? -100 : ["frost", "varied"].includes(mode) && index === 1 ? -3 : 6),
            snowfall_sum: Array.from({ length }, (_, index) => mode === "varied" && index === 2 ? 2.5 : mode === "varied" && index === 5 ? null : mode === "varied" && index === 6 ? 0.01 : 0),
            weather_code: Array.from({ length }, (_, index) => mode === "varied" && index === 3 ? 66 : 0),
        },
    }
}

async function openApp(page: Page, mode = "warm", blockStorage = false) {
    const state = { mode, fail: false, delay: undefined as Promise<void> | undefined, started: undefined as (() => void) | undefined }
    await page.clock.install({ time: NOW })
    await page.addInitScript((blocked) => {
        if (blocked) {
            Object.defineProperty(window, "localStorage", {
                get() { throw new DOMException("Storage blocked", "SecurityError") },
            })
        } else {
            window.localStorage.setItem("devDebugPanelVisible", "0")
        }
    }, blockStorage)
    await page.route("**/api/ip-location", (route) => route.fulfill({ json: ipLocation }))
    await page.route("https://geocoding-api.open-meteo.com/**", (route) => route.fulfill({ json: { results: [
        { id: 2, name: "Kraków", country: "Polska", latitude: 50.06, longitude: 19.94, timezone: "Europe/Warsaw" },
    ] } }))
    await page.route("https://api.open-meteo.com/v1/forecast?**", async (route) => {
        const data = payload(16, state.mode)
        const fail = state.fail
        const delay = state.delay
        state.started?.()
        if (delay) await delay
        try {
            await route.fulfill(fail ? { status: 503, json: { error: true } } : { json: data })
        } catch {
            // A city change deliberately aborts the obsolete request.
            if (!delay) throw new Error("Unexpected forecast route failure")
        }
    })
    await page.route("https://seasonal-api.open-meteo.com/**", (route) => route.fulfill({ json: payload(46) }))
    await page.goto("/")
    await expect(page.getByRole("button", { name: "Pokaż rekomendację", exact: true })).toBeEnabled()
    const hideDebug = page.locator(".devHideButton")
    if (await hideDebug.isVisible()) await hideDebug.click()
    return state
}

const submit = async (page: Page) => {
    await page.getByRole("button", { name: "Pokaż rekomendację", exact: true }).click()
    await expect(page.locator(".resultCard")).toBeVisible()
}

const chooseSetup = async (page: Page, setup: string) => {
    const settings = page.locator(".tireSetupDetails")
    if (!await settings.evaluate((element) => (element as HTMLDetailsElement).open)) await settings.locator("summary").click()
    await page.locator("#tireSetup").selectOption(setup)
    await settings.locator("summary").click()
}

test("IP location route decodes UTF-8 city names", async ({ request }) => {
    const response = await request.get("/api/ip-location", {
        headers: {
            "x-vercel-ip-city": "Krak%C3%B3w",
            "x-vercel-ip-country": "PL",
        },
    })

    expect(response.ok()).toBe(true)
    await expect(response.json()).resolves.toMatchObject({ city: "Kraków", country: "PL" })
})

test("blocked browser storage does not prevent weather assessment or language selection", async ({ page }) => {
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    await openApp(page, "frost", true)
    await submit(page)
    await expect(page.locator(".resultCard h2")).toHaveText("Zaplanuj zmianę na zimowe")
    await page.locator(".languageMenuTrigger").click()
    await page.getByRole("menuitem").filter({ hasText: "EN" }).click()
    await expect(page.locator(".resultCard h2")).toHaveText("Plan your winter tires")
    expect(errors).toEqual([])
})

test("a saved language choice survives reload despite Polish IP geolocation", async ({ page }) => {
    await openApp(page, "frost")
    await page.locator(".languageMenuTrigger").click()
    await page.getByRole("menuitem").filter({ hasText: "EN" }).click()
    await page.reload()
    await expect(page.getByRole("button", { name: "Show recommendation", exact: true })).toBeEnabled()
    await page.getByRole("button", { name: "Show recommendation", exact: true }).click()
    await expect(page.locator(".resultCard h2")).toHaveText("Plan your winter tires")
})

test("clearing the city query removes suggestions and allows another selection", async ({ page }) => {
    await openApp(page)
    const cityInput = page.getByLabel("Miasto", { exact: true })
    await cityInput.fill("Krak")
    await expect(page.getByRole("button", { name: "Kraków, Polska", exact: true })).toBeVisible()
    await cityInput.fill("")
    await expect(page.locator(".autocompletePanel")).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Pokaż rekomendację", exact: true })).toBeDisabled()
    await cityInput.fill("Krak")
    await page.getByRole("button", { name: "Kraków, Polska", exact: true }).click()
    await expect(cityInput).toHaveValue("Kraków, Polska")
    await expect(page.getByRole("button", { name: "Pokaż rekomendację", exact: true })).toBeEnabled()
})

test("tomorrow's frost wins over warmth; setup changes do not invent a new weather assessment", async ({ page }) => {
    await openApp(page, "frost")
    await expect(page.locator(".tireSetupDetails summary")).toContainText("Sprawdzam zmianę na zimowe")
    await expect(page.locator(".tireSetupDetails")).not.toHaveAttribute("open")
    await submit(page)
    await expect(page.locator(".resultCard h2")).toHaveText("Zaplanuj zmianę na zimowe")
    await expect(page.locator(".bookingPeriod strong")).toHaveText("23.10.2026")
    await page.screenshot({ path: "/tmp/tire-redesign-verification/autumn-default.png" })
    await chooseSetup(page, "UNKNOWN")
    await expect(page.locator(".resultCard h2")).toHaveText("Jeśli masz letnie opony, zaplanuj zmianę na zimowe")
    await expect(page.locator(".bookingPeriod strong")).toHaveText("23.10.2026")
    await expect(page.locator(".weatherRow")).toHaveCount(46)
    await expect(page.locator('.weatherRow[data-date="2026-10-24"]')).toContainText("-3.0°")
    await expect(page.locator(".assessmentDetails")).not.toHaveAttribute("open")
    await page.locator(".assessmentDetails summary").click()
    await expect(page.locator(".resultCard .reasons")).toBeVisible()
    await page.locator(".assessmentDetails summary").click()
    await expect(page.getByRole("button", { name: "Odśwież prognozę", exact: true })).toHaveCount(0)
    await chooseSetup(page, "WINTER")
    await expect(page.locator(".tireSetupDetails summary")).toContainText("Opony: zimowe")
    await expect(page.locator(".resultCard h2")).toHaveText("Na razie zostań przy zimowych")
    await expect(page.locator(".bookingPeriod")).toHaveCount(0)
    await chooseSetup(page, "ALL_SEASON")
    await expect(page.locator(".resultCard h2")).toHaveText("Wielosezonowe: sprawdź warunki przed jazdą")
    await expect(page.locator(".bookingPeriod")).toHaveCount(0)
    await expect(page.locator(".resultCard")).toHaveAttribute("data-assessment", "WINTER_PRECAUTION")
})

test("cool weather without frost produces winter planning", async ({ page }) => {
    await openApp(page, "cold")
    await chooseSetup(page, "SUMMER")
    await submit(page)
    await expect(page.locator(".resultCard")).toHaveAttribute("data-assessment", "COOL_TREND")
    await expect(page.locator(".resultCard h2")).toHaveText("Zaplanuj zmianę na zimowe")
    await expect(page.locator(".bookingPeriod")).toBeVisible()
})

test("a failed refresh removes summer advice, retains the forecast and recovers only after success", async ({ page }) => {
    const state = await openApp(page)
    await chooseSetup(page, "WINTER")
    await submit(page)
    await expect(page.locator(".resultCard h2")).toHaveText("Możesz rozważyć zmianę na letnie")
    state.fail = true
    await page.getByRole("button", { name: "Pokaż rekomendację", exact: true }).click()
    await expect(page.locator(".resultCard")).toHaveAttribute("data-assessment", "REFRESH_REQUIRED")
    await expect(page.locator(".resultCard h2")).toHaveText("Sprawdź prognozę ponownie")
    await expect(page.locator(".weatherRow")).toHaveCount(46)
    await chooseSetup(page, "UNKNOWN")
    await expect(page.locator(".resultCard h2")).toHaveText("Sprawdź prognozę ponownie")
    state.fail = false
    await page.getByRole("button", { name: "Pokaż rekomendację", exact: true }).click()
    await expect(page.locator(".resultCard")).toHaveAttribute("data-assessment", "SUMMER_CANDIDATE")
})

test("changing city hides old data and discards a late response from the previous city", async ({ page }) => {
    const state = await openApp(page)
    await submit(page)
    let release!: () => void
    let notifyStarted!: () => void
    const started = new Promise<void>((resolve) => { notifyStarted = resolve })
    state.delay = new Promise<void>((resolve) => { release = resolve })
    state.started = notifyStarted
    state.mode = "frost"
    await page.getByRole("button", { name: "Pokaż rekomendację", exact: true }).click()
    await started
    await page.getByLabel("Miasto", { exact: true }).fill("Krak")
    await expect(page.locator(".resultCard")).toHaveCount(0)
    await expect(page.locator(".weatherCard")).toHaveCount(0)
    await page.getByRole("button", { name: "Kraków, Polska", exact: true }).click()
    state.delay = undefined
    state.started = undefined
    state.mode = "warm"
    await chooseSetup(page, "WINTER")
    await submit(page)
    release()
    await expect(page.locator(".resultCard")).toHaveAttribute("aria-label", "Pogoda i opony: Kraków")
    await expect(page.locator(".resultCard h2")).toHaveText("Możesz rozważyć zmianę na letnie")
    await expect(page.locator(".resultCard")).toHaveAttribute("data-assessment", "SUMMER_CANDIDATE")
})

test("freshness updates on the open page without another request", async ({ page }) => {
    await openApp(page)
    await chooseSetup(page, "WINTER")
    await submit(page)
    await expect(page.locator(".resultCard")).toHaveAttribute("data-assessment", "SUMMER_CANDIDATE")
    await page.clock.fastForward(6 * 60 * 60 * 1000 + 1000)
    await expect(page.locator(".resultCard")).toHaveAttribute("data-assessment", "REFRESH_REQUIRED")
    await expect(page.locator(".resultCard")).toContainText("Dane starsze niż 6 godzin")
})

test("English copy and mobile forecast remain usable without horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openApp(page, "varied")
    await chooseSetup(page, "SUMMER")
    await submit(page)
    await page.locator(".languageMenuTrigger").click()
    await page.getByRole("menuitem").filter({ hasText: "EN" }).click()
    await expect(page.locator(".resultCard h2")).toHaveText("Plan your winter tires")
    await expect(page.locator(".weatherRow")).toHaveCount(46)
    await expect(page.locator('.weatherRow[data-date="2026-11-07"]')).toBeVisible()
    await expect(page.locator('.weatherRow[data-date="2026-11-08"]')).toBeVisible()
    await expect(page.locator(".forecastGroupLongRange")).toContainText("Long-range temperature trend")
    for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 844 })
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
        const rowHeights = await page.locator(".weatherRow").evaluateAll((rows) => rows.map((row) => row.getBoundingClientRect().height))
        expect(Math.max(...rowHeights) - Math.min(...rowHeights)).toBeLessThan(1)
        expect(Math.max(...rowHeights)).toBeLessThanOrEqual(48)
        const overlappingValues = await page.locator(".weatherRow td:not(:first-child):not(.weatherChart)").evaluateAll((cells) => cells.some((cell) => {
            const text = document.createRange()
            text.selectNodeContents(cell)
            const style = getComputedStyle(cell)
            return text.getBoundingClientRect().width > cell.getBoundingClientRect().width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) + 1
        }))
        expect(overlappingValues).toBe(false)
    }
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(page.locator('.weatherRow[data-date="2026-10-29"]')).toContainText("<0.1")
    const freezingDay = page.locator('.weatherRow[data-date="2026-10-26"]')
    await freezingDay.locator("summary").click()
    await expect(freezingDay.locator(".dayConditionsContent")).toContainText("Freezing precipitation")
    await expect(freezingDay).toHaveCSS("height", "44px")
    await freezingDay.locator("summary").click()
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: "/tmp/tire-redesign-verification/mobile-viewport.png" })
    await page.screenshot({ path: "/tmp/tire-redesign-verification/mobile-forecast.png", fullPage: true })
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.screenshot({ path: "/tmp/tire-redesign-verification/desktop-viewport.png" })
})
