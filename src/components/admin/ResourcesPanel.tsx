/** Resources: paste a URL → snapshot + draft card; edit, reorder, feature, remove; Save & publish writes the ordered list. */
import { useState } from "react";
import { ApiError, api, type AdminResource } from "../../api";
import type { ResourceInput } from "../../../shared/resourceSchema";
import { AmberNote, Chip, AMBER, ErrorText, Loading, MONO, Switch, btnBlue, btnTiny, btnTinyDanger, card, errorMessage, inputXs, labelSm, useLoader, useSaveHandler, useShell } from "./ui";

type Item = { id: string; name: string; url: string; category: string; tagline: string; description: string; highlightsText: string; featured: boolean; snapshot: string | null; draft: boolean };

const fromRecord = (r: AdminResource): Item => ({ id: r.id, name: r.name, url: r.url, category: r.category, tagline: r.tagline, description: r.description, highlightsText: (r.highlights ?? []).join("\n"), featured: r.featured !== false, snapshot: r.snapshot, draft: r.draft });
const toInput = (i: Item): ResourceInput => ({ id: i.id, name: i.name, url: i.url, category: i.category, tagline: i.tagline, description: i.description, highlights: i.highlightsText.split("\n").map((s) => s.trim()).filter(Boolean), featured: i.featured });
const bust = (url: string | null) => (url ? `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}` : null);

export default function ResourcesPanel() {
  const shell = useShell();
  const { data: list, error, setData: setList } = useLoader(() => api.adminResources().then((rs) => rs.map(fromRecord)), []);
  const [initial, setInitial] = useState<string | null>(null);
  const [newUrl, setNewUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [refetching, setRefetching] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [actionError, setActionError] = useState("");
  const serialized = list ? JSON.stringify(list.map(toInput)) : null;
  if (list && initial === null) setInitial(serialized);
  const dirty = initial !== null && serialized !== initial;

  useSaveHandler(dirty, async () => {
    if (!list) return;
    const saved = (await api.saveResources(list.map(toInput))).map(fromRecord);
    setList(saved);
    setInitial(JSON.stringify(saved.map(toInput)));
    shell.refreshBadges();
  });

  if (error) return <ErrorText>{error}</ErrorText>;
  if (!list) return <Loading />;
  const items: Item[] = list;

  const update = (i: number, patch: Partial<Item>) => setList(items.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  async function fetchAndAdd() {
    let url = newUrl.trim();
    if (!url || fetching) return;
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    setFetching(true);
    setActionError("");
    setWarnings([]);
    try {
      const d = await api.fetchResource({ url });
      const item: Item = { id: d.id, name: d.name, url: d.url, category: d.category, tagline: d.tagline, description: d.description, highlightsText: d.highlights.join("\n"), featured: items.length < 3, snapshot: d.snapshot, draft: true };
      const idx = items.findIndex((x) => x.id === d.id);
      setList(idx >= 0 ? items.map((x, j) => (j === idx ? { ...item, featured: x.featured, draft: x.draft } : x)) : [...items, item]);
      setWarnings(d.warnings);
      setNewUrl("");
      shell.refreshBadges();
    } catch (e) {
      setActionError(errorMessage(e));
    } finally {
      setFetching(false);
    }
  }

  async function refetch(i: number) {
    const r = items[i];
    if (!r.url || refetching) return;
    setRefetching(r.id);
    setActionError("");
    try {
      const d = await api.fetchResource({ url: r.url, id: r.id, force: true });
      update(i, { snapshot: bust(d.snapshot) });
      if (d.warnings.length) setWarnings(d.warnings);
    } catch (e) {
      setActionError(errorMessage(e));
    } finally {
      setRefetching(null);
    }
  }

  async function remove(i: number) {
    const r = items[i];
    setList(items.filter((_, j) => j !== i));
    setActionError("");
    try {
      await api.deleteResource(r.id);
      shell.refreshBadges();
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 404)) setActionError(errorMessage(e));
    }
  }

  const swap = (i: number, j: number) => {
    if (j < 0 || j >= items.length) return;
    const arr = [...items];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setList(arr);
  };

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 980 }}>
      <div style={{ ...card, padding: "20px 24px", display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>Add a resource</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void fetchAndAdd(); } }} placeholder="Paste a URL, e.g. https://theauthoritydesk.com" style={{ flex: "1 1 320px", border: "1px solid rgba(11,35,71,.15)", borderRadius: 9, padding: "11px 13px", fontSize: 14.5 }} />
          <button type="button" onClick={fetchAndAdd} disabled={fetching} style={btnBlue}>{fetching ? "Fetching…" : "Fetch & add"}</button>
        </div>
        <div style={{ fontSize: 13, color: "#6B7A90", lineHeight: 1.5 }}>We take a snapshot of the page and pull its title, description and key points into a draft card. Edit anything below, then Save &amp; publish.</div>
        {warnings.length > 0 && <AmberNote>{warnings.join(" ")}</AmberNote>}
        {actionError && <ErrorText>{actionError}</ErrorText>}
      </div>

      {items.map((r, i) => (
        <div key={r.id} className="pl-admin-resource" style={{ ...card, overflow: "hidden", display: "grid", gridTemplateColumns: "minmax(0,260px) minmax(0,1fr)" }}>
          <div style={{ position: "relative", background: "linear-gradient(135deg,#0C2E63,#1E88E5)", minHeight: 200, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 16 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "rgba(255,255,255,.85)", lineHeight: 1.4 }}>{r.url ? "" : "Add the URL to snapshot the page"}</span>
            {r.url && r.snapshot && (
              <img src={r.snapshot} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
            )}
            <button type="button" onClick={() => refetch(i)} disabled={!r.url || refetching === r.id} style={{ position: "absolute", left: 10, bottom: 10, cursor: "pointer", background: "rgba(13,27,46,.85)", color: "#fff", border: 0, borderRadius: 7, padding: "6px 10px", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}>{refetching === r.id ? "Snapshotting…" : "↻ Re-snapshot"}</button>
            {r.draft && <Chip bg={AMBER.bg} fg={AMBER.fg} style={{ position: "absolute", right: 10, top: 10, background: "#fff" }}>Draft — not yet on /resources</Chip>}
          </div>
          <div style={{ padding: "18px 20px", display: "grid", gap: 12, alignContent: "start" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#33465F" }}>Show on landing pages</span>
                <Switch small on={r.featured} onToggle={() => update(i, { featured: !r.featured })} />
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" onClick={() => swap(i, i - 1)} disabled={i === 0} style={btnTiny} aria-label="Move up">↑</button>
                <button type="button" onClick={() => swap(i, i + 1)} disabled={i === items.length - 1} style={btnTiny} aria-label="Move down">↓</button>
                <button type="button" onClick={() => remove(i)} style={btnTinyDanger}>Remove</button>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,180px),1fr))", gap: 10 }}>
              <label style={labelSm}>Name<input name="name" value={r.name} onChange={(e) => update(i, { name: e.target.value })} style={inputXs} /></label>
              <label style={labelSm}>Category<input name="category" value={r.category} onChange={(e) => update(i, { category: e.target.value })} style={inputXs} /></label>
              <label style={{ ...labelSm, gridColumn: "1/-1" }}>URL<input name="url" value={r.url} onChange={(e) => update(i, { url: e.target.value })} style={{ ...inputXs, fontFamily: MONO }} /></label>
            </div>
            <label style={labelSm}>Tagline<input name="tagline" value={r.tagline} onChange={(e) => update(i, { tagline: e.target.value })} style={inputXs} /></label>
            <label style={labelSm}>What it does<textarea name="description" value={r.description} onChange={(e) => update(i, { description: e.target.value })} rows={3} style={{ ...inputXs, resize: "vertical", lineHeight: 1.45 }} /></label>
            <label style={labelSm}>Highlights (one per line)<textarea name="highlights" value={r.highlightsText} onChange={(e) => update(i, { highlightsText: e.target.value })} rows={3} style={{ ...inputXs, resize: "vertical", lineHeight: 1.45 }} /></label>
          </div>
        </div>
      ))}
      <a href="/resources" target="_blank" rel="noopener" style={{ fontSize: 14, fontWeight: 700 }}>Preview the resources page →</a>
    </div>
  );
}
