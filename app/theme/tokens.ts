// Single source of truth for all design tokens
// Update colors, fonts, radius, spacing, and shadows here

export const tokens = {
    colors: {
        background: { r: 255, g: 255, b: 255 },
        foreground: { r: 10, g: 10, b: 10 },
        primary: { r: 37, g: 99, b: 235 },
        primaryForeground: { r: 255, g: 255, b: 255 },
        secondary: { r: 241, g: 245, b: 249 },
        secondaryForeground: { r: 15, g: 23, b: 42 },
        muted: { r: 248, g: 250, b: 252 },
        mutedForeground: { r: 100, g: 116, b: 139 },
        border: { r: 226, g: 232, b: 240 },
        input: { r: 241, g: 245, b: 249 },
        card: { r: 255, g: 255, b: 255 },
        cardForeground: { r: 10, g: 10, b: 10 },
        error: { r: 239, g: 68, b: 68 },
        errorBackground: { r: 254, g: 242, b: 242 },
        errorBorder: { r: 254, g: 226, b: 226 },
        errorText: { r: 153, g: 27, b: 27 },
        success: { r: 34, g: 197, b: 94 },
        successBackground: { r: 240, g: 253, b: 244 },
        successBorder: { r: 187, g: 247, b: 208 },
        successText: { r: 20, g: 83, b: 45 },
    },
    radius: {
        sm: '0.25rem',
        md: '0.5rem',
        lg: '0.75rem',
        default: '0.5rem',
    },
    font: {
        sans: [
            '-apple-system',
            'BlinkMacSystemFont',
            'Segoe UI',
            'Roboto',
            'Oxygen',
            'Ubuntu',
            'Cantarell',
            'sans-serif',
        ],
    },
    spacing: {
        xs: '0.5rem',
        sm: '0.75rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
    },
    shadow: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    },
} as const

// Helper to convert RGB object to space-separated string for CSS variables
export function rgbToString(rgb: { r: number; g: number; b: number }): string {
    return `${rgb.r} ${rgb.g} ${rgb.b}`
}
