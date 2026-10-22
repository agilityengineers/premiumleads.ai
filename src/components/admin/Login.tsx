/** The sign-in screen (the spec's `notAuthed` block) and the forced first-login password change in the same frame. */
import { useState, type FormEvent, type ReactNode } from "react";
import { api } from "../../api";
import { onLinkClick } from "../../router";
import { passwordSchema, type UserRecord } from "../../../shared/usersSchema";
import { ErrorText, errorMessage, input, label } from "./ui";

function AuthFrame({ onSubmit, children }: { onSubmit: (e: FormEvent<HTMLFormElement>) => void; children: ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px", background: "#F1F5FA", backgroundImage: "radial-gradient(700px 400px at 90% 0%, rgba(0,178,239,.14), transparent 60%)" }}>
      <form onSubmit={onSubmit} style={{ width: "100%", maxWidth: 400, display: "grid", gap: 18 }}>
        <div style={{ textAlign: "center" }}>
          <img src="/logo-wordmark.png" alt="Premium Leads" style={{ width: 220, height: "auto" }} />
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase", color: "#6B7A90", marginTop: 10 }}>Site admin</div>
        </div>
        <div style={{ background: "#fff", border: "1px solid rgba(11,35,71,.08)", borderRadius: 16, padding: 28, display: "grid", gap: 14, boxShadow: "0 30px 60px -40px rgba(12,46,99,.4)" }}>
          {children}
        </div>
        <div style={{ textAlign: "center", fontSize: 13 }}>
          <a href="/" onClick={onLinkClick} style={{ fontWeight: 700, color: "#0B2347", display: "inline-block", padding: "10px 8px" }}>← Back to the site</a>
        </div>
      </form>
    </div>
  );
}

const h1: React.CSSProperties = { fontFamily: "Sora,sans-serif", fontWeight: 700, fontSize: 24, letterSpacing: "-.02em", margin: 0 };
const intro: React.CSSProperties = { margin: 0, fontSize: 14, color: "#4A5B74", lineHeight: 1.5 };
const submit: React.CSSProperties = { cursor: "pointer", background: "#0C2E63", color: "#fff", border: 0, borderRadius: 9, padding: 13, fontWeight: 700, fontSize: 15, fontFamily: "inherit", transition: "background .2s" };

export function Login({ onLogin }: { onLogin: (user: UserRecord) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submitLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await api.login(email.trim(), password);
      onLogin(res.user);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame onSubmit={submitLogin}>
      <h1 style={h1}>Sign in</h1>
      <p style={intro}>Manage landing pages, leads, users and integrations from one place.</p>
      <label style={label}>Email<input type="email" name="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} autoComplete="username" style={input} /></label>
      <label style={label}>Password<input type="password" name="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} autoComplete="current-password" style={input} /></label>
      {error && <ErrorText>{error}</ErrorText>}
      <button type="submit" className="hov-bg-blue" disabled={busy} style={submit}>Sign in</button>
    </AuthFrame>
  );
}

export function PasswordChange({ user, onDone, onSignOut }: { user: UserRecord; onDone: (user: UserRecord) => void; onSignOut: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submitChange(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const check = passwordSchema.safeParse(next);
    if (!check.success) { setError(check.error.issues[0]?.message ?? "Choose a stronger password."); return; }
    if (next !== confirm) { setError("Those passwords don't match."); return; }
    setBusy(true);
    setError("");
    try {
      const res = await api.changePassword(current, next);
      onDone(res.user ?? { ...user, mustChangePassword: false });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame onSubmit={submitChange}>
      <h1 style={h1}>Set a new password</h1>
      <p style={intro}>You signed in with a temporary password, {user.name.split(/\s+/)[0]}. Choose your own to continue — at least 10 characters, with letters and numbers.</p>
      <label style={label}>Current password<input type="password" name="currentPassword" value={current} onChange={(e) => { setCurrent(e.target.value); setError(""); }} autoComplete="current-password" style={input} /></label>
      <label style={label}>New password<input type="password" name="newPassword" value={next} onChange={(e) => { setNext(e.target.value); setError(""); }} autoComplete="new-password" style={input} /></label>
      <label style={label}>Confirm new password<input type="password" name="confirmPassword" value={confirm} onChange={(e) => { setConfirm(e.target.value); setError(""); }} autoComplete="new-password" style={input} /></label>
      {error && <ErrorText>{error}</ErrorText>}
      <button type="submit" className="hov-bg-blue" disabled={busy} style={submit}>Save password</button>
      <button type="button" onClick={onSignOut} style={{ cursor: "pointer", background: "none", border: 0, color: "#6B7A90", fontSize: 13, fontWeight: 700, fontFamily: "inherit", padding: 0, justifySelf: "center" }}>Sign out</button>
    </AuthFrame>
  );
}
