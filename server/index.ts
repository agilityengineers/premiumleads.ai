/**
 * Single Express server. In development it runs Vite in middleware mode (one
 * process, one port); in production it serves the built client from `dist/`.
 * For every HTML request it resolves the page's SEO/social metadata and the
 * analytics tags and injects them into index.html, so crawlers and share
 * previews see the right thing. Same arrangement as The Authority Desk.
 */
import express from "express";
import cookieParser from "cookie-parser";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { apiRouter } from "./routes";
import { migrateDatabase } from "./db";
import { seedAll } from "./seed";
import { readSetting } from "./settings";
import { getPublicVariant, listVariants } from "./variants";
import { recordPageView } from "./traffic";
import { startRelayWorker } from "./authorityDesk";
import { RESERVED_SLUGS } from "../shared/variantSchema";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const isProd = process.env.NODE_ENV === "production";
const PORT = Number(process.env.PORT) || 5000;
export const CANONICAL_BASE_URL = "https://premiumleads.ai";

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** The canonical origin: PUBLIC_BASE_URL, else the production domain. */
function canonicalOrigin(): string {
  const envBase = process.env.PUBLIC_BASE_URL?.trim();
  return envBase ? envBase.replace(/\/+$/, "") : CANONICAL_BASE_URL;
}

type Meta = { title: string; description: string; canonical: string; ogImage: string; robots: string; ogType: string };

async function metaFor(seg: string, origin: string): Promise<Meta> {
  const site = await readSetting("site");
  const suffix = site.siteTitle || "Premium Leads";
  const fallbackImage = site.ogImage || `${origin}/logo-wordmark.png`;
  const base: Meta = {
    title: `${suffix} — Multi-channel engagement platform`,
    description: "Find verified decision-makers and engage them across LinkedIn, email, phone and video. Book a call.",
    canonical: `${origin}/`,
    ogImage: fallbackImage,
    robots: "index,follow",
    ogType: "website",
  };
  if (seg === "resources") {
    return { ...base, title: `Resources — ${suffix}`, description: "The complementary tools we use alongside Premium Leads: voice, authority content and nurture.", canonical: `${origin}/resources` };
  }
  if (seg === "get-started") {
    return { ...base, title: `Get started — ${suffix}`, description: "A few questions so your advisor can prepare — then pick a time on the calendar.", robots: "noindex,follow", canonical: `${origin}/` };
  }
  if (seg === "admin" || RESERVED_SLUGS.includes(seg)) {
    return { ...base, title: `${suffix} — Admin`, robots: "noindex,nofollow" };
  }
  try {
    const slug = seg || site.defaultVariant;
    const v = await getPublicVariant(slug);
    if (!v) return { ...base, robots: seg ? "noindex,follow" : base.robots };
    const isHome = seg === "" || v.isHome;
    const path = isHome ? "/" : `/${v.slug}`;
    const rec = (await listVariants()).find((x) => x.slug === v.slug);
    return {
      title: v.content.metaTitle || base.title,
      description: v.content.metaDesc || base.description,
      canonical: `${origin}${path}`,
      ogImage: rec?.hasOgImage ? `${origin}/api/og/${v.slug}?v=${Date.parse(rec.updatedAt)}` : fallbackImage,
      robots: "index,follow",
      ogType: "website",
    };
  } catch (err) {
    console.error("[meta] lookup failed", err);
    return base;
  }
}

async function analyticsTags(): Promise<string> {
  try {
    const intg = await readSetting("integrations");
    const an = (intg.analytics ?? {}) as Record<string, string | boolean>;
    const id = (k: string) => (typeof an[k] === "string" ? (an[k] as string).trim().replace(/[^A-Za-z0-9_-]/g, "") : "");
    const parts: string[] = [];
    const ga4 = id("ga4");
    if (ga4) parts.push(`<script async src="https://www.googletagmanager.com/gtag/js?id=${ga4}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${ga4}');</script>`);
    const pixel = id("metaPixel");
    if (pixel) parts.push(`<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixel}');fbq('track','PageView');</script>`);
    const li = id("linkedinTag");
    if (li) parts.push(`<script>_linkedin_partner_id="${li}";window._linkedin_data_partner_ids=window._linkedin_data_partner_ids||[];window._linkedin_data_partner_ids.push(_linkedin_partner_id);</script><script>(function(l){if(!l){window.lintrk=function(a,b){window.lintrk.q.push([a,b])};window.lintrk.q=[]}var s=document.getElementsByTagName("script")[0];var b=document.createElement("script");b.type="text/javascript";b.async=true;b.src="https://snap.licdn.com/li.lms-analytics/insight.min.js";s.parentNode.insertBefore(b,s);})(window.lintrk);</script>`);
    return parts.join("\n");
  } catch {
    return "";
  }
}

function robotsTxt(origin: string): string {
  return ["User-agent: *", "Allow: /", "Disallow: /admin", "Disallow: /get-started", "Disallow: /api", "", `Sitemap: ${origin}/sitemap.xml`, ""].join("\n");
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

async function sitemapXml(origin: string): Promise<string> {
  const entries: { path: string; lastmod?: string; priority: string }[] = [{ path: "/", priority: "1.0" }, { path: "/resources", priority: "0.6" }];
  try {
    const site = await readSetting("site");
    for (const v of await listVariants()) {
      if (!v.published || v.slug === site.defaultVariant) continue;
      entries.push({ path: `/${v.slug}`, lastmod: v.updatedAt, priority: "0.8" });
    }
  } catch (err) {
    console.error("[sitemap] lookup failed", err);
  }
  const urls = entries
    .map((e) => `  <url>\n    <loc>${escapeXml(`${origin}${e.path}`)}</loc>${e.lastmod ? `\n    <lastmod>${e.lastmod}</lastmod>` : ""}\n    <changefreq>weekly</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

const NONINDEXABLE = new Set(["admin", "get-started", "api"]);

export async function createApp() {
  const app = express();
  app.set("trust proxy", true);
  app.use(cookieParser());
  app.use(
    "/api",
    express.json({
      limit: "1mb",
      // Signed integrations are verified over the exact bytes received.
      verify: (req, _res, buf) => {
        if ((req as { originalUrl?: string }).originalUrl?.startsWith("/api/integrations/")) {
          (req as unknown as { rawBody?: Buffer }).rawBody = Buffer.from(buf);
        }
      },
    }),
    apiRouter,
  );

  app.get("/robots.txt", (_req, res) => {
    res.status(200).set("Content-Type", "text/plain; charset=utf-8").set("Cache-Control", "public, max-age=3600").send(robotsTxt(canonicalOrigin()));
  });
  app.get("/sitemap.xml", async (_req, res) => {
    res.status(200).set("Content-Type", "application/xml; charset=utf-8").set("Cache-Control", "public, max-age=3600").send(await sitemapXml(canonicalOrigin()));
  });

  const { createServer: createHttpServer } = await import("node:http");
  const httpServer = createHttpServer(app);

  let vite: import("vite").ViteDevServer | undefined;
  if (!isProd) {
    const { createServer } = await import("vite");
    vite = await createServer({
      root,
      server: {
        middlewareMode: true,
        hmr: process.env.REPLIT_DEV_DOMAIN
          ? { server: httpServer, protocol: "wss", host: process.env.REPLIT_DEV_DOMAIN, clientPort: 443 }
          : { server: httpServer },
      },
      appType: "custom",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(root, "dist"), { index: false }));
  }

  // HTML handler (last): resolve meta and serve the SPA shell.
  app.use(async (req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    if (/^\/api(\/|\?|$)/.test(req.originalUrl)) return res.status(404).json({ error: "Not found" });
    try {
      const url = req.originalUrl;
      const seg = url.split("?")[0].split("/").filter(Boolean)[0] ?? "";
      if (seg.includes(".")) return res.status(404).type("text/plain").send("Not found");
      const landing = !NONINDEXABLE.has(seg) && seg !== "resources";
      if (landing) recordPageView(req, seg).catch((err) => console.error("[traffic] page view failed", err));

      const templatePath = isProd ? path.join(root, "dist", "index.html") : path.join(root, "index.html");
      let template = await readFile(templatePath, "utf-8");
      if (vite) template = await vite.transformIndexHtml(url, template);
      const origin = canonicalOrigin();
      const m = await metaFor(seg, origin);
      const html = template
        .replace(/%META_TITLE%/g, escapeHtml(m.title))
        .replace(/%META_DESCRIPTION%/g, escapeHtml(m.description))
        .replace(/%META_CANONICAL%/g, escapeHtml(m.canonical))
        .replace(/%META_OG_IMAGE%/g, escapeHtml(m.ogImage))
        .replace(/%META_OG_TYPE%/g, escapeHtml(m.ogType))
        .replace(/%META_ROBOTS%/g, escapeHtml(m.robots))
        .replace("<!--ANALYTICS-->", await analyticsTags());
      res.status(200).set("Content-Type", "text/html").end(html);
    } catch (err) {
      if (vite) vite.ssrFixStacktrace(err as Error);
      next(err);
    }
  });

  return { app, httpServer };
}

async function main() {
  try {
    await migrateDatabase();
  } catch (e) {
    console.error("[db] migration failed — cannot start", e);
    process.exit(1);
  }
  await seedAll().catch((e) => console.error("[seed] failed", e));
  startRelayWorker();
  const { httpServer } = await createApp();
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`[server] listening on http://0.0.0.0:${PORT} (${isProd ? "production" : "development"})`);
  });
}

const entry = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (entry === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error("[server] fatal", err);
    process.exit(1);
  });
}
