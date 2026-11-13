import { STORAGE } from "../constants/extension.const";
import type { AiPagesMapping, AiPagesGroup } from "./AiPagesMapping.types";
import { getStorageValue, onStorageChange, setStorageValue } from "./storage/storage";

const isAiPagesMapping = (value: unknown): value is AiPagesMapping => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const mapping = value as Record<string, unknown>;
  return ["contentRoot", "site"].every((key) => typeof mapping[key] === "string" && mapping[key].trim().length > 0);
};

const isAiPagesGroup = (value: unknown): value is AiPagesGroup => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const group = value as Record<string, unknown>;
  return (
    ["name", "organization", "tenantName"].every(
      (key) => typeof group[key] === "string" && group[key].trim().length > 0,
    ) &&
    Array.isArray(group.mappings) &&
    group.mappings.every(isAiPagesMapping)
  );
};

const normalizeAiPagesGroup = (group: AiPagesGroup): AiPagesGroup => ({
  name: group.name.trim(),
  organization: group.organization.trim(),
  tenantName: group.tenantName.trim(),
  mappings: group.mappings.map((mapping) => ({
    contentRoot: mapping.contentRoot.trim().replace(/\/+$/, ""),
    site: mapping.site.trim(),
  })),
});

function normalizeAiPagesGroups(value: unknown): readonly AiPagesGroup[] {
 if (!Array.isArray(value)) {
    return [];
  }

  const groups: unknown[] = value;
  return groups.filter(isAiPagesGroup).map(normalizeAiPagesGroup);

}

export async function getAiPagesMappings(): Promise<readonly AiPagesGroup[]> {
  const result = await getStorageValue([STORAGE.KEY.AI_PAGES_MAPPINGS]);
  return normalizeAiPagesGroups(result[STORAGE.KEY.AI_PAGES_MAPPINGS]);
}

export async function setAiPagesMappings(groups: readonly AiPagesGroup[]): Promise<void> {
  await setStorageValue({ [STORAGE.KEY.AI_PAGES_MAPPINGS]: groups });
}

export function onAiPagesMappingsChange(callback: (groups: readonly AiPagesGroup[]) => void): void {
  onStorageChange(STORAGE.KEY.AI_PAGES_MAPPINGS, (newValue) => {
    callback(normalizeAiPagesGroups(newValue));
  });
}
