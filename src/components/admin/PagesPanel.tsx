/**
 * Landing pages: the list (publish / make home / edit), the "New blank page"
 * and "Generate with AI" cards, and the per-page content editor driven by
 * CONTENT_MODEL (a textarea per field; blank = inherit the default copy).
 */
import { useMemo, useState } from "react";
import { api } from "../../api";
import { navigate } from "../../router";
import { CONTENT_KEYS, RESERVED_SLUGS, type ContentInput, type VariantRecord } from "../../../shared/variantSchema";
import { BUILTIN_BY_SLUG } from "../../content/variants";
import { CONTENT_MODEL, LONG_FIELDS, fromText, slugify, toText, type ContentKey, type EditorKey, type EnvelopeKey } from "../../content/contentModel";
import { Chip, ErrorText, Loading, MONO, btnDangerMd, btnDark, btnOutline, btnOutlineMd, btnPrimary, btnBlue, card, errorMessage, input, label, linkBtn, linkBtnMd, textarea, useLoader, useSaveHandler, useShell } from "./ui";

type Provider = "anthropic" | "openai";
type Data = { variants: VariantRecord[]; defaultVariant: string; clicks: Record<string, number>; providers: Provider[] };

const isEnvelope = (key: EditorKey): key is EnvelopeKey => key === "label" || key === "audience" || key === "slug" || key === "bookingUrl";
const editorHref = (slug: string, defaultVariant: string) => (slug === defaultVariant ? "/" : `/${slug}`);

export default function PagesPanel({ creating, editingSlug }: { creating: "blank" | "ai" | null; editingSlug: string | null }) {
  const shell = useShell();
  const { data, error, setData } = useLoader<Data>(async () => {
    const [v, traffic, ai] = await Promise.all([
      api.adminVariants(),
      api.traffic().catch(() => null),
      api.aiProviders().catch(() => ({ providers: [] as Provider[] })),
    ]);
    return {
      variants: v.variants,
      defaultVariant: v.defaultVariant,
      clicks: Object.fromEntries((traffic?.rows ?? []).map((r) => [r.slug, r.ctaClicks])),
      providers: ai.providers,
    };
  }, []);
  const [actionError, setActionError] = useState("");

  if (error) return <ErrorText>{error}</ErrorText>;
  if (!data) return <Loading />;

  const existing = data.variants.map((v) => v.slug);
  const replace = (slug: string, rec: VariantRecord) => setData((d) => d && { ...d, variants: d.variants.map((v) => (v.slug === slug ? rec : v)) });
  const run = async (fn: () => Promise<void>) => {
    setActionError("");
    try { await fn(); } catch (err) { setActionError(errorMessage(err)); }
  };
  const openEditor = (slug: string) => navigate(`/admin/pages/edit?slug=${encodeURIComponent(slug)}`);
  const onCreated = (rec: VariantRecord) => {
    setData((d) => d && { ...d, variants: [...d.variants, rec] });
    shell.refreshBadges();
    openEditor(rec.slug);
  };
  const editing = editingSlug ? data.variants.find((v) => v.slug === editingSlug) ?? null : null;

  return (
    <>
      {editingSlug && !editing && <ErrorText>Page “{editingSlug}” was not found.</ErrorText>}
      {editing && (
        <PageEditor
          key={editing.slug}
          record={editing}
          defaultVariant={data.defaultVariant}
          existing={existing}
          onSaved={replace}
          onDeleted={(slug) => { setData((d) => d && { ...d, variants: d.variants.filter((v) => v.slug !== slug) }); shell.refreshBadges(); navigate("/admin/pages"); }}
        />
      )}
      {creating === "ai" && <AiCard providers={data.providers} onCreated={onCreated} onCancel={() => navigate("/admin/pages", { scrollTop: false })} />}
      {creating === "blank" && <BlankCard existing={existing} onCreated={onCreated} onCancel={() => navigate("/admin/pages", { scrollTop: false })} />}
      {actionError && <ErrorText>{actionError}</ErrorText>}

      <div style={{ ...card, overflow: "hidden" }}>
        {data.variants.map((p) => {
          const isDef = data.defaultVariant === p.slug;
          const tag = isDef ? { text: "Home page", bg: "#0C2E63", fg: "#fff" } : p.published ? { text: "Published", bg: "rgba(34,197,94,.15)", fg: "#15803D" } : { text: "Draft", bg: "rgba(217,119,6,.15)", fg: "#B45309" };
          const dot = BUILTIN_BY_SLUG[p.slug]?.dot ?? "#6B7A90";
          return (
            <div key={p.slug} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "14px 20px", borderBottom: "1px solid rgba(11,35,71,.06)", flexWrap: "wrap" }}>
              <button type="button" onClick={() => openEditor(p.slug)} style={{ cursor: "pointer", background: "none", border: 0, padding: 0, textAlign: "left", display: "flex", alignItems: "center", gap: 12, minWidth: "min(100%,280px)", flex: "1 1 280px", fontFamily: "inherit" }}>
                <span style={{ flex: "none", width: 36, height: 36, borderRadius: "50%", background: dot }} />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: 15, color: "#0B2347" }}>{p.label}</span>
                    <Chip bg={tag.bg} fg={tag.fg}>{tag.text}</Chip>
                  </span>
                  <span style={{ display: "block", fontSize: 13, color: "#6B7A90" }}>{p.audience} <span style={{ fontFamily: MONO, opacity: 0.8 }}>· /{p.slug}</span></span>
                </span>
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12.5, color: "#6B7A90", marginRight: 6 }}><span style={{ fontWeight: 700, color: "#0B2347" }}>{data.clicks[p.slug] ?? 0}</span> CTA clicks</span>
                <a href={editorHref(p.slug, data.defaultVariant)} target="_blank" rel="noopener" style={linkBtn}>View ↗</a>
                {!isDef && (
                  <>
                    <button type="button" onClick={() => run(async () => replace(p.slug, await api.publishVariant(p.slug, !p.published)))} style={btnOutline}>{p.published ? "Unpublish" : "Publish"}</button>
                    <button type="button" onClick={() => run(async () => { await api.makeHome(p.slug); setData((d) => d && { ...d, defaultVariant: p.slug, variants: d.variants.map((v) => (v.slug === p.slug ? { ...v, published: true } : v)) }); })} style={btnOutline}>Make home</button>
                  </>
                )}
                <button type="button" onClick={() => openEditor(p.slug)} style={btnDark}>Edit</button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ------------------------------------------------------------ blank page -- */

function BlankCard({ existing, onCreated, onCancel }: { existing: string[]; onCreated: (rec: VariantRecord) => void; onCancel: () => void }) {
  const [blank, setBlank] = useState({ label: "", audience: "", slug: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const blankSlug = slugify(blank.slug || blank.label) || "…";
  const taken = existing.includes(blankSlug) || RESERVED_SLUGS.includes(blankSlug);
  const disabled = busy || !blank.label.trim() || !blank.audience.trim() || blankSlug === "…" || taken;
  const set = (patch: Partial<typeof blank>) => setBlank({ ...blank, ...patch });

  async function create() {
    if (disabled) return;
    setBusy(true);
    setErr("");
    try {
      onCreated(await api.createVariant({ slug: blankSlug, label: blank.label.trim(), audience: blank.audience.trim() }));
    } catch (e) {
      setErr(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <div style={{ ...card, padding: 24, display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>New blank page</div>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "#4A5B74", lineHeight: 1.5 }}>Starts from the default copy with the audience swapped in. You edit everything else by hand.</p>
        </div>
        <button type="button" onClick={onCancel} style={btnOutlineMd}>Cancel</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,200px),1fr))", gap: 14 }}>
        <label style={label}>Label<input value={blank.label} name="label" onChange={(e) => set({ label: e.target.value })} placeholder="Logistics sales teams" style={input} /></label>
        <label style={label}>Audience<input value={blank.audience} name="audience" onChange={(e) => set({ audience: e.target.value })} placeholder="logistics sales teams" style={input} /></label>
        <label style={label}>URL slug<input value={blank.slug} name="slug" onChange={(e) => set({ slug: e.target.value })} placeholder={blankSlug} style={{ ...input, fontFamily: MONO }} /></label>
      </div>
      <div style={{ fontSize: 13, color: "#6B7A90" }}>Will be served at <span style={{ fontFamily: MONO, color: "#0B2347" }}>/{blankSlug}</span>{taken && <span style={{ color: "#B02A2A" }}> — that slug is already taken.</span>}</div>
      {err && <ErrorText>{err}</ErrorText>}
      <div><button type="button" onClick={create} disabled={disabled} style={btnPrimary}>Create &amp; edit</button></div>
    </div>
  );
}

/* --------------------------------------------------------------- AI page -- */

function AiCard({ providers, onCreated, onCancel }: { providers: Provider[]; onCreated: (rec: VariantRecord) => void; onCancel: () => void }) {
  const [gen, setGen] = useState<{ name: string; notes: string; provider: Provider }>({ name: "", notes: "", provider: providers.includes("anthropic") || providers.length === 0 ? "anthropic" : providers[0] });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const disabled = busy || !gen.name.trim() || providers.length === 0;

  async function generate() {
    if (disabled) return;
    setBusy(true);
    setErr("");
    try {
      onCreated(await api.generate({ name: gen.name.trim(), notes: gen.notes.trim(), provider: gen.provider }));
    } catch (e) {
      setErr(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <div style={{ ...card, padding: 24, display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Generate a page with AI</div>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "#4A5B74", lineHeight: 1.5, maxWidth: "64ch" }}>Name the audience or industry and the model writes a full draft — page copy, SEO text and a social-share image — into the same content schema as every other page. You review and publish it when it reads right.</p>
        </div>
        <button type="button" onClick={onCancel} style={btnOutlineMd}>Cancel</button>
      </div>
      <label style={label}>Audience / industry (e.g. "Logistics sales teams")<input value={gen.name} name="name" onChange={(e) => setGen({ ...gen, name: e.target.value })} placeholder="Dental practice owners" style={input} /></label>
      <label style={label}>Notes / angle (optional)<textarea value={gen.notes} name="notes" onChange={(e) => setGen({ ...gen, notes: e.target.value })} rows={3} placeholder="Emphasize the dialer and voicemail drops; buyers are hard to reach by email." style={{ ...input, resize: "vertical" }} /></label>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
        <label style={label}>Model
          <select value={gen.provider} name="provider" onChange={(e) => setGen({ ...gen, provider: e.target.value as Provider })} style={{ border: "1px solid rgba(11,35,71,.15)", borderRadius: 9, padding: "10px 12px", fontSize: 14, background: "#fff" }}>
            <option value="anthropic" disabled={!providers.includes("anthropic")}>Claude (Anthropic)</option>
            <option value="openai" disabled={!providers.includes("openai")}>GPT (OpenAI)</option>
          </select>
        </label>
        <button type="button" onClick={generate} disabled={disabled} style={btnBlue}>{busy ? "Generating…" : "✦ Generate draft"}</button>
        {busy && <span style={{ fontSize: 13, color: "#6B7A90" }}>Writing the page copy, SEO text and a social-share image — this can take up to a minute.</span>}
      </div>
      {providers.length === 0 && <div style={{ fontSize: 13, color: "#B45309" }}>Add an Anthropic or OpenAI key under Integrations → AI providers to generate pages.</div>}
      {err && <ErrorText>{err}</ErrorText>}
    </div>
  );
}

/* ---------------------------------------------------------------- editor -- */

type Draft = { label: string; audience: string; slug: string; bookingUrl: string; content: Record<string, string> };

function draftFrom(rec: VariantRecord): Draft {
  const content: Record<string, string> = {};
  const override = rec.content as Record<string, unknown>;
  for (const key of CONTENT_KEYS) content[key] = override[key] == null ? "" : toText(key, override[key]);
  return { label: rec.label, audience: rec.audience, slug: rec.slug, bookingUrl: rec.bookingUrl ?? "", content };
}

function PageEditor({ record, defaultVariant, existing, onSaved, onDeleted }: {
  record: VariantRecord;
  defaultVariant: string;
  existing: string[];
  onSaved: (slug: string, rec: VariantRecord) => void;
  onDeleted: (slug: string) => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => draftFrom(record));
  const [initial, setInitial] = useState<Draft>(draft);
  const [err, setErr] = useState("");
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(initial), [draft, initial]);
  const nextSlug = slugify(draft.slug);
  const slugTaken = !record.builtin && nextSlug !== record.slug && (existing.includes(nextSlug) || RESERVED_SLUGS.includes(nextSlug));

  useSaveHandler(dirty, async () => {
    if (slugTaken) throw new Error("That slug is already taken.");
    const content: Record<string, unknown> = {};
    for (const key of CONTENT_KEYS) {
      const text = draft.content[key] ?? "";
      if (text.trim() !== "") content[key] = fromText(key, text);
    }
    let saved = await api.updateVariant(record.slug, {
      label: draft.label.trim() || record.label,
      audience: draft.audience.trim() || record.audience,
      bookingUrl: draft.bookingUrl.trim() || null,
      content: content as ContentInput,
    });
    if (!record.builtin && nextSlug && nextSlug !== record.slug) {
      saved = await api.renameVariant(record.slug, nextSlug);
      onSaved(record.slug, saved);
      navigate(`/admin/pages/edit?slug=${encodeURIComponent(saved.slug)}`, { replace: true, scrollTop: false });
      return;
    }
    const d = draftFrom(saved);
    setDraft(d);
    setInitial(d);
    onSaved(record.slug, saved);
  });

  const setField = (key: EditorKey, value: string) => {
    if (isEnvelope(key)) setDraft({ ...draft, [key]: value });
    else setDraft({ ...draft, content: { ...draft.content, [key]: value } });
  };
  const valueOf = (key: EditorKey): string => (isEnvelope(key) ? draft[key] : draft.content[key] ?? "");
  const placeholderOf = (key: EditorKey): string => {
    if (key === "slug") return record.slug;
    if (key === "label") return record.label;
    if (key === "audience") return record.audience;
    if (key === "bookingUrl") return "Site default";
    return toText(key, record.base[key as ContentKey]);
  };

  async function togglePublished() {
    setErr("");
    try { onSaved(record.slug, await api.publishVariant(record.slug, !record.published)); } catch (e) { setErr(errorMessage(e)); }
  }
  async function remove() {
    if (!window.confirm(`Delete the page “${record.label}” (/${record.slug})? This cannot be undone.`)) return;
    setErr("");
    try { await api.deleteVariant(record.slug); onDeleted(record.slug); } catch (e) { setErr(errorMessage(e)); }
  }

  return (
    <div style={{ ...card, padding: 24, display: "grid", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Edit page · {record.label}</div>
          <div style={{ fontSize: 12.5, color: "#6B7A90", fontFamily: MONO }}>/{record.slug}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a href={editorHref(record.slug, defaultVariant)} target="_blank" rel="noopener" style={linkBtnMd}>View ↗</a>
          <button type="button" onClick={() => navigate("/admin/pages", { scrollTop: false })} style={btnOutlineMd}>Done</button>
        </div>
      </div>
      <div style={{ fontSize: 13.5, color: "#4A5B74", lineHeight: 1.55, background: "#F1F5FA", borderRadius: 10, padding: "12px 14px" }}>Every field below is what a new industry page needs. Lists use one entry per line, with <span style={{ fontFamily: MONO }}>|</span> between parts. Leave a field blank to inherit the default copy.</div>
      {CONTENT_MODEL.map((g, gi) => (
        <details key={g.group} open={gi < 2} style={{ borderTop: "1px solid rgba(11,35,71,.08)", paddingTop: 12 }}>
          <summary style={{ cursor: "pointer", listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "#6B7A90", padding: "4px 0 10px" }}>
            {g.group}<span style={{ fontSize: 11, letterSpacing: 0, textTransform: "none", fontWeight: 600 }}>{g.fields.length} fields</span>
          </summary>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))", gap: 14 }}>
            {g.fields.map(([key, title]) => {
              const long = LONG_FIELDS.includes(key) || key === "sub";
              const slugField = key === "slug";
              return (
                <label key={key} style={{ ...label, gridColumn: long ? "1 / -1" : "auto" }}>
                  {title}
                  <textarea
                    name={key}
                    value={valueOf(key)}
                    onChange={(e) => setField(key, e.target.value)}
                    rows={long ? 5 : 2}
                    placeholder={placeholderOf(key)}
                    disabled={slugField && record.builtin}
                    title={slugField && record.builtin ? "Built-in pages keep their address." : undefined}
                    style={{ ...textarea, ...(slugField || key === "bookingUrl" ? { fontFamily: MONO } : {}) }}
                  />
                  {slugField && slugTaken && <span style={{ fontWeight: 600, color: "#B02A2A", fontSize: 12.5 }}>That slug is already taken.</span>}
                </label>
              );
            })}
          </div>
        </details>
      ))}
      {err && <ErrorText>{err}</ErrorText>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", borderTop: "1px solid rgba(11,35,71,.08)", paddingTop: 16 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, fontWeight: 700, color: "#33465F", cursor: "pointer" }}>
          <input type="checkbox" checked={record.published} onChange={togglePublished} style={{ width: 18, height: 18, accentColor: "#1E88E5" }} />
          Published (visible at /{record.slug})
        </label>
        {!record.builtin && <button type="button" onClick={remove} style={btnDangerMd}>Delete page</button>}
      </div>
    </div>
  );
}
