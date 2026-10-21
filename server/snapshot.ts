/**
 * Page screenshots with headless Chromium (Playwright), for the Resources
 * cards (HANDOFF-resources.md §1): viewport 1440×900, wait for network idle,
 * capture the top of the page at a device scale that lands the PNG at
 * 900×620. One browser at a time; failures fall back to the branded gradient.
 *
 * Chromium: Playwright's bundled build, or the one at PLAYWRIGHT_CHROMIUM_PATH
 * / the system `chromium` (Replit's nix package) when the download is absent.
 */
import { chromium, type Browser } from "playwright";

const VIEWPORT = { width: 1440, height: 992 }; // 1440×992 at 0.625 → 900×620
const SCALE = 900 / 1440;
const NAV_TIMEOUT_MS = 25_000;

let queue: Promise<unknown> = Promise.resolve();

function candidatePaths(): (string | undefined)[] {
  return [
    process.env.PLAYWRIGHT_CHROMIUM_PATH?.trim() || undefined,
    undefined, // bundled
    "/opt/pw-browsers/chromium",
    process.env.CHROMIUM_PATH?.trim() || undefined,
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/run/current-system/sw/bin/chromium",
  ];
}

async function launch(): Promise<Browser> {
  let lastErr: unknown;
  const tried = new Set<string>();
  for (const executablePath of candidatePaths()) {
    const key = executablePath ?? "<bundled>";
    if (tried.has(key)) continue;
    tried.add(key);
    try {
      return await chromium.launch({ headless: true, executablePath, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(`No Chromium could be launched: ${(lastErr as Error)?.message ?? "unknown error"}`);
}

/** PNG bytes of the top of the page, 900×620. Throws when the page can't be rendered. */
export async function screenshotPage(url: string): Promise<Buffer> {
  const run = async () => {
    const browser = await launch();
    try {
      const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: SCALE, userAgent: "Mozilla/5.0 (compatible; PremiumLeadsBot/1.0; +https://premiumleads.ai)" });
      const page = await context.newPage();
      page.setDefaultTimeout(NAV_TIMEOUT_MS);
      try {
        await page.goto(url, { waitUntil: "networkidle", timeout: NAV_TIMEOUT_MS });
      } catch {
        // Busy pages never go idle; settle for the load event.
        await page.goto(url, { waitUntil: "load", timeout: NAV_TIMEOUT_MS }).catch(() => undefined);
      }
      await page.waitForTimeout(600);
      return await page.screenshot({ type: "png", clip: { x: 0, y: 0, ...VIEWPORT } });
    } finally {
      await browser.close().catch(() => undefined);
    }
  };
  const next = queue.then(run, run);
  queue = next.catch(() => undefined);
  return next;
}
