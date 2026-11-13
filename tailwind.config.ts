import type { Config } from "tailwindcss";

// Palette and type from the original prototype. `faint` and `gold` are a shade
// darker than the prototype so small text passes WCAG AA contrast on paper.
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F6F1E7",
        card: "#FFFFFF",
        sand: "#F1ECE1",
        chip: "#EFEAE0",
        cream: "#F1E4C4",
        ink: "#1C1A17",
        muted: "#6B6459",
        faint: "#736A5D",
        line: "#D9CBA0",
        // Text on ink (the footer): dusk 9.6:1, dusk-faint 6.4:1.
        dusk: { DEFAULT: "#C9BFAE", faint: "#A79C8A" },
        gold: { DEFAULT: "#8C600A", dark: "#704C06", soft: "#D9A441", edge: "#D9C48A" },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      screens: { mobile: { max: "760px" }, desk: "761px" },
    },
  },
  plugins: [],
} satisfies Config;
