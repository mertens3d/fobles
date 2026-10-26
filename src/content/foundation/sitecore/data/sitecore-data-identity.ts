// @source-path [fobles] src/content/foundation/sitecore/data/sitecore-data-identity.ts

import { CONST } from "../../../../constants/const";

// No better stable identifier exists yet (see Phase 3A research) - the page origin is the one
// value that's genuinely stable per Sitecore instance and isn't a display label.
function resolveEnvironment(doc: Document): string {
  return (doc.defaultView?.location.origin ?? window.location.origin);
}

// Mirrors flyout-option-url.ts's getCurrentDatabase read order (query param, then the ribbon's
// own hidden Database input); "master" is Content Editor's overwhelming default, used only when
// neither signal is present, never silently assumed ahead of a real reading.
function resolveDatabase(doc: Document): string {
  const currentUrl = new URL(doc.defaultView?.location.href ?? window.location.href);

  for (const queryKey of CONST.SITECORE.SEARCH_PARAMS.DATABASE_KEYS) {
    const database = currentUrl.searchParams.get(queryKey)?.trim();
    if (database) return database;
  }

  const databaseInput = doc.querySelector<HTMLInputElement>(CONST.SITECORE.SELECTORS.DATABASE_INPUT);
  return databaseInput?.value.trim() || "master";
}

// Sitecore's standard content-language query param; "en" is Sitecore's near-universal default
// install language, used only as a last resort when the page carries no language signal at all.
function resolveLanguage(doc: Document): string {
  const currentUrl = new URL(doc.defaultView?.location.href ?? window.location.href);
  return currentUrl.searchParams.get("sc_lang")?.trim() || "en";
}

export type SitecoreDataIdentity = {
  environment: string;
  database: string;
  language: string;
};

export function resolveSitecoreDataIdentity(doc: Document = document): SitecoreDataIdentity {
  return {
    environment: resolveEnvironment(doc),
    database: resolveDatabase(doc),
    language: resolveLanguage(doc),
  };
}
