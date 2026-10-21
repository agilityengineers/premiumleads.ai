/**
 * Admin users and roles.
 *
 *   super    everything, including users and integrations
 *   admin    pages, resources, settings and leads
 *   advisor  leads only
 */
import { z } from "zod";

export const USER_ROLES = ["super", "admin", "advisor"] as const;
export type UserRole = (typeof USER_ROLES)[number];
export const userRoleSchema = z.enum(USER_ROLES);

export const ROLE_LABELS: Record<UserRole, string> = {
  super: "Super admin",
  admin: "Admin",
  advisor: "Advisor",
};

export const USER_STATUSES = ["active", "invited"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export type UserRecord = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

/** The signed-in user, as /api/admin/session reports it. */
export type SessionInfo = {
  authenticated: boolean;
  user: UserRecord | null;
};

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.")),
  password: z.string().min(1, "Enter your password."),
});

/** Password rules, enforced on first-login change, resets and invites. */
export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(200)
  .refine((p) => /[a-zA-Z]/.test(p) && /[0-9]/.test(p), {
    message: "Mix letters and numbers.",
  });

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

export const inviteUserSchema = z.object({
  name: z.string().trim().min(1, "A name is required.").max(120),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.")),
  role: userRoleSchema,
});

export const updateUserSchema = z.object({
  role: userRoleSchema.optional(),
  name: z.string().trim().min(1).max(120).optional(),
});

/** Admin panels each role may open. */
export const ROLE_PANELS: Record<UserRole, readonly string[] | "all"> = {
  super: "all",
  admin: ["overview", "pages", "caps", "sections", "resources", "settings", "form", "routing", "pricing", "leads", "traffic"],
  advisor: ["leads"],
};

export function roleAllows(role: UserRole, panel: string): boolean {
  const allowed = ROLE_PANELS[role];
  return allowed === "all" || allowed.includes(panel);
}
