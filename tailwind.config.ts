import type { Config } from 'tailwindcss'

const config: Config = {
    content: [
        './app/**/*.{js,ts,jsx,tsx,mdx}',
        './lib/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                background: 'rgb(var(--color-background) / <alpha-value>)',
                foreground: 'rgb(var(--color-foreground) / <alpha-value>)',
                primary: 'rgb(var(--color-primary) / <alpha-value>)',
                'primary-foreground':
                    'rgb(var(--color-primary-foreground) / <alpha-value>)',
                secondary: 'rgb(var(--color-secondary) / <alpha-value>)',
                'secondary-foreground':
                    'rgb(var(--color-secondary-foreground) / <alpha-value>)',
                muted: 'rgb(var(--color-muted) / <alpha-value>)',
                'muted-foreground':
                    'rgb(var(--color-muted-foreground) / <alpha-value>)',
                border: 'rgb(var(--color-border) / <alpha-value>)',
                input: 'rgb(var(--color-input) / <alpha-value>)',
                card: 'rgb(var(--color-card) / <alpha-value>)',
                'card-foreground':
                    'rgb(var(--color-card-foreground) / <alpha-value>)',
                error: 'rgb(var(--color-error) / <alpha-value>)',
                'error-background':
                    'rgb(var(--color-error-background) / <alpha-value>)',
                'error-border':
                    'rgb(var(--color-error-border) / <alpha-value>)',
                'error-text': 'rgb(var(--color-error-text) / <alpha-value>)',
                success: 'rgb(var(--color-success) / <alpha-value>)',
                'success-background':
                    'rgb(var(--color-success-background) / <alpha-value>)',
                'success-border':
                    'rgb(var(--color-success-border) / <alpha-value>)',
                'success-text':
                    'rgb(var(--color-success-text) / <alpha-value>)',
            },
            borderRadius: {
                DEFAULT: 'var(--radius)',
                sm: 'var(--radius-sm)',
                md: 'var(--radius-md)',
                lg: 'var(--radius-lg)',
            },
            fontFamily: {
                sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
            },
            spacing: {
                xs: 'var(--spacing-xs)',
                sm: 'var(--spacing-sm)',
                md: 'var(--spacing-md)',
                lg: 'var(--spacing-lg)',
                xl: 'var(--spacing-xl)',
            },
        },
    },
    plugins: [],
}
export default config
