/**
 * Pre-qualification form: the spec's read view (sections → questions with
 * id · type · N options and the System / Values locked chips, plus the
 * door-specific section list), made editable the way The Authority Desk's
 * form builder is — reword, reorder, add and remove sections and questions,
 * edit options — with the system and locked-value guard rails.
 */
import { useState } from "react";
import { api } from "../../api";
import { QUESTION_TYPES, RESERVED_ANSWER_KEYS, allQuestions, isOptionType, type FormDefinition, type FormQuestion, type FormSection, type QuestionType } from "../../../shared/formSchema";
import { hasLockedValues, isSystemQuestion } from "../../../shared/prequalificationSchema";
import type { DoorSections } from "../../../shared/doorSections";
import { BUILTIN_BY_SLUG } from "../../content/variants";
import { AMBER, BLUE, Chip, ErrorText, Loading, MONO, btnOutlineLg, btnTiny, btnTinyDanger, card, hint, inputXs, labelSm, move, rowBorder, useLoader, useSaveHandler } from "./ui";

type State = { form: FormDefinition; doors: DoorSections; names: Record<string, string> };

/* --------------------------------------------------------------- helpers -- */

function idFromLabel(text: string): string {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const [first, ...rest] = words;
  const camel = first + rest.map((w) => w[0].toUpperCase() + w.slice(1)).join("");
  return /^[a-z]/.test(camel) ? camel.slice(0, 60) : `q${camel}`.slice(0, 60);
}

function uniqueId(text: string, taken: Set<string>): string {
  const base = idFromLabel(text) || "question";
  if (!taken.has(base) && !RESERVED_ANSWER_KEYS.includes(base)) return base;
  for (let n = 2; ; n += 1) {
    const candidate = `${base}${n}`;
    if (!taken.has(candidate) && !RESERVED_ANSWER_KEYS.includes(candidate)) return candidate;
  }
}

function blankQuestion(taken: Set<string>): FormQuestion {
  return { id: uniqueId("New question", taken), type: "text", label: "New question", hint: "", placeholder: "", required: false, width: "full", columns: 1, options: [] };
}

function blankSection(index: number): FormSection {
  return { id: `section${index + 1}`, kicker: `0${index + 1} · New section`, heading: "New section", note: "", questions: [] };
}

const check: React.CSSProperties = { width: 16, height: 16, accentColor: "#1E88E5" };
const checkLabel: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, color: "#0B2347" };

/* -------------------------------------------------------------- question -- */

function QuestionRow({ question: q, index, count, dupes, onChange, onMove, onDelete }: {
  question: FormQuestion; index: number; count: number; dupes: Set<string>;
  onChange: (next: FormQuestion) => void; onMove: (direction: -1 | 1) => void; onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const system = isSystemQuestion(q.id);
  const locked = hasLockedValues(q.id);
  const showsOptions = isOptionType(q.type);
  const set = <K extends keyof FormQuestion>(key: K, value: FormQuestion[K]) => onChange({ ...q, [key]: value });

  function setType(type: QuestionType) {
    const next: FormQuestion = { ...q, type };
    if (isOptionType(type) && q.options.length === 0) next.options = [{ value: "Option one", label: "Option one" }];
    if (!isOptionType(type)) next.options = [];
    onChange(next);
  }

  function setOption(i: number, key: "value" | "label", text: string) {
    set("options", q.options.map((o, oi) => (oi === i ? { ...o, [key]: text, ...(key === "label" && !locked && o.value === o.label ? { value: text } : {}) } : o)));
  }

  const lock = locked ? "Values locked (BVI)" : system ? "System" : "";
  const optCount = showsOptions && q.options.length ? `${q.options.length} options` : "";

  return (
    <div style={{ borderBottom: rowBorder }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "11px 20px", flexWrap: "wrap" }}>
        <button type="button" onClick={() => setOpen((v) => !v)} title={open ? "Collapse" : "Edit this question"} style={{ cursor: "pointer", background: "none", border: 0, padding: 0, textAlign: "left", minWidth: 0, flex: "1 1 240px", fontFamily: "inherit", color: "#0B2347" }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{q.label || "(untitled)"}{q.required && <span style={{ color: "#1E88E5", marginLeft: 4 }}>*</span>}</div>
          <div style={{ fontSize: 12, color: "#6B7A90", fontFamily: MONO }}>{q.id} · {q.type} {optCount}</div>
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {lock && <Chip bg={locked ? AMBER.bg : BLUE.bg} fg={locked ? AMBER.fg : BLUE.fg}>{lock}</Chip>}
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Move up" style={btnTiny}>↑</button>
          <button type="button" onClick={() => onMove(1)} disabled={index === count - 1} aria-label="Move down" style={btnTiny}>↓</button>
          <button type="button" onClick={onDelete} disabled={system} title={system ? "This answer is used elsewhere in the system, so it can't be removed." : "Delete this question"} style={btnTinyDanger}>Delete</button>
        </div>
      </div>

      {open && (
        <div style={{ padding: "0 20px 16px", display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,200px),1fr))", gap: 10 }}>
            <label style={{ ...labelSm, gridColumn: "1 / -1" }}>Question<input value={q.label} onChange={(e) => set("label", e.target.value)} style={inputXs} /></label>
            <label style={{ ...labelSm, gridColumn: "1 / -1" }}>Hint (shown under the question)<input value={q.hint} onChange={(e) => set("hint", e.target.value)} style={inputXs} /></label>
            {!showsOptions && <label style={{ ...labelSm, gridColumn: "1 / -1" }}>Placeholder<input value={q.placeholder} onChange={(e) => set("placeholder", e.target.value)} style={inputXs} /></label>}
            <label style={labelSm}>Type
              <select value={q.type} disabled={system} title={system ? "System questions keep their type." : undefined} onChange={(e) => setType(e.target.value as QuestionType)} style={{ ...inputXs, background: "#fff" }}>
                {QUESTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label style={labelSm}>Width
              <select value={q.width} onChange={(e) => set("width", e.target.value as FormQuestion["width"])} style={{ ...inputXs, background: "#fff" }}>
                <option value="full">Full row</option>
                <option value="half">Half row</option>
              </select>
            </label>
            {showsOptions && (
              <label style={labelSm}>Option columns
                <select value={q.columns} onChange={(e) => set("columns", Number(e.target.value) === 2 ? 2 : 1)} style={{ ...inputXs, background: "#fff" }}>
                  <option value={1}>One</option>
                  <option value={2}>Two</option>
                </select>
              </label>
            )}
            <label style={labelSm}>Answer key (stored name)<input value={q.id} disabled={system} title={system ? "System questions keep their answer key." : undefined} onChange={(e) => set("id", e.target.value.trim())} style={{ ...inputXs, fontFamily: MONO, fontSize: 13 }} /></label>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 20 }}>
            <label style={checkLabel}><input type="checkbox" checked={q.required} disabled={system} onChange={(e) => set("required", e.target.checked)} style={check} />Required</label>
            <label style={checkLabel}><input type="checkbox" checked={Boolean(q.pinInTable)} onChange={(e) => onChange({ ...q, pinInTable: e.target.checked ? true : undefined })} style={check} />Show as a column in the submissions table</label>
          </div>
          {showsOptions && (
            <div style={{ border: "1px solid rgba(11,35,71,.1)", borderRadius: 10, padding: 12, display: "grid", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "#33465F" }}>Options</span>
                {locked && <span style={{ fontSize: 12, color: "#B45309" }}>Stored values are fixed by the Brand Voice Interview handoff — the wording is yours to change.</span>}
              </div>
              {q.options.map((option, oi) => (
                <div key={oi} style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <input value={option.label} placeholder="What the visitor reads" aria-label="Option label" onChange={(e) => setOption(oi, "label", e.target.value)} style={{ ...inputXs, flex: "1 1 200px" }} />
                  <input value={option.value} placeholder="Stored value" aria-label="Option value" disabled={locked} title={locked ? "Fixed by the Brand Voice Interview handoff." : undefined} onChange={(e) => setOption(oi, "value", e.target.value)} style={{ ...inputXs, flex: "1 1 160px", fontFamily: MONO, fontSize: 12.5 }} />
                  {!locked && (
                    <>
                      <button type="button" onClick={() => set("options", move(q.options, oi, -1))} disabled={oi === 0} aria-label="Move option up" style={btnTiny}>↑</button>
                      <button type="button" onClick={() => set("options", move(q.options, oi, 1))} disabled={oi === q.options.length - 1} aria-label="Move option down" style={btnTiny}>↓</button>
                      <button type="button" onClick={() => set("options", q.options.filter((_, i) => i !== oi))} disabled={q.options.length <= 1} aria-label="Remove option" style={btnTinyDanger}>✕</button>
                    </>
                  )}
                </div>
              ))}
              {!locked && <div><button type="button" onClick={() => set("options", [...q.options, { value: "New option", label: "New option" }])} style={btnTiny}>+ Add option</button></div>}
            </div>
          )}
          {dupes.has(q.id) && <ErrorText>Another question already uses the answer key “{q.id}”.</ErrorText>}
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- section -- */

function SectionMeta({ section, onChange }: { section: FormSection; onChange: (next: FormSection) => void }) {
  const set = <K extends keyof FormSection>(key: K, value: FormSection[K]) => onChange({ ...section, [key]: value });
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,220px),1fr))", gap: 10, padding: "12px 20px", borderBottom: rowBorder, background: "#F8FAFD" }}>
      <label style={labelSm}>Kicker<input value={section.kicker} onChange={(e) => set("kicker", e.target.value)} style={inputXs} /></label>
      <label style={labelSm}>Heading<input value={section.heading} onChange={(e) => set("heading", e.target.value)} style={inputXs} /></label>
      <label style={{ ...labelSm, gridColumn: "1 / -1" }}>Note<input value={section.note} onChange={(e) => set("note", e.target.value)} style={inputXs} /></label>
    </div>
  );
}

function QuestionList({ section, takenIds, dupes, onChange }: { section: FormSection; takenIds: string[]; dupes: Set<string>; onChange: (next: FormSection) => void }) {
  const setQuestions = (questions: FormQuestion[]) => onChange({ ...section, questions });
  return (
    <>
      {section.questions.map((q, qi) => (
        <QuestionRow
          key={`${section.id}-${qi}`}
          question={q}
          index={qi}
          count={section.questions.length}
          dupes={dupes}
          onChange={(next) => setQuestions(section.questions.map((x, i) => (i === qi ? next : x)))}
          onMove={(direction) => setQuestions(move(section.questions, qi, direction))}
          onDelete={() => setQuestions(section.questions.filter((_, i) => i !== qi))}
        />
      ))}
      {section.questions.length === 0 && <div style={{ padding: "11px 20px", ...hint, borderBottom: rowBorder }}>No questions yet.</div>}
      <div style={{ padding: "10px 20px" }}><button type="button" onClick={() => setQuestions([...section.questions, blankQuestion(new Set(takenIds))])} style={btnTiny}>+ Add question</button></div>
    </>
  );
}

function SectionCard({ section, index, count, takenIds, dupes, onChange, onMove, onDelete }: {
  section: FormSection; index: number; count: number; takenIds: string[]; dupes: Set<string>;
  onChange: (next: FormSection) => void; onMove: (direction: -1 | 1) => void; onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const holdsSystem = section.questions.some((q) => isSystemQuestion(q.id));
  return (
    <div style={{ ...card, overflow: "hidden" }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(11,35,71,.08)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "#1E88E5" }}>{section.kicker || `Section ${index + 1}`}</div>
          <div style={{ fontWeight: 700, fontSize: 15, marginTop: 2 }}>{section.heading || "(untitled section)"}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <button type="button" onClick={() => setEditing((v) => !v)} style={btnTiny}>{editing ? "Done" : "Edit section"}</button>
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Move section up" style={btnTiny}>↑</button>
          <button type="button" onClick={() => onMove(1)} disabled={index === count - 1} aria-label="Move section down" style={btnTiny}>↓</button>
          <button type="button" onClick={onDelete} disabled={holdsSystem} title={holdsSystem ? "This section holds a system question — move it elsewhere first." : "Delete this section"} style={btnTinyDanger}>Delete</button>
        </div>
      </div>
      {editing && <SectionMeta section={section} onChange={onChange} />}
      <QuestionList section={section} takenIds={takenIds} dupes={dupes} onChange={onChange} />
    </div>
  );
}

function DoorRow({ name, section, takenIds, dupes, onChange }: { name: string; section: FormSection; takenIds: string[]; dupes: Set<string>; onChange: (next: FormSection) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: rowBorder }}>
      <div style={{ padding: "11px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{name}</div>
          <div style={{ fontSize: 12.5, color: "#6B7A90" }}>{section.questions.map((q) => q.label).join(" · ") || "No questions yet"}</div>
        </div>
        <button type="button" onClick={() => setOpen((v) => !v)} style={btnTiny}>{open ? "Done" : "Edit"}</button>
      </div>
      {open && (
        <div style={{ borderTop: rowBorder, background: "#FAFCFE" }}>
          <SectionMeta section={section} onChange={onChange} />
          <QuestionList section={section} takenIds={takenIds} dupes={dupes} onChange={onChange} />
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- panel -- */

export default function FormPanel() {
  const { data, error, setData } = useLoader<State>(async () => {
    const [form, doors, variants] = await Promise.all([
      api.setting<FormDefinition>("prequalForm"),
      api.setting<DoorSections>("doorSections"),
      api.adminVariants().catch(() => null),
    ]);
    return { form: form.value, doors: doors.value, names: Object.fromEntries((variants?.variants ?? []).map((v) => [v.slug, v.label])) };
  }, []);
  const [initial, setInitial] = useState<State | null>(null);
  if (data && initial === null) setInitial(data);
  const formDirty = !!data && !!initial && JSON.stringify(data.form) !== JSON.stringify(initial.form);
  const doorsDirty = !!data && !!initial && JSON.stringify(data.doors) !== JSON.stringify(initial.doors);

  useSaveHandler(formDirty || doorsDirty, async () => {
    if (!data) return;
    let next = data;
    if (formDirty) next = { ...next, form: (await api.saveSetting<FormDefinition>("prequalForm", data.form)).value };
    if (doorsDirty) next = { ...next, doors: (await api.saveSetting<DoorSections>("doorSections", data.doors)).value };
    setData(next);
    setInitial(next);
  });

  if (error) return <ErrorText>{error}</ErrorText>;
  if (!data) return <Loading />;

  const baseIds = allQuestions(data.form).map((q) => q.id);
  const baseDupes = new Set(baseIds.filter((id, i) => baseIds.indexOf(id) !== i));
  const setSections = (sections: FormSection[]) => setData({ ...data, form: { ...data.form, sections } });
  const doorName = (slug: string) => data.names[slug] ?? BUILTIN_BY_SLUG[slug]?.label ?? slug;

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 900 }}>
      {data.form.sections.map((s, si) => (
        <SectionCard
          key={`${s.id}-${si}`}
          section={s}
          index={si}
          count={data.form.sections.length}
          takenIds={baseIds}
          dupes={baseDupes}
          onChange={(next) => setSections(data.form.sections.map((x, i) => (i === si ? next : x)))}
          onMove={(direction) => setSections(move(data.form.sections, si, direction))}
          onDelete={() => setSections(data.form.sections.filter((_, i) => i !== si))}
        />
      ))}
      <div><button type="button" onClick={() => setSections([...data.form.sections, blankSection(data.form.sections.length)])} style={btnOutlineLg}>+ Add section</button></div>

      <div style={{ ...card, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(11,35,71,.08)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "#1E88E5" }}>02b · Door-specific section</div>
          <div style={{ fontWeight: 700, fontSize: 15, marginTop: 2 }}>Inserted based on the landing page the prospect came through</div>
        </div>
        {Object.entries(data.doors).map(([slug, section]) => {
          const ids = [...baseIds, ...section.questions.map((q) => q.id)];
          const dupes = new Set(ids.filter((id, i) => ids.indexOf(id) !== i));
          return (
            <DoorRow
              key={slug}
              name={doorName(slug)}
              section={section}
              takenIds={ids}
              dupes={dupes}
              onChange={(next) => setData({ ...data, doors: { ...data.doors, [slug]: next } })}
            />
          );
        })}
      </div>

      <div style={{ fontSize: 13, color: "#6B7A90", lineHeight: 1.5 }}>
        In production this is the same form builder as The Authority Desk (reword, reorder, add questions; system questions cannot be removed; locked values cannot change). <a href="/get-started?variant=sales" target="_blank" rel="noopener">Preview the form →</a>
      </div>
    </div>
  );
}
