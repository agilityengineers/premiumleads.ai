/**
 * Fetch and read a partner page for the Resources pipeline
 * (HANDOFF-resources.md). Normalizes the URL, follows redirects one hop at a
 * time so every hop is checked against private/loopback hosts (SSRF guard),
 * caps the body, and extracts title, meta description, og:*, h1 and the first
 * ~1,500 words of visible text with nav/footer/scripts stripped.
 */
import dns from "node:dns/promises";
import net from "node:net";
import type { ExtractedPage } from "./ai";

const MAX_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 12_000;
const MAX_HOPS = 5;

export class FetchPageError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

/** Adds https:// when missing and rejects anything that is not http(s). */
export function normalizeUrl(input: string): string {
  let raw = input.trim();
  if (!raw) throw new FetchPageError("Paste a URL first.");
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) raw = `https://${raw}`;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new FetchPageError("That doesn't look like a valid URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new FetchPageError("Only http(s) URLs can be fetched.");
  if (url.username || url.password) throw new FetchPageError("URLs with credentials are not allowed.");
  url.hash = "";
  return url.toString();
}

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
    );
  }
  const v6 = ip.toLowerCase();
  if (v6 === "::" || v6 === "::1") return true;
  if (v6.startsWith("fe80") || v6.startsWith("fc") || v6.startsWith("fd")) return true;
  if (v6.startsWith("::ffff:")) return isPrivateIp(v6.slice(7));
  return false;
}

/** Rejects localhost, private and link-local hosts, before any connection is made. */
export async function assertPublicHost(url: URL): Promise<void> {
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new FetchPageError("That host can't be fetched.");
  }
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new FetchPageError("Private and loopback addresses can't be fetched.");
    return;
  }
  let addresses: { address: string }[];
  try {
    addresses = await dns.lookup(host, { all: true });
  } catch {
    throw new FetchPageError("That host could not be resolved.", 422);
  }
  if (addresses.length === 0 || addresses.some((a) => isPrivateIp(a.address))) {
    throw new FetchPageError("That host resolves to a private address and can't be fetched.");
  }
}

/** GET with manual redirects, each hop SSRF-checked. Returns the final URL and HTML. */
export async function fetchHtml(startUrl: string): Promise<{ finalUrl: string; html: string }> {
  let current = new URL(startUrl);
  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    await assertPublicHost(current);
    const res = await fetch(current, {
      redirect: "manual",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PremiumLeadsBot/1.0; +https://premiumleads.ai)",
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) throw new FetchPageError(`The page redirected (HTTP ${res.status}) without a destination.`, 422);
      current = new URL(loc, current);
      continue;
    }
    if (!res.ok) throw new FetchPageError(`The page answered HTTP ${res.status}.`, 422);
    const type = res.headers.get("content-type") || "";
    if (!/text\/html|application\/xhtml/i.test(type)) throw new FetchPageError(`That URL is not an HTML page (${type || "unknown type"}).`, 422);
    const buf = Buffer.from(await res.arrayBuffer());
    return { finalUrl: current.toString(), html: buf.subarray(0, MAX_BYTES).toString("utf8") };
  }
  throw new FetchPageError("Too many redirects.", 422);
}

const decode = (s: string) =>
  s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));

function meta(html: string, names: string[]): string {
  for (const name of names) {
    const re = new RegExp(`<meta[^>]+(?:name|property)=["']${name.replace(/[:.]/g, "\\$&")}["'][^>]*>`, "i");
    const tag = html.match(re)?.[0];
    const content = tag?.match(/content=["']([^"']*)["']/i)?.[1];
    if (content) return decode(content.trim());
  }
  return "";
}

function firstTag(html: string, tag: string): string {
  const m = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? decode(m[1].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim() : "";
}

/** Visible body text with chrome stripped, first ~1,500 words. */
export function visibleText(html: string, maxWords = 1500): string {
  let body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? html;
  for (const tag of ["script", "style", "noscript", "svg", "nav", "footer", "header", "aside", "form", "iframe", "template"]) {
    body = body.replace(new RegExp(`<${tag}[^>]*>[\\s\\S]*?</${tag}>`, "gi"), " ");
  }
  body = body.replace(/<!--[\s\S]*?-->/g, " ");
  body = body.replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/section|\/article)[^>]*>/gi, "\n");
  const text = decode(body.replace(/<[^>]+>/g, " "))
    .replace(/[ \t\r\f\v]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
  return text.split(/\s+/).slice(0, maxWords).join(" ");
}

export function extractPage(url: string, html: string): ExtractedPage {
  return {
    url,
    title: firstTag(html, "title"),
    description: meta(html, ["description"]),
    ogTitle: meta(html, ["og:title", "twitter:title"]),
    ogDescription: meta(html, ["og:description", "twitter:description"]),
    ogImage: meta(html, ["og:image", "twitter:image"]),
    h1: firstTag(html, "h1"),
    bodyText: visibleText(html),
  };
}
