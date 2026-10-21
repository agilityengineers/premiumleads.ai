/**
 * Header and footer shared by the public pages, ported from the design
 * package (Premium Leads.dc.html / Premium Leads Resources.dc.html). Inline
 * styles carry the exact values; hover states are the classes in index.css.
 */
import type { CSSProperties, ReactNode } from "react";
import { onLinkClick } from "../../router";
import type { SiteSettings } from "../../../shared/siteSettingsSchema";

export const HEADER_BG = "rgba(246,249,253,.86)";

export function PublicHeader({
  slug, ctaHref, ctaTarget, ctaLabelShort, onCtaClick, loginUrl, activeNav, homeHref = "/",
}: {
  slug: string; ctaHref: string; ctaTarget: "_self" | "_blank"; ctaLabelShort: string; onCtaClick?: () => void; loginUrl: string; activeNav?: "resources"; homeHref?: string;
}) {
  const base = slug && slug !== "" ? `/${slug}` : "/";
  const navLink = (href: string, label: string, active = false) => (
    <a key={label} href={href} onClick={onLinkClick} className={active ? undefined : "hov-blue"} style={{ color: active ? "#1E88E5" : "#33465F" }}>{label}</a>
  );
  return (
    <header style={{ position: "sticky", top: 0, zIndex: 50, background: HEADER_BG, backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(11,35,71,.08)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
        <a href={homeHref} onClick={onLinkClick} style={{ display: "flex", alignItems: "center" }}><img src="/logo-wordmark.png" alt="Premium Leads" style={{ height: 34, width: "auto", display: "block" }} /></a>
        <nav style={{ display: "flex", alignItems: "center", gap: 22, fontSize: 14.5, fontWeight: 600, whiteSpace: "nowrap", order: 3, flex: "1 1 100%", justifyContent: "center", marginTop: 8 }}>
          {navLink(`${base}#capabilities`, "Capabilities")}
          {navLink(`${base}#how`, "The plan")}
          {navLink(`${base}#usecases`, "Use cases")}
          {navLink(activeNav === "resources" ? "/resources" : `${base}#resources`, "Resources", activeNav === "resources")}
          {navLink(`${base}#faq`, "FAQ")}
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "none" }}>
          <a href={loginUrl} className="hov-bg-soft hov-ink" style={{ color: "#0B2347", fontWeight: 600, fontSize: 14.5, padding: "10px 16px", borderRadius: 8, whiteSpace: "nowrap" }}>Log in</a>
          <a href={ctaHref} target={ctaTarget} rel="noopener" onClick={(e) => { onCtaClick?.(); if (ctaTarget === "_self") onLinkClick(e); }} className="hov-bg-blue" style={{ background: "#0C2E63", color: "#fff", fontWeight: 600, fontSize: 14.5, padding: "11px 18px", borderRadius: 8, transition: "background .2s", whiteSpace: "nowrap" }}>{ctaLabelShort}</a>
        </div>
      </div>
    </header>
  );
}

export function PublicFooter({ site, contactHref = "#contact" }: { site: SiteSettings; contactHref?: string }) {
  const link: CSSProperties = { color: "rgba(230,238,248,.8)" };
  return (
    <footer style={{ background: "#0D1B2E", color: "rgba(230,238,248,.6)", padding: "44px 28px", borderTop: "1px solid rgba(230,238,248,.1)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10 }}>
          <img src="/logo-wordmark-white.png" alt="Premium Leads" style={{ height: 36, width: "auto", maxWidth: "none", display: "block", objectFit: "contain", flex: "none" }} />
          <span style={{ fontSize: 13 }}>Scalable, multi-channel engagement driven by real data.</span>
        </div>
        <div style={{ display: "flex", gap: 22, fontSize: 13.5, fontWeight: 600, flexWrap: "wrap" }}>
          <a href={site.loginUrl} className="hov-cyan" style={link}>Log in</a>
          <a href={contactHref} onClick={onLinkClick} className="hov-cyan" style={link}>Contact us</a>
          <a href={site.termsUrl || "#"} className="hov-cyan" style={link}>Terms of service</a>
          <a href={site.privacyUrl || "#"} className="hov-cyan" style={link}>Privacy policy</a>
        </div>
        <div style={{ fontSize: 12.5, maxWidth: "34ch", lineHeight: 1.5 }}>
          © {new Date().getFullYear()} Premium Leads. All rights reserved.<br />
          <FooterNote site={site} />
        </div>
      </div>
    </footer>
  );
}

/** "Premium Leads is a Find a Business Pro! application." with the brand name linked. */
function FooterNote({ site }: { site: SiteSettings }) {
  const note = site.footerNote || "";
  const text = site.footerNoteLinkText || "";
  const i = text ? note.indexOf(text) : -1;
  if (i < 0 || !site.footerNoteLinkUrl) return <>{note}</>;
  return (
    <>
      {note.slice(0, i)}
      <a href={site.footerNoteLinkUrl} target="_blank" rel="noopener" className="hov-cyan" style={{ color: "rgba(230,238,248,.85)", fontWeight: 600 }}>{text}</a>
      {note.slice(i + text.length)}
    </>
  );
}

export function Eyebrow({ children, color = "#1E88E5", style }: { children: ReactNode; color?: string; style?: CSSProperties }) {
  return <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase", color, marginBottom: 14, ...style }}>{children}</div>;
}

export const H2: CSSProperties = { fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: "clamp(30px,4vw,48px)", lineHeight: 1.08, letterSpacing: "-.02em", margin: 0, textWrap: "pretty" as never };

/** A centered loading state used while a page's data arrives. */
export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7A90", fontWeight: 600, fontSize: 14 }}>
      <span style={{ width: 18, height: 18, border: "2px solid rgba(30,136,229,.25)", borderTopColor: "#1E88E5", borderRadius: "50%", animation: "pl-spin .8s linear infinite", marginRight: 10 }} />{label}
    </div>
  );
}
