/**
 * Header and footer shared by the public pages, ported from the design
 * package (Premium Leads.dc.html / Premium Leads Resources.dc.html). The
 * header's layout lives in index.css (`.pl-header*`, `.pl-nav`) because it
 * changes shape on a phone: under 800px the nav collapses behind a menu
 * button and "Log in" moves into that menu, leaving the logo and the primary
 * CTA on one row. Hover states are the classes in index.css.
 */
import { useEffect, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { onLinkClick } from "../../router";
import type { SiteSettings } from "../../../shared/siteSettingsSchema";

export const HEADER_BG = "rgba(246,249,253,.86)";

export function PublicHeader({
  slug, ctaHref, ctaTarget, ctaLabelShort, onCtaClick, loginUrl, activeNav, homeHref = "/",
}: {
  slug: string; ctaHref: string; ctaTarget: "_self" | "_blank"; ctaLabelShort: string; onCtaClick?: () => void; loginUrl: string; activeNav?: "resources"; homeHref?: string;
}) {
  const [open, setOpen] = useState(false);
  const base = slug && slug !== "" ? `/${slug}` : "/";

  // The menu closes on Escape and whenever the viewport grows past the phone layout.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const mq = window.matchMedia("(min-width: 801px)");
    const onResize = () => { if (mq.matches) setOpen(false); };
    window.addEventListener("keydown", onKey);
    mq.addEventListener("change", onResize);
    return () => { window.removeEventListener("keydown", onKey); mq.removeEventListener("change", onResize); };
  }, [open]);

  const go = (e: MouseEvent<HTMLAnchorElement>) => { setOpen(false); onLinkClick(e); };
  const navLink = (href: string, label: string, active = false) => (
    <a key={label} href={href} onClick={go} className={active ? "is-active" : "hov-blue"}>{label}</a>
  );
  return (
    <header className="pl-header">
      <div className="pl-header-inner">
        <a href={homeHref} onClick={go} className="pl-header-logo" aria-label="Premium Leads home"><img src="/logo-wordmark.png" alt="Premium Leads" width={264} height={34} /></a>
        <nav id="pl-site-nav" className={`pl-nav${open ? " is-open" : ""}`} aria-label="Site">
          {navLink(`${base}#capabilities`, "Capabilities")}
          {navLink(`${base}#how`, "The plan")}
          {navLink(`${base}#usecases`, "Use cases")}
          {navLink(activeNav === "resources" ? "/resources" : `${base}#resources`, "Resources", activeNav === "resources")}
          {navLink(`${base}#faq`, "FAQ")}
          <a href={loginUrl} className="pl-nav-login hov-blue">Log in</a>
        </nav>
        <div className="pl-header-actions">
          <a href={loginUrl} className="pl-header-login hov-bg-soft hov-ink">Log in</a>
          <a href={ctaHref} target={ctaTarget} rel="noopener" onClick={(e) => { onCtaClick?.(); setOpen(false); if (ctaTarget === "_self") onLinkClick(e); }} className="pl-header-cta hov-bg-blue">{ctaLabelShort}</a>
          <button type="button" className="pl-menu-btn" aria-expanded={open} aria-controls="pl-site-nav" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((v) => !v)}>
            {open ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

export function PublicFooter({ site, contactHref = "#contact" }: { site: SiteSettings; contactHref?: string }) {
  return (
    <footer style={{ background: "#0D1B2E", color: "rgba(230,238,248,.6)", padding: "44px var(--pl-gutter)", borderTop: "1px solid rgba(230,238,248,.1)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10 }}>
          <img src="/logo-wordmark-white.png" alt="Premium Leads" width={257} height={36} loading="lazy" style={{ height: 36, width: "auto", maxWidth: "none", display: "block", objectFit: "contain", flex: "none" }} />
          <span style={{ fontSize: 13 }}>Scalable, multi-channel engagement driven by real data.</span>
        </div>
        <div className="pl-footer-links">
          <a href={site.loginUrl} className="hov-cyan">Log in</a>
          <a href={contactHref} onClick={onLinkClick} className="hov-cyan">Contact us</a>
          <a href={site.termsUrl || "#"} className="hov-cyan">Terms of service</a>
          <a href={site.privacyUrl || "#"} className="hov-cyan">Privacy policy</a>
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
      <a href={site.footerNoteLinkUrl} target="_blank" rel="noopener" className="hov-cyan" style={{ color: "rgba(230,238,248,.85)", fontWeight: 600, display: "inline-block", padding: "6px 0" }}>{text}</a>
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
