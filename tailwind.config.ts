import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          deep: "#102A43",
          midnight: "#142C3E",
          subtle: "#1B3A4B",
        },
        brand: {
          primary: "#1769AA",
          hover: "#12538A",
          light: "#EBF4FB",
        },
        slate: {
          muted: "#64748B",
          dark: "#334155",
        },
        surface: {
          app: "#F5F7FA",
          main: "#FFFFFF",
          secondary: "#F0F3F7",
          border: "#E2E8F0",
          borderStrong: "#CBD5E1",
        },
        status: {
          success: "#16835D",
          successLight: "#E8F5E9",
          warning: "#B7791F",
          warningLight: "#FEF3C7",
          error: "#C2413B",
          errorLight: "#FEE2E2",
          info: "#2563A6",
          infoLight: "#E0F2FE",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
