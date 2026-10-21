/** Packages & pricing: the section switch (sections.pricing) and the tier cards (pricing.tiers). */
import { useState } from "react";
import { api } from "../../api";
import { sectionOn, type PricingSettings, type SectionsSettings } from "../../../shared/siteSettingsSchema";
import { ErrorText, Loading, Switch, card, useLoader, useSaveHandler, useShell } from "./ui";

type State = { sections: SectionsSettings; pricing: PricingSettings };

const field: React.CSSProperties = { border: "1px solid rgba(11,35,71,.15)", borderRadius: 8, padding: "9px 11px" };

export default function PricingPanel() {
  const shell = useShell();
  const { data, error, setData } = useLoader<State>(async () => {
    const [sections, pricing] = await Promise.all([api.setting<SectionsSettings>("sections"), api.setting<PricingSettings>("pricing")]);
    return { sections: sections.value, pricing: pricing.value };
  }, []);
  const [initial, setInitial] = useState<State | null>(null);
  if (data && initial === null) setInitial(data);
  const sectionsDirty = !!data && !!initial && JSON.stringify(data.sections) !== JSON.stringify(initial.sections);
  const pricingDirty = !!data && !!initial && JSON.stringify(data.pricing) !== JSON.stringify(initial.pricing);

  useSaveHandler(sectionsDirty || pricingDirty, async () => {
    if (!data) return;
    let next = data;
    if (sectionsDirty) next = { ...next, sections: (await api.saveSetting<SectionsSettings>("sections", data.sections)).value };
    if (pricingDirty) next = { ...next, pricing: (await api.saveSetting<PricingSettings>("pricing", data.pricing)).value };
    setData(next);
    setInitial(next);
    shell.refreshBadges();
  });

  if (error) return <ErrorText>{error}</ErrorText>;
  if (!data) return <Loading />;

  const on = sectionOn(data.sections, "pricing");
  const setTier = (i: number, patch: Partial<PricingSettings["tiers"][number]>) =>
    setData({ ...data, pricing: { tiers: data.pricing.tiers.map((t, j) => (j === i ? { ...t, ...patch } : t)) } });

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 900 }}>
      <div style={{ ...card, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14.5 }}>Show pricing section on the landing page</div>
          <div style={{ fontSize: 13, color: "#6B7A90" }}>Off by default — plans and billing live inside app.premiumleads.ai.</div>
        </div>
        <Switch on={on} onToggle={() => setData({ ...data, sections: { ...data.sections, pricing: !on } })} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,260px),1fr))", gap: 16 }}>
        {data.pricing.tiers.map((t, i) => (
          <div key={i} style={{ ...card, padding: 20, display: "grid", gap: 10 }}>
            <input value={t.name} onChange={(e) => setTier(i, { name: e.target.value })} aria-label="Tier name" style={{ ...field, fontSize: 15, fontWeight: 700 }} />
            <input value={t.price} onChange={(e) => setTier(i, { price: e.target.value })} aria-label="Tier price" style={{ ...field, fontSize: 14 }} />
            <textarea value={t.features} onChange={(e) => setTier(i, { features: e.target.value })} rows={5} aria-label="Tier features" style={{ ...field, fontSize: 13.5, resize: "vertical" }} />
            <span style={{ fontSize: 12, color: "#6B7A90" }}>One feature per line</span>
          </div>
        ))}
      </div>
    </div>
  );
}
