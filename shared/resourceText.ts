/** Resource display helpers shared by the public pages and the server (zod-free; resourceSchema.ts re-exports them). */

/** Initials for the gradient placeholder ("The Authority Desk" → "TAD"). */
export function resourceInitials(name: string): string {
  return (name || "")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

/** Host badge text ("www.example.com" → "example.com"). */
export function resourceHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
