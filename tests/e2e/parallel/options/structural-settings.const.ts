export const STRUCTURAL_TEST = {
  DATABASE: "master",
  EDITED_NAME: "Edited Options Site",
  EDITED_PATH: "/sitecore/content/Edited Options Site",
  ORIGIN: "https://structural-options.example:9443",
  OTHER_DATABASE: "web",
  OTHER_ORIGIN: "https://structural-options.example:9444",
  PAGE_PATH: "/sitecore/templates/Feature/Options Page",
  SITE: {
    id: "00000000-0000-0000-0000-000000000101",
    name: "Options Site",
    path: "/sitecore/content/Options Site",
    templateId: "00000000-0000-0000-0000-000000000102",
    validatedAt: 1,
  },
  UI: {
    ENVIRONMENT_LABEL: "Sitecore environment URL",
    LEGACY_AGE_LABEL: "Maximum unvalidated age (days)",
    PANEL_LABEL: "Known Sites for this Sitecore environment and database",
    STORED_ENVIRONMENT_LABEL: "Stored Sitecore environment and database",
  },
} as const;