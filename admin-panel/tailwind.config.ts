import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        night: "#10151c",       // sidebar / deep panel
        graphite: "#1a2129",    // raised surfaces on dark bg
        slab: "#f5f3ee",        // main content background
        ink: "#12161c",         // primary text
        signal: "#e7ab3c",      // amber accent - "occupied / attention"
        clear: "#2f9e6e",       // green accent - "available / paid"
        alert: "#c1483f",       // red accent - overage / errors
        hairline: "#e4e0d6",
      },
      fontFamily: {
        display: ["Space Grotesk", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        card: "10px",
      },
    },
  },
  plugins: [],
};
export default config;
