/** A tiny pushState router so every screen has an address the back button, a refresh and a bookmark respect. */
import { useEffect, useState } from "react";

export function useLocation(): { pathname: string; search: string } {
  const read = () => ({ pathname: window.location.pathname, search: window.location.search });
  const [loc, setLoc] = useState(read);
  useEffect(() => {
    const onChange = () => setLoc(read());
    window.addEventListener("popstate", onChange);
    window.addEventListener("pl:navigate", onChange);
    return () => {
      window.removeEventListener("popstate", onChange);
      window.removeEventListener("pl:navigate", onChange);
    };
  }, []);
  return loc;
}

export function navigate(to: string, options: { replace?: boolean; scrollTop?: boolean } = {}): void {
  if (options.replace) window.history.replaceState(null, "", to);
  else window.history.pushState(null, "", to);
  window.dispatchEvent(new Event("pl:navigate"));
  if (options.scrollTop !== false) window.scrollTo({ top: 0, behavior: "smooth" });
}

/** Intercepts same-origin clicks on in-app links so they don't reload the page. */
export function onLinkClick(e: React.MouseEvent<HTMLAnchorElement>): void {
  const a = e.currentTarget;
  const href = a.getAttribute("href") || "";
  if (!href.startsWith("/") || href.startsWith("//") || a.target === "_blank" || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  const [path, hash] = href.split("#");
  const current = `${window.location.pathname}${window.location.search}`;
  if (path && path !== current) navigate(path, { scrollTop: !hash });
  if (hash) {
    // Let the new page paint before jumping to the anchor.
    window.setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" }), path && path !== current ? 60 : 0);
  }
}

export function useQuery(): URLSearchParams {
  const { search } = useLocation();
  return new URLSearchParams(search);
}
