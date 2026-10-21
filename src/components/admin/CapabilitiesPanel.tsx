/** Capability toggles: one switch per CAPS entry; missing keys are on. */
import { useState } from "react";
import { api } from "../../api";
import type { CapabilitiesSettings } from "../../../shared/siteSettingsSchema";
import { CAPS } from "../../content/caps";
import { ErrorText, Loading, Switch, card, rowBorder, useLoader, useSaveHandler } from "./ui";

export default function CapabilitiesPanel() {
  const { data, error, setData } = useLoader(() => api.setting<CapabilitiesSettings>("capabilities").then((m) => m.value), []);
  const [initial, setInitial] = useState<string | null>(null);
  const serialized = data ? JSON.stringify(data) : null;
  if (data && initial === null) setInitial(serialized);
  const dirty = initial !== null && serialized !== initial;

  useSaveHandler(dirty, async () => {
    if (!data) return;
    const saved = await api.saveSetting<CapabilitiesSettings>("capabilities", data);
    setData(saved.value);
    setInitial(JSON.stringify(saved.value));
  });

  if (error) return <ErrorText>{error}</ErrorText>;
  if (!data) return <Loading />;

  return (
    <div style={{ ...card, overflow: "hidden" }}>
      {CAPS.map((c) => {
        const on = data[c.key] !== false;
        return (
          <div key={c.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, padding: "14px 20px", borderBottom: rowBorder }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>{c.title}</div>
              <div style={{ fontSize: 13, color: "#6B7A90" }}>{c.group}</div>
            </div>
            <Switch on={on} onToggle={() => setData({ ...data, [c.key]: !on })} />
          </div>
        );
      })}
    </div>
  );
}
