# Running Premium Leads on Replit

## Start and verify
- Use **Run**, which starts the existing `Start application` workflow (`npm run dev`).
- Express serves the React app and API together on `0.0.0.0:5000`; Vite runs in middleware mode.
- PostgreSQL is provided through the managed `DATABASE_URL`. The imported application applies its existing Drizzle migrations and seeds missing default content on startup.
- Checks: `npm run check`, `npm test`, `npm run build`.
- Routes: `/`, `/get-started`, `/resources`, and `/admin`.

## Configuration
- `SESSION_SECRET` is configured in Secrets.
- `PLAYWRIGHT_CHROMIUM_PATH` points to the installed Nix Chromium executable for resource screenshots. If the Nix environment changes, refresh this setting using the output of `command -v chromium`.
- `SECRETS_KEY` is not configured. The original app derives a development encryption key from `SESSION_SECRET`. Before publishing, configure a persistent encryption secret in Replit Secrets; production refuses to save integration credentials without it. If integration credentials were already saved in development, re-enter them after changing the encryption key.
- Optional AI, SendGrid, Authority Desk, and scheduler integrations still need their real credentials/settings. Configure them using Admin → Integrations or the environment variables documented in README.md.
- The initial admin credentials are documented in README.md. The app requires a password change on first login; change it before sharing access.

## Import compatibility
- Keep the existing React/Express/PostgreSQL structure and UI.
- The imported Vitest dependency pulled in `tinypool@1.1.1`, blocked by the Replit package firewall. Vitest and its compatible Vite version were updated; type checks, the existing tests, and the build pass.
- The original homepage video is externally hosted and can display a third-party security restriction in the preview browser. Its source was not replaced.
- Publishing is not part of the import setup. Review production secrets, external services, and the imported startup migration behavior before publishing.
