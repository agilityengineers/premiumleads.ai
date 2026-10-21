/** Integrations (super admins only): one card per INTEGRATION_DEFS entry; secrets are write-only. */
import { useState } from "react";
import { api } from "../../api";
import { INTEGRATION_DEFS, type IntegrationDef, type IntegrationFieldDef, type IntegrationStatus } from "../../../shared/siteSettingsSchema";
import { ErrorText, Loading, MONO, StatusDot, Switch, btnOutline, btnTiny, card, errorMessage, inputSm, labelSm, useLoader, useSaveHandler } from "./ui";

type Edit = { values: Record<string, string | boolean>; secrets: Record<string, string> };
type TestState = "busy" | { ok: boolean; detail: string };

/** The deployment's own URL for a read-only callback/webhook field, from the placeholder's path. */
function derivedUrl(placeholder: string): string {
  try {
    return `${window.location.origin}${new URL(placeholder).pathname}`;
  } catch {
    return placeholder;
  }
}

export default function IntegrationsPanel() {
  const { data, error, setData } = useLoader(() => api.integrations(), []);
  const [edits, setEdits] = useState<Record<string, Edit>>({});
  const [tested, setTested] = useState<Record<string, TestState>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const statusOf = (key: string): IntegrationStatus | undefined => data?.integrations.find((s) => s.key === key);
  const editOf = (key: string): Edit => edits[key] ?? { values: { ...(statusOf(key)?.values ?? {}) }, secrets: {} };
  const isDirty = (key: string): boolean => {
    const e = edits[key];
    if (!e) return false;
    return JSON.stringify(e.values) !== JSON.stringify(statusOf(key)?.values ?? {}) || Object.values(e.secrets).some((v) => v.trim() !== "");
  };
  const dirtyKeys = INTEGRATION_DEFS.map((g) => g.key).filter(isDirty);

  async function saveCard(key: string): Promise<void> {
    const e = editOf(key);
    const secrets: Record<string, string | null> = {};
    for (const [field, value] of Object.entries(e.secrets)) if (value.trim() !== "") secrets[field] = value.trim();
    setSaving(key);
    setErrors((x) => ({ ...x, [key]: "" }));
    try {
      const res = await api.saveIntegration(key, { values: e.values, secrets });
      setData((d) => d && { ...d, integrations: res.integrations });
      setEdits((x) => { const next = { ...x }; delete next[key]; return next; });
    } catch (err) {
      setErrors((x) => ({ ...x, [key]: errorMessage(err) }));
      throw err;
    } finally {
      setSaving(null);
    }
  }

  useSaveHandler(dirtyKeys.length > 0, async () => {
    for (const key of dirtyKeys) await saveCard(key);
  });

  if (error) return <ErrorText>{error}</ErrorText>;
  if (!data) return <Loading />;

  const editIn = (all: Record<string, Edit>, key: string): Edit => all[key] ?? { values: { ...(statusOf(key)?.values ?? {}) }, secrets: {} };
  const setValue = (key: string, field: string, value: string | boolean) => setEdits((x) => { const cur = editIn(x, key); return { ...x, [key]: { ...cur, values: { ...cur.values, [field]: value } } }; });
  const setSecret = (key: string, field: string, value: string) => setEdits((x) => { const cur = editIn(x, key); return { ...x, [key]: { ...cur, secrets: { ...cur.secrets, [field]: value } } }; });

  async function clearSecret(key: string, field: string) {
    setErrors((x) => ({ ...x, [key]: "" }));
    try {
      const res = await api.saveIntegration(key, { values: {}, secrets: { [field]: null } });
      setData((d) => d && { ...d, integrations: res.integrations });
      setEdits((x) => (x[key] ? { ...x, [key]: { ...x[key], secrets: { ...x[key].secrets, [field]: "" } } } : x));
    } catch (err) {
      setErrors((x) => ({ ...x, [key]: errorMessage(err) }));
    }
  }

  async function test(key: string) {
    setTested((x) => ({ ...x, [key]: "busy" }));
    try {
      const res = await api.testIntegration(key);
      setTested((x) => ({ ...x, [key]: res }));
    } catch (err) {
      setTested((x) => ({ ...x, [key]: { ok: false, detail: errorMessage(err) } }));
    }
  }

  const renderField = (g: IntegrationDef, f: IntegrationFieldDef, status: IntegrationStatus | undefined, e: Edit) => {
    const span = f.type === "url" ? "1 / -1" : "auto";
    const font = f.type === "url" || f.type === "password" ? MONO : "inherit";
    if (f.type === "password") {
      const saved = Boolean(status?.secretsSet[f.key]);
      return (
        <div key={f.key} style={{ ...labelSm, gridColumn: span }}>
          <span>{f.label}</span>
          <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="password" name={f.key} value={e.secrets[f.key] ?? ""} placeholder={saved ? "•••• (saved)" : f.placeholder} autoComplete="new-password" aria-label={f.label} onChange={(ev) => setSecret(g.key, f.key, ev.target.value)} style={{ ...inputSm, fontFamily: font, flex: 1, minWidth: 0 }} />
            {saved && <button type="button" onClick={() => clearSecret(g.key, f.key)} title="Forget the saved secret" style={btnTiny}>Clear</button>}
          </span>
        </div>
      );
    }
    if (f.readOnly) {
      return (
        <label key={f.key} style={{ ...labelSm, gridColumn: span }}>
          <span>{f.label}</span>
          <input type="text" name={f.key} value={derivedUrl(f.placeholder)} readOnly disabled style={{ ...inputSm, fontFamily: font, background: "#F1F5FA" }} />
        </label>
      );
    }
    const raw = e.values[f.key];
    return (
      <label key={f.key} style={{ ...labelSm, gridColumn: span }}>
        <span>{f.label}</span>
        <input type={f.type} name={f.key} value={typeof raw === "string" ? raw : ""} placeholder={f.placeholder} onChange={(ev) => setValue(g.key, f.key, ev.target.value)} style={{ ...inputSm, fontFamily: font }} />
      </label>
    );
  };

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 960 }}>
      {!data.secretsConfigured && <ErrorText>SECRETS_KEY is not set on the server — secrets can't be saved until it is.</ErrorText>}
      {INTEGRATION_DEFS.map((g) => {
        const status = statusOf(g.key);
        const e = editOf(g.key);
        const t = tested[g.key];
        const testedOk = t !== undefined && t !== "busy" && t.ok;
        const tone = testedOk ? "ok" : status?.tone ?? "off";
        const statusText = testedOk ? "Connected" : status?.status ?? "Not configured";
        const dirty = isDirty(g.key);
        return (
          <div key={g.key} style={{ ...card, padding: "22px 24px", display: "grid", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{g.name}</div>
                <div style={{ fontSize: 13.5, color: "#4A5B74", lineHeight: 1.5, marginTop: 3, maxWidth: "62ch" }}>{g.desc}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <StatusDot tone={tone}>{statusText}</StatusDot>
                <button type="button" onClick={() => test(g.key)} disabled={t === "busy"} style={btnOutline}>{t === "busy" ? "Testing…" : testedOk ? "Tested ✓" : "Test connection"}</button>
                <button type="button" onClick={() => saveCard(g.key).catch(() => undefined)} disabled={!dirty || saving === g.key} style={{ ...btnOutline, ...(dirty ? { background: "#0C2E63", color: "#fff", border: "1px solid #0C2E63" } : {}) }}>{saving === g.key ? "Saving…" : "Save"}</button>
              </div>
            </div>
            {t !== undefined && t !== "busy" && (t.ok ? <div style={{ fontSize: 12.5, color: "#15803D" }}>{t.detail}</div> : <ErrorText>{t.detail}</ErrorText>)}
            {errors[g.key] && <ErrorText>{errors[g.key]}</ErrorText>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,260px),1fr))", gap: 12 }}>
              {g.fields.map((f) => renderField(g, f, status, e))}
            </div>
            {g.toggles && g.toggles.length > 0 && (
              <div style={{ display: "grid", gap: 8, borderTop: "1px solid rgba(11,35,71,.08)", paddingTop: 12 }}>
                {g.toggles.map((tg) => {
                  const on = e.values[tg.key] !== false;
                  return (
                    <div key={tg.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 14, color: "#0B2347" }}>{tg.label}</span>
                      <Switch small on={on} onToggle={() => setValue(g.key, tg.key, !on)} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      <div style={{ fontSize: 12.5, color: "#6B7A90", lineHeight: 1.5 }}>Secrets are write-only in production: stored encrypted on the server, shown here as •••• once saved, and never sent back to the browser.</div>
    </div>
  );
}
