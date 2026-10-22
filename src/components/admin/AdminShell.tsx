/**
 * The signed-in frame: sidebar navigation (filtered by role), page header with
 * "Save & publish", and the routed panel. One sub-path per tab under /admin.
 * Under 900px the sidebar becomes a sticky top bar (logo + the current tab as
 * a menu button) and the navigation drops down from it — see `.pl-admin-*`
 * in index.css.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api";
import { navigate, onLinkClick, useLocation } from "../../router";
import { ROLE_LABELS, roleAllows, type UserRecord } from "../../../shared/usersSchema";
import { sectionOn, type CapabilitiesSettings, type SectionsSettings } from "../../../shared/siteSettingsSchema";
import { CAPS } from "../../content/caps";
import { ErrorText, ShellContext, errorMessage, initials, type ShellHost } from "./ui";
import OverviewPanel from "./OverviewPanel";
import PagesPanel from "./PagesPanel";
import CapabilitiesPanel from "./CapabilitiesPanel";
import SectionsPanel from "./SectionsPanel";
import ResourcesPanel from "./ResourcesPanel";
import SettingsPanel from "./SettingsPanel";
import FormPanel from "./FormPanel";
import RoutingPanel from "./RoutingPanel";
import PricingPanel from "./PricingPanel";
import LeadsPanel from "./LeadsPanel";
import TrafficPanel from "./TrafficPanel";
import UsersPanel from "./UsersPanel";
import IntegrationsPanel from "./IntegrationsPanel";

export type NavItem = { key: string; label: string; hint: string; eyebrow: string; title: string; desc: string; section?: string };

/** `NAV` from the spec, plus the Routing rules tab. */
export const NAV: NavItem[] = [
  { key: "overview", label: "Overview", hint: "How the site is doing", eyebrow: "Dashboard", title: "Overview", desc: "Leads, traffic and integration health at a glance." },
  { section: "Site", key: "pages", label: "Landing pages", hint: "The home page and every audience version of it", eyebrow: "Site", title: "Landing pages", desc: "The home page plus one version of it per industry or target audience, each at its own address. Drafts stay private until you publish them." },
  { key: "caps", label: "Capabilities", hint: "Which product capabilities appear on the site", eyebrow: "Site", title: "Capability toggles", desc: "Hidden capabilities are removed from the Capabilities grid on every page. Use this to include or exclude features as the platform evolves." },
  { key: "sections", label: "Sections", hint: "Turn page sections on or off", eyebrow: "Site", title: "Sections", desc: "Show or hide whole sections of the landing page template." },
  { key: "resources", label: "Resources", hint: "Complementary apps shown on /resources", eyebrow: "Site", title: "Resources", desc: "Complementary applications you use to support clients. Paste a URL — we snapshot the page and pull its title and description, then you refine the copy." },
  { section: "Funnel", key: "settings", label: "Call to action", hint: "Where the buttons send people", eyebrow: "Funnel", title: "Call to action & settings", desc: "What the primary buttons do — pre-qualify first or book straight away — plus the booking link, hero video and login URL." },
  { key: "form", label: "Pre-qualification form", hint: "What a prospect answers before booking", eyebrow: "Funnel", title: "Pre-qualification form", desc: "The shared intake. Seven system questions and the two Brand Voice Interview-locked answer sets are fixed so submissions sync cleanly to The Authority Desk and Brand Voice Interview; everything else — including the door-specific section — is editable." },
  { key: "routing", label: "Routing rules", hint: "Where a prospect goes after the form", eyebrow: "Funnel", title: "Routing rules", desc: "Where a prospect goes after the form: rules read their answers top to bottom, first match wins. Everyone else books a call." },
  { key: "pricing", label: "Packages & pricing", hint: "Tiers and whether they show", eyebrow: "Funnel", title: "Packages & pricing", desc: "Pricing lives in the app. Turn the section on here only if you want tiers on the public page." },
  { section: "People", key: "leads", label: "Leads", hint: "Everyone who came through the form", eyebrow: "People", title: "Leads", desc: "One person per email, whichever door they came through, with routing outcome and sync status in The Authority Desk and Brand Voice Interview." },
  { section: "Account", key: "users", label: "Users & roles", hint: "Who can sign in and what they see", eyebrow: "Account", title: "Users & roles", desc: "Invite teammates and advisors. Advisors see leads only; admins run the site; super admins also manage users and integrations." },
  { key: "integrations", label: "Integrations", hint: "SendGrid, Authority Desk, Brand Voice, scheduler, AI", eyebrow: "Account", title: "Integrations", desc: "Keys, secrets and connection status for every system this site talks to." },
  { section: "Insights", key: "traffic", label: "Traffic", hint: "CTA clicks per page", eyebrow: "Insights", title: "Traffic", desc: "Primary-CTA clicks recorded per landing page in this preview." },
];

export function pathFor(key: string): string {
  return key === "overview" ? "/admin" : `/admin/${key}`;
}

type Badges = Partial<Record<"leads" | "resources" | "pages" | "caps" | "pricing", string>>;

export default function AdminShell({ user, onLogout }: { user: UserRecord; onLogout: () => void }) {
  const { pathname, search } = useLocation();
  const parts = pathname.split("/").filter(Boolean); // ["admin", tab?, ...rest]
  const requested = parts[1] ?? "overview";
  const rest = parts.slice(2);
  const query = useMemo(() => new URLSearchParams(search), [search]);
  const homeTab = user.role === "advisor" ? "leads" : "overview";
  const nav = NAV.find((n) => n.key === requested);
  const tab = nav && roleAllows(user.role, requested) ? requested : homeTab;
  const current = NAV.find((n) => n.key === tab) ?? NAV[0];
  const [navOpen, setNavOpen] = useState(false);
  useEffect(() => { setNavOpen(false); }, [tab]);

  // A tab this role can't open (or an unknown one) bounces to the role's home tab.
  useEffect(() => {
    if (tab !== requested) navigate(pathFor(tab), { replace: true });
  }, [tab, requested]);

  /* ---- badges ---- */
  const [badges, setBadges] = useState<Badges>({});
  const refreshBadges = useCallback(() => {
    const role = user.role;
    const safe = <T,>(p: Promise<T>): Promise<T | null> => p.catch(() => null);
    void Promise.all([
      roleAllows(role, "leads") ? safe(api.contacts({ limit: 1 })) : Promise.resolve(null),
      roleAllows(role, "resources") ? safe(api.adminResources()) : Promise.resolve(null),
      roleAllows(role, "pages") ? safe(api.adminVariants()) : Promise.resolve(null),
      roleAllows(role, "caps") ? safe(api.setting<CapabilitiesSettings>("capabilities")) : Promise.resolve(null),
      roleAllows(role, "sections") ? safe(api.setting<SectionsSettings>("sections")) : Promise.resolve(null),
    ]).then(([contacts, resources, variants, caps, sections]) => {
      setBadges({
        leads: contacts ? String(contacts.total) : undefined,
        resources: resources ? String(resources.length) : undefined,
        pages: variants ? String(variants.variants.length) : undefined,
        caps: caps ? `${CAPS.filter((c) => caps.value[c.key] !== false).length}/${CAPS.length}` : undefined,
        pricing: sections ? (sectionOn(sections.value, "pricing") ? "On" : "Off") : undefined,
      });
    });
  }, [user.role]);
  useEffect(() => { refreshBadges(); }, [refreshBadges]);

  /* ---- save & publish ---- */
  const saveFn = useRef<(() => Promise<void>) | null>(null);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const host = useMemo<ShellHost>(() => ({ user, register: (fn) => { saveFn.current = fn; }, setDirty, refreshBadges }), [user, refreshBadges]);

  async function saveAll() {
    if (saving) return;
    setSaving(true);
    setSaveError("");
    try {
      if (saveFn.current) await saveFn.current();
      setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      refreshBadges();
    } catch (err) {
      setSaveError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }
  useEffect(() => { setSaveError(""); }, [tab]);

  async function signOut() {
    try { await api.logout(); } catch { /* the cookie is gone either way */ }
    onLogout();
  }

  const saveState = dirty ? "Unsaved changes" : savedAt ? `Published ${savedAt}` : "All changes published";
  const navItems = NAV.filter((n) => roleAllows(user.role, n.key));
  const badgeFor = (key: string): string => (badges as Record<string, string | undefined>)[key] ?? "";

  const creating = tab === "pages" ? (query.get("new") === "blank" ? "blank" : query.get("new") === "ai" ? "ai" : null) : null;
  const toggleCreate = (kind: "blank" | "ai") => navigate(creating === kind ? "/admin/pages" : `/admin/pages?new=${kind}`, { scrollTop: false });
  const editingSlug = tab === "pages" && rest[0] === "edit" ? query.get("slug") : null;
  const leadId = tab === "leads" && rest[0] ? Number(rest[0]) : null;

  let panel: React.ReactNode = null;
  switch (tab) {
    case "overview": panel = <OverviewPanel />; break;
    case "pages": panel = <PagesPanel creating={creating} editingSlug={editingSlug} />; break;
    case "caps": panel = <CapabilitiesPanel />; break;
    case "sections": panel = <SectionsPanel />; break;
    case "resources": panel = <ResourcesPanel />; break;
    case "settings": panel = <SettingsPanel />; break;
    case "form": panel = <FormPanel />; break;
    case "routing": panel = <RoutingPanel />; break;
    case "pricing": panel = <PricingPanel />; break;
    case "leads": panel = <LeadsPanel openId={leadId && Number.isFinite(leadId) ? leadId : null} />; break;
    case "traffic": panel = <TrafficPanel />; break;
    case "users": panel = <UsersPanel />; break;
    case "integrations": panel = <IntegrationsPanel />; break;
  }

  return (
    <ShellContext.Provider value={host}>
      <div className="pl-admin-shell" style={{ display: "grid", gridTemplateColumns: "240px minmax(0,1fr)", minHeight: "100vh" }}>
        <aside className={`pl-admin-aside${navOpen ? " is-open" : ""}`} style={{ background: "#0D1B2E", color: "#E6EEF8", padding: "22px 16px", display: "flex", flexDirection: "column", gap: 4, position: "sticky", top: 0, height: "100vh", boxSizing: "border-box", overflowY: "auto", zIndex: 40 }}>
          <div className="pl-admin-aside-top">
            <img src="/logo-wordmark-white.png" alt="Premium Leads" width={800} height={112} style={{ width: "100%", height: "auto", alignSelf: "flex-start", margin: "4px 0 18px" }} />
            <button type="button" className="pl-admin-menu-btn" aria-expanded={navOpen} aria-controls="pl-admin-nav" onClick={() => setNavOpen((v) => !v)}>
              <span>{current.label}</span>
              <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none", transform: navOpen ? "rotate(180deg)" : undefined }}><path d="M6 9l6 6 6-6" /></svg>
            </button>
          </div>
          <div id="pl-admin-nav" className="pl-admin-nav">
          {navItems.map((n) => {
            const active = tab === n.key;
            return (
              <div key={n.key} style={{ display: "contents" }}>
                {n.section && <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(230,238,248,.4)", padding: "14px 12px 6px" }}>{n.section}</div>}
                <button
                  type="button"
                  onClick={() => navigate(pathFor(n.key))}
                  title={n.hint}
                  style={{ textAlign: "left", cursor: "pointer", border: 0, borderRadius: 9, padding: "10px 12px", fontSize: 14, fontWeight: 600, fontFamily: "inherit", display: "flex", justifyContent: "space-between", alignItems: "center", background: active ? "rgba(30,136,229,.22)" : "transparent", color: active ? "#fff" : "rgba(230,238,248,.75)" }}
                >
                  {n.label}<span style={{ fontSize: 11, fontWeight: 700, opacity: 0.6 }}>{badgeFor(n.key)}</span>
                </button>
              </div>
            );
          })}
          </div>
          <div className="pl-admin-aside-foot" style={{ marginTop: "auto", display: "grid", gap: 8, paddingTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 10px", borderRadius: 9, background: "rgba(230,238,248,.06)" }}>
              <span style={{ flex: "none", width: 30, height: 30, borderRadius: "50%", background: "#1E88E5", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>{initials(user.name || user.email)}</span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</span>
                <span style={{ display: "block", fontSize: 11, color: "rgba(230,238,248,.55)" }}>{ROLE_LABELS[user.role] ?? user.role}</span>
              </span>
              <button type="button" onClick={signOut} title="Sign out" className="hov-white" style={{ marginLeft: "auto", cursor: "pointer", background: "none", border: 0, color: "rgba(230,238,248,.6)", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}>Sign out</button>
            </div>
            <a href="/" onClick={onLinkClick} className="hov-bg-soft-light" style={{ display: "block", textAlign: "center", border: "1px solid rgba(230,238,248,.2)", borderRadius: 9, padding: 10, fontSize: 13.5, fontWeight: 700, color: "#E6EEF8" }}>View site ↗</a>
            <div style={{ fontSize: 12, color: "rgba(230,238,248,.5)", textAlign: "center" }}>{saveState}</div>
          </div>
        </aside>

        <main className="pl-admin-main" style={{ padding: "36px 40px", display: "grid", gap: 24, alignContent: "start" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20, flexWrap: "wrap" }}>
            <div style={{ maxWidth: 640 }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "#1E88E5", marginBottom: 6 }}>{current.eyebrow}</div>
              <h1 style={{ fontFamily: "Sora,sans-serif", fontWeight: 700, fontSize: 28, letterSpacing: "-.02em", margin: "0 0 6px" }}>{current.title}</h1>
              <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.55, color: "#4A5B74" }}>{current.desc}</p>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {tab === "pages" && (
                <>
                  <button type="button" onClick={() => toggleCreate("blank")} style={{ cursor: "pointer", background: "#fff", border: "1px solid rgba(11,35,71,.12)", color: "#33465F", borderRadius: 9, padding: "10px 16px", fontWeight: 700, fontSize: 14, fontFamily: "inherit" }}>+ New blank page</button>
                  <button type="button" onClick={() => toggleCreate("ai")} style={{ cursor: "pointer", background: "#1E88E5", color: "#fff", border: 0, borderRadius: 9, padding: "10px 16px", fontWeight: 700, fontSize: 14, fontFamily: "inherit" }}>✦ Generate with AI</button>
                </>
              )}
              <button type="button" onClick={saveAll} disabled={saving} className="hov-bg-blue" style={{ cursor: "pointer", background: "#0C2E63", color: "#fff", border: 0, borderRadius: 9, padding: "10px 18px", fontWeight: 700, fontSize: 14, fontFamily: "inherit", transition: "background .2s" }}>Save &amp; publish</button>
            </div>
          </div>
          {saveError && <ErrorText>{saveError}</ErrorText>}
          {panel}
        </main>
      </div>
    </ShellContext.Provider>
  );
}
