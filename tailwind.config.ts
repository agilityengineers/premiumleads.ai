import type { Config } from "tailwindcss";

/**
 * Brand tokens from the design package. The public pages carry their exact
 * spacing/type inline (the .dc.html files are the spec); Tailwind is used for
 * utilities and the admin chrome.
 */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#0C2E63",
        blue: "#1E88E5",
        cyan: "#00B2EF",
        ink: "#0B2347",
        body: "#4A5B74",
        muted: "#6B7A90",
        slate: "#33465F",
        night: "#0D1B2E",
        page: "#F6F9FD",
        admin: "#F1F5FA",
      },
      fontFamily: {
        display: ["Sora", "sans-serif"],
        sans: ["Manrope", "system-ui", "sans-serif"],
      },
      maxWidth: { page: "1200px" },
    },
  },
  plugins: [],
} satisfies Config;
