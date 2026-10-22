/**
 * Path-based router: the landing template at "/" and "/<slug>", the Get
 * started intake, the Resources page and the admin. Reserved routes come
 * first; anything else is a landing-page slug (404 → the home page's copy
 * with a notice, never a blank screen).
 */
import { lazy, Suspense, useEffect } from "react";
import { useLocation } from "./router";
import Landing from "./pages/Landing";
import Resources from "./pages/Resources";
import { Loading } from "./components/shared/chrome";

/**
 * The admin (thirteen panels) and the intake (the only public page that
 * validates with zod) are their own chunks, so a landing-page visit downloads
 * neither. The intake chunk is prefetched once the landing page is idle, so
 * the "Get started" click is instant.
 */
const Admin = lazy(() => import("./pages/Admin"));
const loadGetStarted = () => import("./pages/GetStarted");
const GetStarted = lazy(loadGetStarted);

export default function App() {
  const { pathname } = useLocation();
  const seg = pathname.split("/").filter(Boolean)[0] ?? "";
  useEffect(() => {
    document.body.classList.toggle("pl-admin", seg === "admin");
    document.body.classList.toggle("pl-landing", seg !== "admin");
  }, [seg]);
  useEffect(() => {
    if (seg === "admin" || seg === "get-started") return;
    const w = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => { void loadGetStarted(); }, { timeout: 4000 });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(() => { void loadGetStarted(); }, 2500);
    return () => window.clearTimeout(t);
  }, [seg]);
  if (seg === "admin") return <Suspense fallback={<div style={{ minHeight: "100vh", background: "#F1F5FA" }} />}><Admin /></Suspense>;
  if (seg === "get-started") return <Suspense fallback={<Loading />}><GetStarted /></Suspense>;
  if (seg === "resources") return <Resources />;
  return <Landing slug={seg} />;
}
