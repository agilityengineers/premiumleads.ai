/** Overview: tiles, integration health, recent activity and the Authority Desk outbox line. */
import { api } from "../../api";
import { onLinkClick } from "../../router";
import { INTEGRATION_DEFS } from "../../../shared/siteSettingsSchema";
import { AmberNote, ErrorText, Loading, StatusDot, card, cardHeader, formatRelative, rowBorder, useLoader } from "./ui";

export default function OverviewPanel() {
  const { data, error } = useLoader(() => api.overview(), []);
  if (error) return <ErrorText>{error}</ErrorText>;
  if (!data) return <Loading />;

  const t = data.tiles;
  const tiles = [
    { l: "Leads · 7 days", v: String(t.leads7), s: `${t.leadsAll} all time` },
    { l: "CTA clicks", v: String(t.ctaClicks), s: "across all pages" },
    { l: "Pages live", v: String(t.pagesLive), s: `${t.pagesTotal} total` },
    { l: "Capabilities on", v: String(t.capsOn), s: `of ${t.capsTotal}` },
    { l: "Users", v: String(t.users), s: `${t.invited} pending invites` },
  ];
  const names = Object.fromEntries(INTEGRATION_DEFS.map((g) => [g.key, g.name]));

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,170px),1fr))", gap: 12 }}>
        {tiles.map((tile) => (
          <div key={tile.l} style={{ ...card, borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "#6B7A90" }}>{tile.l}</div>
            <div style={{ fontFamily: "Sora,sans-serif", fontWeight: 700, fontSize: 28, letterSpacing: "-.02em", marginTop: 6, color: "#0B2347" }}>{tile.v}</div>
            <div style={{ fontSize: 12.5, color: "#6B7A90", marginTop: 2 }}>{tile.s}</div>
          </div>
        ))}
      </div>
      {data.outbox.parked > 0 && (
        <AmberNote>
          {data.outbox.parked} lead(s) refused by The Authority Desk — <a href="/admin/leads" onClick={onLinkClick} style={{ fontWeight: 700, color: "#B45309", textDecoration: "underline" }}>open Leads to retry</a>
        </AmberNote>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,340px),1fr))", gap: 16 }}>
        <div style={{ ...card, overflow: "hidden" }}>
          <div style={cardHeader}>Integration health</div>
          {data.health.map((h) => (
            <div key={h.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: rowBorder }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{names[h.key] ?? h.key}</span>
              <StatusDot tone={h.tone}>{h.status}</StatusDot>
            </div>
          ))}
        </div>
        <div style={{ ...card, overflow: "hidden" }}>
          <div style={cardHeader}>Recent activity</div>
          {data.activity.length === 0 && <div style={{ padding: 20, fontSize: 13.5, color: "#6B7A90" }}>Nothing yet — saves, sign-ins and new leads show up here.</div>}
          {data.activity.map((e, i) => (
            <div key={`${e.at}-${i}`} style={{ padding: "11px 20px", borderBottom: rowBorder, fontSize: 13.5, display: "flex", justifyContent: "space-between", gap: 12 }}>
              <span>{e.text}</span>
              <span style={{ color: "#6B7A90", whiteSpace: "nowrap" }} title={new Date(e.at).toLocaleString()}>{formatRelative(e.at)}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
