/**
 * /admin — the site admin. Restores the session on mount, shows the sign-in
 * screen (or the forced password change) and then the shell with the routed
 * panel. Everything else lives in src/components/admin/.
 */
import { useEffect, useState } from "react";
import { api } from "../api";
import type { UserRecord } from "../../shared/usersSchema";
import { Login, PasswordChange } from "../components/admin/Login";
import AdminShell from "../components/admin/AdminShell";

type Session = { status: "loading" } | { status: "anon" } | { status: "authed"; user: UserRecord };

export default function Admin() {
  const [session, setSession] = useState<Session>({ status: "loading" });

  useEffect(() => {
    document.title = "Premium Leads — Admin";
    let alive = true;
    api.session()
      .then((s) => { if (alive) setSession(s.authenticated && s.user ? { status: "authed", user: s.user } : { status: "anon" }); })
      .catch(() => { if (alive) setSession({ status: "anon" }); });
    return () => { alive = false; };
  }, []);

  async function signOut() {
    try { await api.logout(); } catch { /* the cookie is gone either way */ }
    setSession({ status: "anon" });
  }

  if (session.status === "loading") return <div style={{ minHeight: "100vh", background: "#F1F5FA" }} />;
  if (session.status === "anon") return <Login onLogin={(user) => setSession({ status: "authed", user })} />;
  if (session.user.mustChangePassword) return <PasswordChange user={session.user} onDone={(user) => setSession({ status: "authed", user })} onSignOut={signOut} />;
  return <AdminShell user={session.user} onLogout={() => setSession({ status: "anon" })} />;
}
