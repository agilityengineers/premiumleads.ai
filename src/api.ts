/** Typed client for every endpoint (public + admin). */
import type { PublicVariant, VariantRecord, VariantInput, ContentInput, TrafficReport } from "../shared/variantSchema";
import type { PublicConfig, IntegrationStatus } from "../shared/siteSettingsSchema";
import type { ResourceRecord, ResourceInput, ResourceDraft } from "../shared/resourceSchema";
import type { FormDefinition } from "../shared/formSchema";
import type { PrequalRecord } from "../shared/prequalificationSchema";
import type { ContactRecord, ContactEventRecord } from "../shared/contactsSchema";
import type { UserRecord, SessionInfo } from "../shared/usersSchema";
import type { SettingKey } from "../shared/settingsSchema";
import type { RouteDestination } from "../shared/routingSchema";

export class ApiError extends Error {
  constructor(message: string, public status: number, public body: unknown = null) {
    super(message);
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const message = (body as { error?: string } | null)?.error || `Request failed (${res.status})`;
    throw new ApiError(message, res.status, body);
  }
  return body as T;
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: body === undefined ? undefined : JSON.stringify(body),
});

const get = <T,>(url: string) => fetch(url, { credentials: "same-origin" }).then((r) => handle<T>(r));
const send = <T,>(url: string, method: string, body?: unknown) => fetch(url, { ...json(method, body), credentials: "same-origin" }).then((r) => handle<T>(r));

export type AdminResource = ResourceRecord & { draft: boolean };
export type SettingMeta<T> = { key: SettingKey; value: T; updatedAt: string | null; isDefault: boolean };
export type PrequalFormResponse = { form: FormDefinition; door: { slug: string; name: string; isHome: boolean }; bookingUrl: string; heading: string; loginUrl: string; nurture: { eyebrow: string; heading: string; body: string; primaryLabel: string; secondaryLabel: string } };
export type SubmitResponse = { ok: true; id: number; ref: string; destination: RouteDestination; bookingUrl: string; relayed: boolean };
export type LookupResponse = { known: false } | { known: true; source: "premium_leads" | "authority_desk"; servicePreference: string; marketingBudget: string; clientType: string; company: string; intervieweeId: string | null };
export type Overview = {
  tiles: { leads7: number; leadsAll: number; contacts: number; ctaClicks7: number; ctaClicks: number; pagesLive: number; pagesTotal: number; capsOn: number; capsTotal: number; users: number; invited: number };
  health: IntegrationStatus[];
  activity: { text: string; actor: string | null; at: string }[];
  outbox: { pending: number; parked: number; delivered: number };
  aiProviders: ("anthropic" | "openai")[];
};

export const api = {
  /* public */
  config: () => get<PublicConfig>("/api/config"),
  variant: (slug: string, preview = false) => get<PublicVariant>(`/api/variant?slug=${encodeURIComponent(slug)}${preview ? "&preview=1" : ""}`),
  resources: () => get<ResourceRecord[]>("/api/resources"),
  featuredResources: () => get<ResourceRecord[]>("/api/resources/featured"),
  prequalForm: (variant: string) => get<PrequalFormResponse>(`/api/prequal-form?variant=${encodeURIComponent(variant)}`),
  lookup: (email: string) => get<LookupResponse>(`/api/prequalification/lookup?email=${encodeURIComponent(email)}`),
  submitPrequal: (answers: Record<string, unknown>) => send<SubmitResponse>("/api/pre-qualification", "POST", answers),
  contact: (body: Record<string, unknown>) => send<{ ok: true }>("/api/contact", "POST", body),

  /* session */
  session: () => get<SessionInfo>("/api/admin/session"),
  login: (email: string, password: string) => send<{ ok: true; user: UserRecord }>("/api/admin/login", "POST", { email, password }),
  logout: () => send<{ ok: true }>("/api/admin/logout", "POST"),
  changePassword: (currentPassword: string, newPassword: string) => send<{ ok: true; user: UserRecord }>("/api/admin/password", "POST", { currentPassword, newPassword }),

  /* admin */
  overview: () => get<Overview>("/api/admin/overview"),
  adminVariants: () => get<{ variants: VariantRecord[]; defaultVariant: string }>("/api/admin/variants"),
  adminVariant: (slug: string) => get<VariantRecord>(`/api/admin/variant?slug=${encodeURIComponent(slug)}`),
  createVariant: (body: { slug: string; label: string; audience: string }) => send<VariantRecord>("/api/admin/variant", "POST", body),
  updateVariant: (slug: string, body: Partial<VariantInput> & { content?: ContentInput }) => send<VariantRecord>(`/api/admin/variant?slug=${encodeURIComponent(slug)}`, "PUT", body),
  renameVariant: (slug: string, next: string) => send<VariantRecord>("/api/admin/variant/rename", "POST", { slug, next }),
  deleteVariant: (slug: string) => send<{ ok: true }>(`/api/admin/variant?slug=${encodeURIComponent(slug)}`, "DELETE"),
  publishVariant: (slug: string, published: boolean) => send<VariantRecord>("/api/admin/variant/publish", "POST", { slug, published }),
  makeHome: (slug: string) => send<{ ok: true }>("/api/admin/variant/make-home", "POST", { slug }),
  aiProviders: () => get<{ providers: ("anthropic" | "openai")[] }>("/api/admin/ai-providers"),
  generate: (body: { name: string; notes: string; provider: "anthropic" | "openai" }) => send<VariantRecord>("/api/admin/generate", "POST", body),
  generateImage: (slug: string) => send<{ ok: true }>("/api/admin/variant/generate-image", "POST", { slug }),
  clearImage: (slug: string) => send<{ ok: true }>("/api/admin/variant/clear-image", "POST", { slug }),

  setting: <T,>(key: SettingKey) => get<SettingMeta<T>>(`/api/admin/settings/${key}`),
  saveSetting: <T,>(key: SettingKey, value: unknown) => send<SettingMeta<T>>(`/api/admin/settings/${key}`, "PUT", value),
  resetSetting: <T,>(key: SettingKey) => send<SettingMeta<T>>(`/api/admin/settings/${key}`, "DELETE"),
  resetDefaults: () => send<{ ok: true }>("/api/admin/reset-defaults", "POST"),

  adminResources: () => get<AdminResource[]>("/api/admin/resources"),
  saveResources: (list: ResourceInput[]) => send<AdminResource[]>("/api/admin/resources", "PUT", list),
  fetchResource: (body: { url: string; id?: string; force?: boolean; notes?: string }) => send<ResourceDraft>("/api/admin/resources/fetch", "POST", body),
  deleteResource: (id: string) => send<{ ok: true }>(`/api/admin/resources/${encodeURIComponent(id)}`, "DELETE"),

  contacts: (params: { q?: string; source?: string; limit?: number; offset?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.q) qs.set("q", params.q);
    if (params.source) qs.set("source", params.source);
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.offset) qs.set("offset", String(params.offset));
    return get<{ contacts: ContactRecord[]; total: number; relayConfigured: boolean }>(`/api/admin/contacts?${qs}`);
  },
  contactDetail: (id: number) => get<{ contact: ContactRecord; events: ContactEventRecord[]; submissions: PrequalRecord[] }>(`/api/admin/contacts/${id}`),
  submissions: (limit = 200) => get<{ submissions: PrequalRecord[]; doors: Record<string, string>; relayConfigured: boolean }>(`/api/admin/pre-qualifications?limit=${limit}`),
  resync: (id: number) => send<{ ok: true; attempted: number; delivered: number; submission: PrequalRecord }>(`/api/admin/pre-qualifications/${id}/resync`, "POST"),

  traffic: () => get<TrafficReport>("/api/admin/traffic"),

  users: () => get<{ users: UserRecord[]; emailConfigured: boolean }>("/api/admin/users"),
  inviteUser: (body: { name: string; email: string; role: string }) => send<{ user: UserRecord; emailed: boolean; temporaryPassword: string | null }>("/api/admin/users", "POST", body),
  updateUser: (id: number, body: { role?: string; name?: string }) => send<UserRecord>(`/api/admin/users/${id}`, "PATCH", body),
  resetUserPassword: (id: number) => send<{ ok: true; emailed: boolean; temporaryPassword: string | null }>(`/api/admin/users/${id}/reset-password`, "POST"),
  removeUser: (id: number) => send<{ ok: true }>(`/api/admin/users/${id}`, "DELETE"),

  integrations: () => get<{ integrations: IntegrationStatus[]; secretsConfigured: boolean }>("/api/admin/integrations"),
  saveIntegration: (key: string, body: { values: Record<string, string | boolean>; secrets: Record<string, string | null> }) => send<{ integrations: IntegrationStatus[] }>(`/api/admin/integrations/${key}`, "PUT", body),
  testIntegration: (key: string) => send<{ ok: boolean; detail: string }>(`/api/admin/integrations/${key}/test`, "POST"),
};

/** Primary-CTA click beacon (counts against the page that showed the button). */
export function trackCta(slug: string): void {
  try {
    const body = JSON.stringify({ slug, kind: "cta" });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
    } else {
      void fetch("/api/track", { ...json("POST"), body, keepalive: true });
    }
  } catch {
    /* never block a click */
  }
}
