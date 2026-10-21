/** Users & roles (super admins only): invite, change roles, reset passwords, remove. */
import { useState } from "react";
import { api } from "../../api";
import type { UserRecord, UserRole } from "../../../shared/usersSchema";
import { AMBER, Avatar, Chip, ErrorText, GREEN, Loading, btnDanger, btnOutline, card, errorMessage, initials, inputSm, labelSm, selectSm, selectXs, useLoader, useShell } from "./ui";

const AVATAR_BG: Record<UserRole, string> = { super: "#0C2E63", admin: "#1E88E5", advisor: "#00B2EF" };
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function UsersPanel() {
  const { user: me } = useShell();
  const { data, error, setData } = useLoader(() => api.users(), []);
  const [newUser, setNewUser] = useState<{ name: string; email: string; role: UserRole }>({ name: "", email: "", role: "advisor" });
  const [pwNote, setPwNote] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);

  if (error) return <ErrorText>{error}</ErrorText>;
  if (!data) return <Loading />;

  const users = data.users;
  const setUsers = (next: UserRecord[]) => setData({ ...data, users: next });
  const inviteDisabled = busy || !newUser.name.trim() || !EMAIL_RE.test(newUser.email.trim()) || users.some((u) => u.email.toLowerCase() === newUser.email.trim().toLowerCase());
  const run = async (fn: () => Promise<void>) => {
    setActionError("");
    setBusy(true);
    try { await fn(); } catch (err) { setActionError(errorMessage(err)); } finally { setBusy(false); }
  };
  const temporaryNote = (email: string, pw: string) => `Temporary password for ${email}: ${pw} — SendGrid isn't configured, so share it securely yourself.`;

  const invite = () => run(async () => {
    const res = await api.inviteUser({ name: newUser.name.trim(), email: newUser.email.trim().toLowerCase(), role: newUser.role });
    setUsers([...users, res.user]);
    setNewUser({ name: "", email: "", role: "advisor" });
    setPwNote(res.temporaryPassword ? temporaryNote(res.user.email, res.temporaryPassword) : res.emailed ? `Invite sent to ${res.user.email}.` : "");
  });
  const setRole = (u: UserRecord, role: UserRole) => run(async () => {
    const updated = await api.updateUser(u.id, { role });
    setUsers(users.map((x) => (x.id === u.id ? updated : x)));
  });
  const resetPw = (u: UserRecord) => run(async () => {
    const res = await api.resetUserPassword(u.id);
    setPwNote(res.temporaryPassword ? temporaryNote(u.email, res.temporaryPassword) : res.emailed ? `Password reset email sent to ${u.email}.` : "");
  });
  const remove = (u: UserRecord) => {
    if (!window.confirm(`Remove ${u.name} (${u.email})? They will no longer be able to sign in.`)) return;
    void run(async () => {
      await api.removeUser(u.id);
      setUsers(users.filter((x) => x.id !== u.id));
    });
  };

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 960 }}>
      <div style={{ ...card, padding: "20px 24px", display: "grid", gap: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>Invite a user</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,180px),1fr))", gap: 10, alignItems: "end" }}>
          <label style={labelSm}>Name<input name="name" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} style={inputSm} /></label>
          <label style={labelSm}>Email<input name="email" type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} style={inputSm} /></label>
          <label style={labelSm}>Role
            <select name="role" value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })} style={selectSm}>
              <option value="super">Super admin</option>
              <option value="admin">Admin</option>
              <option value="advisor">Advisor (leads only)</option>
            </select>
          </label>
          <button type="button" onClick={invite} disabled={inviteDisabled} style={{ cursor: "pointer", background: "#0C2E63", color: "#fff", border: 0, borderRadius: 9, padding: "11px 16px", fontWeight: 700, fontSize: 14, fontFamily: "inherit" }}>Send invite</button>
        </div>
        <div style={{ fontSize: 12.5, color: "#6B7A90", lineHeight: 1.5 }}><strong style={{ color: "#33465F" }}>Super admin</strong> — everything, including users and integrations. <strong style={{ color: "#33465F" }}>Admin</strong> — pages, resources, settings and leads. <strong style={{ color: "#33465F" }}>Advisor</strong> — leads only; sees the same contacts in The Authority Desk and Brand Voice Interview once linked by email.</div>
      </div>
      <div style={{ ...card, overflow: "hidden" }}>
        {users.map((u) => {
          const isSelf = u.id === me.id;
          const st = u.status === "invited" ? { label: "Invited", ...AMBER } : { label: "Active", ...GREEN };
          const canRemove = !isSelf && u.role !== "super";
          return (
            <div key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, padding: "13px 20px", borderBottom: "1px solid rgba(11,35,71,.06)", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: "1 1 260px" }}>
                <Avatar text={initials(u.name || u.email)} bg={AVATAR_BG[u.role] ?? "#00B2EF"} />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontWeight: 700, fontSize: 14.5 }}>{u.name} <Chip bg={st.bg} fg={st.fg} style={{ padding: "2px 7px", marginLeft: 6 }}>{st.label}</Chip></span>
                  <span style={{ display: "block", fontSize: 12.5, color: "#6B7A90" }}>{u.email}</span>
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <select value={u.role} onChange={(e) => setRole(u, e.target.value as UserRole)} disabled={isSelf || busy} title={isSelf ? "You can't change your own role." : undefined} style={selectXs}>
                  <option value="super">Super admin</option>
                  <option value="admin">Admin</option>
                  <option value="advisor">Advisor</option>
                </select>
                <button type="button" onClick={() => resetPw(u)} disabled={busy} style={btnOutline}>Reset password</button>
                {canRemove && <button type="button" onClick={() => remove(u)} disabled={busy} style={btnDanger}>Remove</button>}
              </div>
            </div>
          );
        })}
      </div>
      {actionError && <ErrorText>{actionError}</ErrorText>}
      <div style={{ fontSize: 12.5, color: "#6B7A90" }}>{pwNote}</div>
    </div>
  );
}
