/** Section toggles for the landing-page template (pricing is managed under Packages & pricing). */
import { useState } from "react";
import { api } from "../../api";
import { SECTION_DEFS, sectionOn, type SectionsSettings } from "../../../shared/siteSettingsSchema";
import { ErrorText, Loading, Switch, card, rowBorder, useLoader, useSaveHandler } from "./ui";

const SECTIONS = SECTION_DEFS.filter((s) => s.key !== "pricing");

export default function SectionsPanel() {
  const { data, error, setData } = useLoader(() => api.setting<SectionsSettings>("sections").then((m) => m.value), []);
  const [initial, setInitial] = useState<string | null>(null);
  const serialized = data ? JSON.stringify(data) : null;
  if (data && initial === null) setInitial(serialized);
  const dirty = initial !== null && serialized !== initial;

  useSaveHandler(dirty, async () => {
    if (!data) return;
    const saved = await api.saveSetting<SectionsSettings>("sections", data);
    setData(saved.value);
    setInitial(JSON.stringify(saved.value));
  });

  if (error) return <ErrorText>{error}</ErrorText>;
  if (!data) return <Loading />;

  return (
    <div style={{ ...card, overflow: "hidden", maxWidth: 720 }}>
      {SECTIONS.map((s) => {
        const on = sectionOn(data, s.key);
        return (
          <div key={s.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, padding: "14px 20px", borderBottom: rowBorder }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: "#6B7A90" }}>{s.note}</div>
            </div>
            <Switch on={on} onToggle={() => setData({ ...data, [s.key]: !on })} />
          </div>
        );
      })}
    </div>
  );
}
