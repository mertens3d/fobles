import { SITECORE } from "../../constants/sitecore.ts";

export const ITEM_KIND = {
  PAGE: "page",
  SITE: "site",
  TEMPLATE: "template",
  TENANT: "tenant",
  UNKNOWN: "unknown",
} as const;

export const STRUCTURAL = {
  DEFAULT_SHOW_TOOLBAR_DIAGNOSTICS: false,
  EDITOR_STATE_QUERY_PARAMETER: "foblesEditorState",
  MAX_ANCESTORS: 100,
  MAX_TEMPLATES: 100,
  RESTORE_ATTEMPTS: 3,
  SETTINGS_KEY: "foblesStructuralSettings",
} as const;

export const STRUCTURAL_BASE_PATHS = SITECORE.ITEM_KIND.BASE_TEMPLATE_PATHS;

export const KNOWN_SITES = { CHANGE_MESSAGE: "FOBLES_KNOWN_SITES_CHANGE", KEY_PREFIX: "foblesKnownSites:" } as const;

export const STRUCTURAL_COMMAND = {
  ACTION: { INVALIDATE: "invalidate", REDISCOVER: "rediscover" },
  BACKGROUND_SCRIPT: "background.js",
  EXECUTE_MESSAGE: "FOBLES_STRUCTURAL_EXECUTE",
  OPTIONS_PAGE: "options.html",
  PROBE_MESSAGE: "FOBLES_STRUCTURAL_PROBE",
  REQUEST_MESSAGE: "FOBLES_STRUCTURAL_REQUEST",
} as const;
