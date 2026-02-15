import type { Config } from "tailwindcss";

/**
 * International Medical Software – Enterprise theme
 * Inspired by logo: golden yellow box, multicolored globe (blue, green, orange).
 * Deep navy base, golden accents, clean enterprise feel.
 */
const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Deep navy (background base)
        navy: {
          950: "#0a0f1a",
          900: "#0f172a",
          800: "#1e293b",
          700: "#334155",
          600: "#475569",
        },
        // Golden yellow (primary accent, buttons, highlights)
        gold: {
          400: "#f0b429",
          500: "#e5a00d",
          600: "#c9900b",
          700: "#a67a09",
        },
        // Soft blue (info, secondary accent)
        accent: {
          blue: "#38bdf8",
          teal: "#2dd4bf",
          orange: "#fb923c",
        },
        // Semantic
        success: "#22c55e",
        error: "#ef4444",
        "error-soft": "#f87171",
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "Segoe UI",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
      },
      borderRadius: {
        "theme": "0.5rem",
        "theme-lg": "0.75rem",
      },
      boxShadow: {
        "theme": "0 1px 3px 0 rgb(0 0 0 / 0.2), 0 1px 2px -1px rgb(0 0 0 / 0.2)",
        "theme-md": "0 4px 6px -1px rgb(0 0 0 / 0.25), 0 2px 4px -2px rgb(0 0 0 / 0.2)",
        "theme-glow": "0 0 20px -2px rgb(229 160 13 / 0.25)",
        "header-glow": "0 1px 0 0 rgb(229 160 13 / 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
