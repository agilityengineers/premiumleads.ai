/**
 * /resources — complementary tools, a pixel-faithful port of
 * Premium Leads Resources.dc.html: one full-width card per resource, the
 * snapshot alternating left/right (odd rows image left, even rows image right),
 * stacking to one column under ~800px via the auto-fit grid.
 */
import { useEffect, useState } from "react";
import { api } from "../api";
import { PublicHeader, PublicFooter, Loading } from "../components/shared/chrome";
import { DEFAULT_SITE_SETTINGS } from "../../shared/siteDefaults";
import type { SiteSettings } from "../../shared/siteSettingsSchema";
import { resourceHost, resourceInitials } from "../../shared/resourceText";
import type { ResourceRecord } from "../../shared/resourceSchema";

const SORA = "Sora, sans-serif";

export default function Resources() {
  const [site, setSite] = useState<SiteSettings | null>(null);
  const [list, setList] = useState<ResourceRecord[] | null>(null);
  useEffect(() => {
    let alive = true;
    api.config().then((c) => alive && setSite(c.site)).catch(() => alive && setSite(DEFAULT_SITE_SETTINGS));
    api.resources().then((r) => alive && setList(r)).catch(() => alive && setList([]));
    document.title = "Resources — Premium Leads";
    return () => { alive = false; };
  }, []);
  if (!site || !list) return <Loading />;
  const bookingUrl = site.bookingUrl;
  return (
    <>
      <PublicHeader slug="" ctaHref={bookingUrl} ctaTarget="_blank" ctaLabelShort="Book a call" loginUrl={site.loginUrl} activeNav="resources" />

      <section style={{ padding: "calc(var(--pl-sec-sm) + 24px) var(--pl-gutter) var(--pl-sec-sm)", background: "radial-gradient(800px 400px at 90% 0%, rgba(0,178,239,.16), transparent 60%)" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "#1E88E5", marginBottom: 18 }}>Resources</div>
          <h1 style={{ fontFamily: SORA, fontWeight: 700, fontSize: "clamp(34px,4.6vw,56px)", lineHeight: 1.06, letterSpacing: "-.025em", margin: "0 0 18px" }}>The tools we use alongside Premium Leads.</h1>
          <p style={{ fontSize: 18, lineHeight: 1.6, color: "#4A5B74", margin: 0, maxWidth: "40em", textWrap: "pretty" as never }}>Outreach works best when the prospect finds a credible expert on the other end. These are the complementary applications we use to support clients — voice, authority content and nurture — so every touch Premium Leads makes lands on solid ground.</p>
        </div>
      </section>

      <section style={{ padding: "0 var(--pl-gutter) var(--pl-sec)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gap: 24 }}>
          {list.map((r, i) => <ResourceCard key={r.id} r={r} dir={i % 2 ? "rtl" : "ltr"} />)}
          {list.length === 0 && <div style={{ textAlign: "center", color: "#6B7A90", padding: 40 }}>No resources published yet.</div>}
        </div>
      </section>

      <section style={{ background: "#0C2E63", backgroundImage: "radial-gradient(700px 400px at 100% 0%, rgba(0,178,239,.3), transparent 60%)", color: "#fff", padding: "calc(var(--pl-sec-lg) - 20px) var(--pl-gutter)", textAlign: "center" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <h2 style={{ fontFamily: SORA, fontWeight: 700, fontSize: "clamp(28px,4vw,44px)", lineHeight: 1.08, letterSpacing: "-.02em", margin: "0 0 16px", color: "#fff" }}>Want the whole system working for you?</h2>
          <p style={{ fontSize: 17, lineHeight: 1.6, color: "rgba(255,255,255,.76)", margin: "0 0 28px" }}>Book a call and we'll show you how Premium Leads and these tools fit together for your audience.</p>
          <a href={bookingUrl} target="_blank" rel="noopener" className="hov-lift hov-night" style={{ display: "inline-block", background: "#00B2EF", color: "#0D1B2E", fontWeight: 700, fontSize: 16, padding: "16px 30px", borderRadius: 10, transition: "transform .2s" }}>Book a call →</a>
        </div>
      </section>

      <PublicFooter site={site} contactHref="/#contact" />
    </>
  );
}

function ResourceCard({ r, dir }: { r: ResourceRecord; dir: "ltr" | "rtl" }) {
  const [imgOk, setImgOk] = useState(true);
  const hasUrl = Boolean(r.url);
  const initials = resourceInitials(r.name);
  const host = resourceHost(r.url);
  const Media = hasUrl ? "a" : "div";
  return (
    <article style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,380px),1fr))", direction: dir, background: "#fff", border: "1px solid rgba(11,35,71,.08)", borderRadius: 20, overflow: "hidden", boxShadow: "0 24px 48px -40px rgba(12,46,99,.4)" }}>
      <Media {...(hasUrl ? { href: r.url, target: "_blank", rel: "noopener" } : {})} style={{ direction: "ltr", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", minHeight: "var(--pl-media-h)", background: "linear-gradient(135deg,#0C2E63,#1E88E5)", overflow: "hidden" }}>
        <span style={{ fontFamily: SORA, fontWeight: 700, fontSize: 56, color: "rgba(255,255,255,.9)", letterSpacing: "-.03em" }}>{initials}</span>
        {hasUrl && r.snapshot && imgOk && <img src={r.snapshot} alt={`Snapshot of ${r.name}`} loading="lazy" decoding="async" onError={() => setImgOk(false)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />}
        {hasUrl && <span style={{ position: "absolute", left: 16, bottom: 14, background: "rgba(13,27,46,.85)", color: "#fff", fontSize: 12, fontWeight: 700, padding: "6px 10px", borderRadius: 7 }}>{host}</span>}
      </Media>
      <div style={{ direction: "ltr", padding: "calc(var(--pl-card) - 2px) var(--pl-card)", display: "flex", flexDirection: "column", gap: 14 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "#1E88E5" }}>{r.category}</span>
        <h2 style={{ fontFamily: SORA, fontWeight: 700, fontSize: 28, letterSpacing: "-.02em", margin: 0, lineHeight: 1.1 }}>{r.name}</h2>
        <p style={{ fontSize: 17, fontWeight: 600, color: "#0B2347", margin: 0, lineHeight: 1.45 }}>{r.tagline}</p>
        <p style={{ fontSize: 15.5, lineHeight: 1.6, color: "#4A5B74", margin: 0 }}>{r.description}</p>
        <ul style={{ listStyle: "none", margin: "4px 0 0", padding: 0, display: "grid", gap: 8 }}>
          {(r.highlights || []).map((hl) => <li key={hl} style={{ display: "flex", gap: 10, fontSize: 14.5, color: "#33465F" }}><span style={{ color: "#1E88E5", fontWeight: 700 }}>—</span>{hl}</li>)}
        </ul>
        {hasUrl && <div style={{ marginTop: "auto", paddingTop: 10 }}><a href={r.url} target="_blank" rel="noopener" className="hov-bg-blue" style={{ display: "inline-block", background: "#0C2E63", color: "#fff", fontWeight: 700, fontSize: 14.5, padding: "12px 20px", borderRadius: 9, transition: "background .2s" }}>Visit {r.name} ↗</a></div>}
      </div>
    </article>
  );
}

