/** Remembering preferences is optional when browser storage is unavailable or full. */
export function readStoredPreference(key: string): string | null {
    try {
        return typeof window === "undefined" ? null : window.localStorage.getItem(key)
    } catch {
        return null
    }
}

export function writeStoredPreference(key: string, value: string): void {
    try {
        if (typeof window !== "undefined") window.localStorage.setItem(key, value)
    } catch {
        // Keep the preference in React state even when it cannot be persisted.
    }
}

export function subscribeToStoredPreferences(onChange: () => void): () => void {
    window.addEventListener("storage", onChange)
    return () => window.removeEventListener("storage", onChange)
}
