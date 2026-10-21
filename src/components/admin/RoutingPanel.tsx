/** Routing rules: ordered rules over the live form's option questions, plus the "not ready yet" copy. */
import { useState } from "react";
import { api } from "../../api";
import { allQuestions, isOptionType, type FormDefinition, type FormOption, type FormQuestion } from "../../../shared/formSchema";
import type { DoorSections } from "../../../shared/doorSections";
import { DESTINATION_LABELS, ROUTE_DESTINATIONS, type RouteCondition, type RouteDestination, type RouteRule, type RoutingSettings } from "../../../shared/routingSchema";
import { BUILTIN_BY_SLUG } from "../../content/variants";
import { ErrorText, Loading, btnOutlineLg, btnTiny, btnTinyDanger, card, hint, inputXs, kicker, labelSm, move, selectXs, useLoader, useSaveHandler } from "./ui";

type LiveQuestion = { id: string; label: string; options: FormOption[] };
type State = { routing: RoutingSettings; questions: LiveQuestion[] };

/** Every radio/checkbox question a rule can read: the base form plus each door section (merged by id). */
function liveQuestions(form: FormDefinition, doors: DoorSections, names: Record<string, string>): LiveQuestion[] {
  const out = new Map<string, LiveQuestion>();
  const add = (q: FormQuestion, from: string) => {
    if (!isOptionType(q.type)) return;
    const cur = out.get(q.id);
    if (!cur) {
      out.set(q.id, { id: q.id, label: from ? `${q.label} (${from})` : q.label, options: [...q.options] });
      return;
    }
    for (const o of q.options) if (!cur.options.some((x) => x.value === o.value)) cur.options.push(o);
  };
  allQuestions(form).forEach((q) => add(q, ""));
  for (const [slug, section] of Object.entries(doors)) section.questions.forEach((q) => add(q, names[slug] ?? BUILTIN_BY_SLUG[slug]?.label ?? slug));
  return [...out.values()];
}

const newRule = (): RouteRule => ({ id: `rule-${Date.now().toString(36)}`, label: "New rule", conditions: [], destination: "book" });

export default function RoutingPanel() {
  const { data, error, setData } = useLoader<State>(async () => {
    const [routing, form, doors, variants] = await Promise.all([
      api.setting<RoutingSettings>("routing"),
      api.setting<FormDefinition>("prequalForm"),
      api.setting<DoorSections>("doorSections"),
      api.adminVariants().catch(() => null),
    ]);
    const names = Object.fromEntries((variants?.variants ?? []).map((v) => [v.slug, v.label]));
    return { routing: routing.value, questions: liveQuestions(form.value, doors.value, names) };
  }, []);
  const [initial, setInitial] = useState<string | null>(null);
  const serialized = data ? JSON.stringify(data.routing) : null;
  if (data && initial === null) setInitial(serialized);
  const dirty = initial !== null && serialized !== initial;

  useSaveHandler(dirty, async () => {
    if (!data) return;
    const saved = await api.saveSetting<RoutingSettings>("routing", data.routing);
    setData({ ...data, routing: saved.value });
    setInitial(JSON.stringify(saved.value));
  });

  if (error) return <ErrorText>{error}</ErrorText>;
  if (!data) return <Loading />;

  const { routing, questions } = data;
  const setRouting = (patch: Partial<RoutingSettings>) => setData({ ...data, routing: { ...routing, ...patch } });
  const setRules = (rules: RouteRule[]) => setRouting({ rules });
  const setRule = (i: number, patch: Partial<RouteRule>) => setRules(routing.rules.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const setNurture = (patch: Partial<RoutingSettings["nurture"]>) => setRouting({ nurture: { ...routing.nurture, ...patch } });
  const questionById = (id: string) => questions.find((q) => q.id === id);

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 900 }}>
      {routing.rules.map((rule, i) => (
        <div key={rule.id} style={{ ...card, padding: 20, display: "grid", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
            <label style={{ ...labelSm, flex: "1 1 280px" }}>
              <span style={kicker}>Rule {i + 1}</span>
              <input value={rule.label} onChange={(e) => setRule(i, { label: e.target.value })} placeholder="What this rule is for" style={inputXs} />
            </label>
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" onClick={() => setRules(move(routing.rules, i, -1))} disabled={i === 0} aria-label="Move rule up" style={btnTiny}>↑</button>
              <button type="button" onClick={() => setRules(move(routing.rules, i, 1))} disabled={i === routing.rules.length - 1} aria-label="Move rule down" style={btnTiny}>↓</button>
              <button type="button" onClick={() => setRules(routing.rules.filter((_, j) => j !== i))} style={btnTinyDanger}>Remove</button>
            </div>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "#33465F" }}>When</span>
            {rule.conditions.map((c, ci) => {
              const q = questionById(c.questionId);
              const setCond = (patch: Partial<RouteCondition>) => setRule(i, { conditions: rule.conditions.map((x, k) => (k === ci ? { ...x, ...patch } : x)) });
              return (
                <div key={ci} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
                  <select value={c.questionId} onChange={(e) => setCond({ questionId: e.target.value, values: [] })} aria-label="Question" style={{ ...selectXs, flex: "1 1 220px", minWidth: 0 }}>
                    {!q && <option value={c.questionId}>{c.questionId} (not in the form)</option>}
                    {questions.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
                  </select>
                  <select value={c.operator} onChange={(e) => setCond({ operator: e.target.value === "is-not" ? "is-not" : "is" })} aria-label="Operator" style={selectXs}>
                    <option value="is">is</option>
                    <option value="is-not">is not</option>
                  </select>
                  {q ? (
                    <select multiple value={c.values} onChange={(e) => setCond({ values: Array.from(e.target.selectedOptions).map((o) => o.value) })} size={Math.min(6, Math.max(2, q.options.length))} aria-label="Answers" style={{ ...selectXs, flex: "1 1 240px", minWidth: 0 }}>
                      {q.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : (
                    <input value={c.values.join(", ")} onChange={(e) => setCond({ values: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} placeholder="Answer values, comma-separated" aria-label="Answers" style={{ ...inputXs, flex: "1 1 240px", minWidth: 0 }} />
                  )}
                  <button type="button" onClick={() => setRule(i, { conditions: rule.conditions.filter((_, k) => k !== ci) })} aria-label="Remove condition" style={btnTinyDanger}>✕</button>
                </div>
              );
            })}
            {rule.conditions.length === 0 && <div style={hint}>No conditions — matches everyone who reaches this rule.</div>}
            {rule.conditions.length > 1 && <div style={hint}>Every condition must hold (and).</div>}
            <div><button type="button" onClick={() => setRule(i, { conditions: [...rule.conditions, { questionId: questions[0]?.id ?? "readiness", operator: "is", values: [] }] })} disabled={questions.length === 0} style={btnTiny}>+ Add condition</button></div>
          </div>

          <label style={{ ...labelSm, maxWidth: 360 }}>Send them to
            <select value={rule.destination} onChange={(e) => setRule(i, { destination: e.target.value as RouteDestination })} style={selectXs}>
              {ROUTE_DESTINATIONS.map((d) => (
                <option key={d} value={d} disabled={d === "packages"}>{d === "packages" ? `${DESTINATION_LABELS[d]} (unused)` : DESTINATION_LABELS[d]}</option>
              ))}
            </select>
          </label>
        </div>
      ))}
      <div><button type="button" onClick={() => setRules([...routing.rules, newRule()])} style={btnOutlineLg}>+ Add rule</button></div>

      <div style={{ ...card, padding: 20, display: "grid", gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "#1E88E5" }}>Not ready yet</div>
          <div style={{ fontWeight: 700, fontSize: 15, marginTop: 2 }}>What a nurtured prospect sees</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,260px),1fr))", gap: 10 }}>
          <label style={labelSm}>Eyebrow<input value={routing.nurture.eyebrow} onChange={(e) => setNurture({ eyebrow: e.target.value })} style={inputXs} /></label>
          <label style={labelSm}>Heading<input value={routing.nurture.heading} onChange={(e) => setNurture({ heading: e.target.value })} style={inputXs} /></label>
          <label style={{ ...labelSm, gridColumn: "1 / -1" }}>Body<textarea value={routing.nurture.body} onChange={(e) => setNurture({ body: e.target.value })} rows={4} style={{ ...inputXs, resize: "vertical", lineHeight: 1.45 }} /></label>
          <label style={labelSm}>Primary button label<input value={routing.nurture.primaryLabel} onChange={(e) => setNurture({ primaryLabel: e.target.value })} style={inputXs} /></label>
          <label style={labelSm}>Secondary link label<input value={routing.nurture.secondaryLabel} onChange={(e) => setNurture({ secondaryLabel: e.target.value })} style={inputXs} /></label>
        </div>
        <div style={hint}><code>{"{firstName}"}</code> and <code>{"{doorNameLower}"}</code> are substituted with the prospect's first name and the landing page's audience.</div>
      </div>
    </div>
  );
}
