import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      /*
       * COLORI DEL DESIGN SYSTEM
       * Ogni colore ha le varianti: 50 (chiarissimo) → 900 (scurissimo)
       * Il colore primario è il viola (brand), poi abbiamo colori semantici
       */
      colors: {
        brand: {
          50:  "#EEEDFE",
          100: "#CECBF6",
          200: "#AFA9EC",
          400: "#7F77DD",
          600: "#534AB7",
          800: "#3C3489",
          900: "#26215C",
        },
        teal: {
          50:  "#E1F5EE",
          100: "#9FE1CB",
          200: "#5DCAA5",
          400: "#1D9E75",
          600: "#0F6E56",
          800: "#085041",
          900: "#04342C",
        },
        coral: {
          50:  "#FAECE7",
          100: "#F5C4B3",
          200: "#F0997B",
          400: "#D85A30",
          600: "#993C1D",
          800: "#712B13",
          900: "#4A1B0C",
        },
        amber: {
          50:  "#FAEEDA",
          100: "#FAC775",
          200: "#EF9F27",
          400: "#BA7517",
          600: "#854F0B",
          800: "#633806",
          900: "#412402",
        },
        success: {
          50:  "#E1F5EE",
          600: "#0F6E56",
          800: "#085041",
        },
        danger: {
          50:  "#FCEBEB",
          600: "#A32D2D",
          800: "#791F1F",
        },
      },
      /*
       * FONT
       * Outfit per i titoli (moderno, geometrico)
       * Plus Jakarta Sans per il body (leggibile, friendly)
       */
      fontFamily: {
        display: ["Outfit", "sans-serif"],
        body: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
      },
      /*
       * BORDER RADIUS
       * Coerenza su tutto il progetto
       */
      borderRadius: {
        DEFAULT: "8px",
        lg: "12px",
        xl: "16px",
        pill: "9999px",
      },
      /*
       * ANIMAZIONI CUSTOM
       * Per le transizioni e i feedback di gioco
       */
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.5s ease-out forwards",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
