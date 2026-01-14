// Client-side fetch wrapper for API calls
// Usage: apiFetch('/api/words', { method: 'GET' })

export async function apiFetch<T = unknown>(
    url: string,
    options?: RequestInit,
): Promise<T> {
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
    })

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage =
            errorData.error || `Request failed: ${response.status}`
        throw new Error(errorMessage)
    }

    return response.json()
}
