/**
 * The registry of admin-editable site settings: each key maps to the schema
 * that validates it, on the way in when an admin saves and on the way out
 * when the server reads a stored row back. Same arrangement as The Authority
 * Desk's shared/settingsSchema.ts.
 */
import { prequalFormSchema } from "./prequalificationSchema";
import { doorSectionsSchema } from "./doorSections";
import { routingSettingsSchema } from "./routingSchema";
import {
  siteSettingsSchema,
  sectionsSettingsSchema,
  capabilitiesSettingsSchema,
  pricingSettingsSchema,
  integrationsSettingsSchema,
} from "./siteSettingsSchema";

export const SETTING_SCHEMAS = {
  site: siteSettingsSchema,
  sections: sectionsSettingsSchema,
  capabilities: capabilitiesSettingsSchema,
  pricing: pricingSettingsSchema,
  integrations: integrationsSettingsSchema,
  prequalForm: prequalFormSchema,
  doorSections: doorSectionsSchema,
  routing: routingSettingsSchema,
} as const;

export type SettingKey = keyof typeof SETTING_SCHEMAS;

export const SETTING_KEYS = Object.keys(SETTING_SCHEMAS) as SettingKey[];

export function isSettingKey(value: string): value is SettingKey {
  return value in SETTING_SCHEMAS;
}
