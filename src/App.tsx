/**
 * Path-based router: the landing template at "/" and "/<slug>", the Get
 * started intake, the Resources page and the admin. Reserved routes come
 * first; anything else is a landing-page slug (404 → the home page's copy
 * with a notice, never a blank screen).
 */
import { useEffect } from "react";
import { useLocation } from "./router";
import Landing from "./pages/Landing";
import GetStarted from "./pages/GetStarted";
import Resources from "./pages/Resources";
import Admin from "./pages/Admin";

export default function App() {
  const { pathname } = useLocation();
  const seg = pathname.split("/").filter(Boolean)[0] ?? "";
  useEffect(() => {
    document.body.classList.toggle("pl-admin", seg === "admin");
    document.body.classList.toggle("pl-landing", seg !== "admin");
  }, [seg]);
  if (seg === "admin") return <Admin />;
  if (seg === "get-started") return <GetStarted />;
  if (seg === "resources") return <Resources />;
  return <Landing slug={seg} />;
}
