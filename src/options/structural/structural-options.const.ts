export const STRUCTURAL_OPTIONS = {
  COMMAND_HELP: "Requires an open Content Editor tab for the selected Sitecore environment and database. Invalidation clears template-base facts and derived structural metadata, and marks Known Sites unvalidated. Rediscovery also schedules known roots and History items for this environment and database; other cache facts and History remain unchanged.",
  DIAGNOSTIC_LABEL: "Show structural toolbar diagnostics",
  INVALIDATED: "Structural facts invalidated for this Sitecore environment and database; Known Sites marked unvalidated. Other cache facts and History are unchanged.",
  INVALID_ENVIRONMENT: "Enter an HTTP(S) Sitecore environment URL and a database name.",
  INVALID_PATHS: "Use one full path beneath /sitecore/templates per line, without traversal segments.",
  KNOWN_SITES_TITLE: "Known Sites",
  PATH_FIELDS: [
    { kind: "page", label: "Page base template paths" },
    { kind: "site", label: "Site base template paths" },
    { kind: "tenant", label: "Tenant base template paths" },
  ],
  SAVED: "Site discovery settings saved.",
  SAVE_LABEL: "Save site discovery settings",
  TITLE: "Site discovery",
} as const;