/** Traffic: per-page CTA clicks, views and pre-qualifications. */
import { api } from "../../api";
import { ErrorText, Loading, MONO, card, rowBorder, useLoader } from "./ui";

const COLS = "1fr auto auto auto";
const num: React.CSSProperties = { fontWeight: 700, textAlign: "right", minWidth: 64 };
const head: React.CSSProperties = { textAlign: "right", minWidth: 64 };

export default function TrafficPanel() {
  const { data, error } = useLoader(() => api.traffic(), []);
  if (error) return <ErrorText>{error}</ErrorText>;
  if (!data) return <Loading />;

  return (
    <div style={{ ...card, overflow: "hidden", maxWidth: 720 }}>
      <div style={{ display: "grid", gridTemplateColumns: COLS, gap: 18, padding: "12px 20px", borderBottom: "1px solid rgba(11,35,71,.08)", fontSize: 11, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "#6B7A90" }}>
        <span>Page</span><span style={head}>CTA clicks</span><span style={head}>Views</span><span style={head}>Pre-qualified</span>
      </div>
      {data.rows.map((p) => (
        <div key={p.slug} style={{ display: "grid", gridTemplateColumns: COLS, gap: 18, alignItems: "center", padding: "12px 20px", borderBottom: rowBorder, fontSize: 14 }}>
          <span style={{ fontWeight: 600, minWidth: 0 }}>{p.label} <span style={{ fontFamily: MONO, color: "#6B7A90", fontSize: 12.5 }}>/{p.slug}</span>{!p.published && <span style={{ fontSize: 11, color: "#B45309", fontWeight: 700, marginLeft: 8 }}>Draft</span>}</span>
          <span style={num}>{p.ctaClicks}</span>
          <span style={num}>{p.views}</span>
          <span style={num}>{p.prequals}</span>
        </div>
      ))}
      {data.rows.length === 0 && <div style={{ padding: 20, fontSize: 13.5, color: "#6B7A90" }}>No traffic recorded yet.</div>}
    </div>
  );
}
