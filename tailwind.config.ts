import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        brand: {
          50: "#fff8f0",
          100: "#fcf6e2",
          150: "#fffaf0",
          200: "#f7e8cf",
          300: "#eacfb4",
          400: "#d78791",
          500: "#b02243",
          600: "#941b38",
          700: "#76162f",
          800: "#561322",
          900: "#321016",
        },
        cocoa: {
          50: "#fbf7f0",
          100: "#efe3d2",
          200: "#d9c2a7",
          300: "#b99a79",
          400: "#8d6a50",
          500: "#654637",
          600: "#493028",
          700: "#321d19",
          800: "#241311",
          900: "#160b0a",
        },
        blush: {
          50: "#fff4f3",
          100: "#fbe3e1",
          200: "#f4c9c9",
          300: "#e9a9ad",
          400: "#d67d87",
          500: "#b95266",
          600: "#9c364f",
          700: "#7b263e",
          800: "#5a1c2e",
          900: "#37121d",
        },
        cream: {
          50: "#fffdf7",
          100: "#fcf6e2",
          200: "#f5e8c7",
          300: "#ead3a5",
          400: "#d7b77b",
          500: "#b89255",
          600: "#92703f",
          700: "#6d5130",
          800: "#493421",
          900: "#2a1c13",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        soft: "0 18px 45px rgba(86, 19, 34, 0.08)",
        petal: "0 18px 50px rgba(176, 34, 67, 0.14)",
        card: "0 1px 0 rgba(255, 255, 255, 0.75) inset, 0 18px 40px rgba(73, 48, 40, 0.08)",
      },
    },
  },
  plugins: [animate],
};

export default config;
