/** Call to action & settings: the `site` setting (CTA mode, booking URL, hero video, login URL, SEO & legal). */
import { useState } from "react";
import { api } from "../../api";
import type { SiteSettings } from "../../../shared/siteSettingsSchema";
import { ErrorText, Loading, btnOutlineLg, card, errorMessage, input, kicker, label, useLoader, useSaveHandler, useShell } from "./ui";

export default function SettingsPanel() {
  const shell = useShell();
  const { data, error, setData } = useLoader(() => api.setting<SiteSettings>("site").then((m) => m.value), []);
  const [initial, setInitial] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const serialized = data ? JSON.stringify(data) : null;
  if (data && initial === null) setInitial(serialized);
  const dirty = initial !== null && serialized !== initial;

  useSaveHandler(dirty, async () => {
    if (!data) return;
    const saved = await api.saveSetting<SiteSettings>("site", data);
    setData(saved.value);
    setInitial(JSON.stringify(saved.value));
  });

  if (error) return <ErrorText>{error}</ErrorText>;
  if (!data) return <Loading />;

  const set = (patch: Partial<SiteSettings>) => setData({ ...data, ...patch });
  const text = (key: keyof SiteSettings) => ({ value: String(data[key] ?? ""), onChange: (e: React.ChangeEvent<HTMLInputElement>) => set({ [key]: e.target.value } as Partial<SiteSettings>) });
  const prequal = (data.ctaMode || "prequalify") === "prequalify";
  const mode = (active: boolean): React.CSSProperties => ({ cursor: "pointer", border: "1px solid rgba(11,35,71,.12)", borderRadius: 9, padding: "10px 14px", fontWeight: 700, fontSize: 13.5, fontFamily: "inherit", background: active ? "#0C2E63" : "#fff", color: active ? "#fff" : "#33465F" });

  async function reset() {
    if (!window.confirm("Reset every site setting (pages stay, integrations stay) to the bundled defaults?")) return;
    setActionError("");
    try {
      await api.resetDefaults();
      const fresh = (await api.setting<SiteSettings>("site")).value;
      setData(fresh);
      setInitial(JSON.stringify(fresh));
      shell.refreshBadges();
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  return (
    <div style={{ ...card, padding: 24, display: "grid", gap: 18, maxWidth: 720 }}>
      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#33465F" }}>What the primary buttons do</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={() => set({ ctaMode: "prequalify" })} style={mode(prequal)}>Pre-qualify, then book</button>
          <button type="button" onClick={() => set({ ctaMode: "book-call" })} style={mode(!prequal)}>Book a call directly</button>
        </div>
        <div style={{ fontSize: 12.5, color: "#6B7A90", lineHeight: 1.5 }}>“Pre-qualify” sends every Get started button to the intake form (with the landing page as the door); the form routes to the calendar or to nurture. “Book directly” links straight to the booking URL and shows the simple contact form.</div>
      </div>
      <label style={label}>Booking URL (all “Book a call” CTAs)<input {...text("bookingUrl")} name="bookingUrl" style={input} /></label>
      <label style={label}>Hero Vimeo video ID<input {...text("vimeoId")} name="vimeoId" style={input} /><span style={{ fontWeight: 500, color: "#6B7A90", fontSize: 12.5 }}>From vimeo.com/manage/videos/<em>ID</em>. Changing it swaps the hero embed on every page.</span></label>
      <label style={label}>Login URL<input {...text("loginUrl")} name="loginUrl" style={input} /></label>
      <label style={label}>Contact form recipient<input {...text("contactEmail")} name="contactEmail" style={input} /></label>
      <div style={{ borderTop: "1px solid rgba(11,35,71,.08)", paddingTop: 16, display: "grid", gap: 14 }}>
        <div style={kicker}>Site, SEO &amp; legal</div>
        <label style={label}>Site title suffix<input {...text("siteTitle")} name="siteTitle" placeholder="Premium Leads" style={input} /></label>
        <label style={label}>Default share image URL<input {...text("ogImage")} name="ogImage" placeholder="https://premiumleads.ai/og.png" style={input} /></label>
        <div className="pl-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={label}>Terms of service URL<input {...text("termsUrl")} name="termsUrl" style={input} /></label>
          <label style={label}>Privacy policy URL<input {...text("privacyUrl")} name="privacyUrl" style={input} /></label>
        </div>
        <label style={label}>Footer attribution<input {...text("footerNote")} name="footerNote" placeholder="Premium Leads is a Find a Business Pro! application." style={input} /></label>
      </div>
      {actionError && <ErrorText>{actionError}</ErrorText>}
      <div><button type="button" onClick={reset} style={btnOutlineLg}>Reset everything to defaults</button></div>
    </div>
  );
}
