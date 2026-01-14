import type { Config } from "tailwindcss";

const config: Config = {
	content: [
		"./app/**/*.{js,ts,jsx,tsx,mdx}",
		"./lib/**/*.{js,ts,jsx,tsx,mdx}",
	],
	theme: {
		extend: {
			colors: {
				background: "var(--color-background)",
				foreground: "var(--color-foreground)",
				primary: "var(--color-primary)",
				"primary-foreground": "var(--color-primary-foreground)",
				secondary: "var(--color-secondary)",
				"secondary-foreground": "var(--color-secondary-foreground)",
				muted: "var(--color-muted)",
				"muted-foreground": "var(--color-muted-foreground)",
				border: "var(--color-border)",
				input: "var(--color-input)",
				card: "var(--color-card)",
				"card-foreground": "var(--color-card-foreground)",
			},
			borderRadius: {
				DEFAULT: "var(--radius)",
				sm: "var(--radius-sm)",
				md: "var(--radius-md)",
				lg: "var(--radius-lg)",
			},
			fontFamily: {
				sans: ["var(--font-sans)", "system-ui", "sans-serif"],
			},
			spacing: {
				xs: "var(--spacing-xs)",
				sm: "var(--spacing-sm)",
				md: "var(--spacing-md)",
				lg: "var(--spacing-lg)",
				xl: "var(--spacing-xl)",
			},
		},
	},
	plugins: [],
};
export default config;
