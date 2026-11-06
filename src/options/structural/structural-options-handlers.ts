import { getStorageValue } from "../../shared/storage/storage.ts";
import { saveStructuralSettings } from "../../shared/structural/structural-settings.ts";
import { normalizeKnownSite } from "../../shared/known-sites/known-sites-model.ts";
import { mutateKnownSites } from "../../shared/known-sites/known-sites-repository.ts";
import type { KnownSitesChange, StructuralScope } from "../../shared/structural/structural.types.ts";
import { knownSiteScopes, parseStructuralSettingsDraft } from "./structural-options-model.ts";
import type { StructuralSettingsDraft } from "./structural-options.types.ts";
import { requestStructuralCommand } from "../../shared/structural/structural-command.ts";
import type { StructuralAction } from "../../shared/structural/structural-command.types.ts";

export async function saveStructuralOptions(draft: StructuralSettingsDraft): Promise<void> {
  const settings = parseStructuralSettingsDraft(draft);
  await saveStructuralSettings(settings);
}

export async function readKnownSiteScopes() {
  return knownSiteScopes(await getStorageValue(null, "local", true));
}

export async function changeScopedKnownSites(scope: StructuralScope, change: KnownSitesChange) {
  const normalized = change.action === "upsert" ? { ...change, site: normalizeKnownSite(change.site) } : change;
  return mutateKnownSites(scope, normalized);
}

export function changeScopedStructuralData(scope: StructuralScope, action: StructuralAction) {
  return requestStructuralCommand({ action, scope });
}