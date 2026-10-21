/**
 * Shared primitives for the admin: the exact colours, inputs, buttons, chips
 * and switches from "Premium Leads Admin.dc.html", plus the small contract a
 * panel uses to hand its "Save & publish" work to the shell.
 */
import { createContext, useContext, useEffect, useRef, useState, type CSSProperties, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { ApiError } from "../../api";
import type { UserRecord } from "../../../shared/usersSchema";

/* ------------------------------------------------------------- styles -- */

export const MONO = "ui-monospace,monospace";

export const card: CSSProperties = { background: "#fff", border: "1px solid rgba(11,35,71,.08)", borderRadius: 16 };
export const cardPad: CSSProperties = { ...card, padding: 24, display: "grid", gap: 14 };
export const cardHeader: CSSProperties = { padding: "14px 20px", borderBottom: "1px solid rgba(11,35,71,.08)", fontWeight: 700, fontSize: 15 };
export const rowBorder = "1px solid rgba(11,35,71,.06)";

export const input: CSSProperties = { border: "1px solid rgba(11,35,71,.15)", borderRadius: 9, padding: "11px 13px", fontSize: 14.5 };
export const inputSm: CSSProperties = { border: "1px solid rgba(11,35,71,.15)", borderRadius: 8, padding: "10px 12px", fontSize: 14 };
export const inputXs: CSSProperties = { border: "1px solid rgba(11,35,71,.15)", borderRadius: 8, padding: "9px 11px", fontSize: 14 };
export const selectSm: CSSProperties = { ...inputSm, background: "#fff" };
export const selectXs: CSSProperties = { border: "1px solid rgba(11,35,71,.15)", borderRadius: 8, padding: "7px 10px", fontSize: 13, background: "#fff" };
export const textarea: CSSProperties = { border: "1px solid rgba(11,35,71,.15)", borderRadius: 9, padding: "10px 12px", fontSize: 14, resize: "vertical", lineHeight: 1.45, fontFamily: "inherit" };

export const label: CSSProperties = { display: "grid", gap: 6, fontSize: 13, fontWeight: 700, color: "#33465F" };
export const labelSm: CSSProperties = { display: "grid", gap: 5, fontSize: 12.5, fontWeight: 700, color: "#33465F" };
export const kicker: CSSProperties = { fontSize: 12, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "#6B7A90" };
export const kickerBlue: CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "#1E88E5" };
export const muted: CSSProperties = { fontSize: 13, color: "#6B7A90", lineHeight: 1.5 };
export const hint: CSSProperties = { fontSize: 12.5, color: "#6B7A90", lineHeight: 1.5 };

export const btnPrimary: CSSProperties = { cursor: "pointer", background: "#0C2E63", color: "#fff", border: 0, borderRadius: 9, padding: "11px 18px", fontWeight: 700, fontSize: 14, fontFamily: "inherit" };
export const btnBlue: CSSProperties = { ...btnPrimary, background: "#1E88E5" };
export const btnOutline: CSSProperties = { cursor: "pointer", background: "#fff", border: "1px solid rgba(11,35,71,.12)", color: "#33465F", borderRadius: 8, padding: "7px 11px", fontWeight: 700, fontSize: 13, fontFamily: "inherit" };
export const btnOutlineMd: CSSProperties = { ...btnOutline, padding: "8px 12px" };
export const btnOutlineLg: CSSProperties = { ...btnOutline, borderRadius: 9, padding: "10px 16px", fontSize: 14 };
export const btnDanger: CSSProperties = { ...btnOutline, border: "1px solid rgba(180,40,40,.3)", color: "#B02A2A" };
export const btnDangerMd: CSSProperties = { ...btnDanger, padding: "8px 12px" };
export const btnTiny: CSSProperties = { cursor: "pointer", background: "#fff", border: "1px solid rgba(11,35,71,.12)", borderRadius: 7, padding: "5px 9px", fontSize: 12, fontWeight: 700, fontFamily: "inherit", color: "#33465F" };
export const btnTinyDanger: CSSProperties = { ...btnTiny, border: "1px solid rgba(180,40,40,.3)", color: "#B02A2A" };
export const btnDark: CSSProperties = { cursor: "pointer", background: "#0C2E63", color: "#fff", border: 0, borderRadius: 8, padding: "7px 12px", fontWeight: 700, fontSize: 13, fontFamily: "inherit" };
export const linkBtn: CSSProperties = { fontSize: 13, fontWeight: 700, padding: "7px 11px", border: "1px solid rgba(11,35,71,.12)", borderRadius: 8, color: "#33465F" };
export const linkBtnMd: CSSProperties = { ...linkBtn, padding: "8px 12px" };

/** Status dot + text colours shared by the Overview and Integrations panels. */
export const TONE: Record<"ok" | "warn" | "off", { dot: string; fg: string }> = {
  ok: { dot: "#22C55E", fg: "#15803D" },
  warn: { dot: "rgba(217,119,6,.8)", fg: "#B45309" },
  off: { dot: "rgba(11,35,71,.25)", fg: "#6B7A90" },
};

export const GREEN = { bg: "rgba(34,197,94,.15)", fg: "#15803D" };
export const AMBER = { bg: "rgba(217,119,6,.15)", fg: "#B45309" };
export const BLUE = { bg: "rgba(30,136,229,.12)", fg: "#0C2E63" };
export const GREY = { bg: "rgba(11,35,71,.08)", fg: "#33465F" };
export const RED = { bg: "rgba(176,42,42,.12)", fg: "#B02A2A" };

/* --------------------------------------------------------- components -- */

/** `sw(on)` from the spec: track colour and knob side of a switch. */
export function sw(on: boolean): { on: boolean; trackBg: string; justify: "flex-end" | "flex-start" } {
  return { on, trackBg: on ? "#1E88E5" : "rgba(11,35,71,.2)", justify: on ? "flex-end" : "flex-start" };
}

export function Switch({ on, onToggle, small = false, title }: { on: boolean; onToggle: () => void; small?: boolean; title?: string }) {
  const s = sw(on);
  const track: CSSProperties = small
    ? { cursor: "pointer", width: 40, height: 22, borderRadius: 100, border: 0, padding: 2, background: s.trackBg, display: "flex", justifyContent: s.justify }
    : { cursor: "pointer", width: 46, height: 26, borderRadius: 100, border: 0, padding: 3, background: s.trackBg, display: "flex", justifyContent: s.justify, transition: "background .2s" };
  const knob = small ? 18 : 20;
  return (
    <button type="button" role="switch" aria-checked={on} title={title} onClick={onToggle} style={{ ...track, flex: "none" }}>
      <span style={{ width: knob, height: knob, borderRadius: "50%", background: "#fff", display: "block", boxShadow: "0 1px 3px rgba(0,0,0,.3)" }} />
    </button>
  );
}

export function Chip({ bg, fg, children, title, small = false, style }: { bg: string; fg: string; children: ReactNode; title?: string; small?: boolean; style?: CSSProperties }) {
  return (
    <span title={title} style={{ fontSize: small ? 10.5 : 11, fontWeight: 700, padding: small ? "3px 7px" : "3px 8px", borderRadius: 100, background: bg, color: fg, whiteSpace: "nowrap", ...style }}>
      {children}
    </span>
  );
}

export function StatusDot({ tone, children }: { tone: "ok" | "warn" | "off"; children: ReactNode }) {
  const t = TONE[tone];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: t.fg }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: t.dot, flex: "none" }} />
      {children}
    </span>
  );
}

export function ErrorText({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ fontSize: 13, color: "#B02A2A", fontWeight: 600, lineHeight: 1.5, ...style }}>{children}</div>;
}

/** A small amber note (warnings that are not errors). */
export function AmberNote({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 13, color: "#B45309", background: "rgba(217,119,6,.1)", borderRadius: 10, padding: "10px 14px", lineHeight: 1.5 }}>{children}</div>;
}

export function Loading() {
  return <div style={{ fontSize: 13.5, color: "#6B7A90" }}>Loading…</div>;
}

export function Avatar({ text, bg, size = 34, fontSize = 12 }: { text: string; bg: string; size?: number; fontSize?: number }) {
  return (
    <span style={{ flex: "none", width: size, height: size, borderRadius: "50%", background: bg, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize, fontWeight: 700 }}>{text}</span>
  );
}

/* ------------------------------------------------------------ helpers -- */

/** "just now" · "5m ago" · "2h ago" · "3d ago" — `since()` from the spec. */
export function formatRelative(iso: string): string {
  const d = (Date.now() - new Date(iso).getTime()) / 60000;
  if (!Number.isFinite(d) || d < 1) return "just now";
  if (d < 60) return `${Math.round(d)}m ago`;
  if (d < 1440) return `${Math.round(d / 60)}h ago`;
  return `${Math.round(d / 1440)}d ago`;
}

export function formatWhen(iso: string): string {
  const t = new Date(iso);
  return Number.isNaN(t.getTime()) ? iso : t.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}

export function initials(nameOrEmail: string): string {
  return (nameOrEmail || "?").split(/[\s@]+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export function move<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** Loads once (or whenever `deps` change); exposes the data for local edits. */
export function useLoader<T>(load: () => Promise<T>, deps: readonly unknown[]): { data: T | null; error: string; loading: boolean; setData: Dispatch<SetStateAction<T | null>>; reload: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const loadRef = useRef(load);
  loadRef.current = load;
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    loadRef.current()
      .then((d) => { if (alive) { setData(d); setLoading(false); } })
      .catch((e: unknown) => { if (alive) { setError(errorMessage(e)); setLoading(false); } });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { data, error, loading, setData, reload: () => setTick((t) => t + 1) };
}

/* -------------------------------------------------------- shell contract -- */

export type ShellHost = {
  user: UserRecord;
  /** The function the shell's "Save & publish" button calls (null = nothing to save). */
  register: (fn: (() => Promise<void>) | null) => void;
  setDirty: (dirty: boolean) => void;
  /** Re-reads the sidebar badge counts after a change. */
  refreshBadges: () => void;
};

export const ShellContext = createContext<ShellHost | null>(null);

export function useShell(): ShellHost {
  const host = useContext(ShellContext);
  if (!host) throw new Error("useShell() must be used inside the admin shell.");
  return host;
}

/** Hands a panel's dirty state and save function to the shell's "Save & publish" button. */
export function useSaveHandler(dirty: boolean, save: () => Promise<void>): void {
  const host = useShell();
  const ref = useRef(save);
  ref.current = save;
  useEffect(() => {
    host.register(() => ref.current());
    return () => host.register(null);
  }, [host]);
  useEffect(() => {
    host.setDirty(dirty);
    return () => host.setDirty(false);
  }, [host, dirty]);
}
