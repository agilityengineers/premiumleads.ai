import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * The client build. Per-page SEO/social meta is injected by the Express server
 * (`server/index.ts`) at request time into the %META_*% placeholders in
 * index.html. In dev the server runs Vite in middleware mode, so this config
 * also drives the dev pipeline — same arrangement as The Authority Desk.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5000,
    allowedHosts: true,
    watch: {
      ignored: ["**/.git/**", "**/.local/**", "**/dist/**", "**/drizzle/**"],
    },
  },
  preview: { host: "0.0.0.0", port: 5000, allowedHosts: true },
});
