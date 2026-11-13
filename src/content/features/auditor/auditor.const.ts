import type { AuditorLayoutViewSettings } from "./auditor.types.js";

export const AUDITOR_LAYOUT_VIEW_KEYS = [
  "device",
  "page-layout",
  "placeholder",
  "rendering",
  "datasource",
  "parameter",
] as const;

export const DEFAULT_AUDITOR_LAYOUT_VIEW_SETTINGS: AuditorLayoutViewSettings = {
  type: "auditorLayoutViewSettings",
  device: true,
  "page-layout": true,
  placeholder: true,
  rendering: true,
  datasource: true,
  parameter: true,
};
