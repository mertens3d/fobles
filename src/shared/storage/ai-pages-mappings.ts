import { STORAGE } from "../constants";
import { getStorageValue, onStorageChange, setStorageValue } from "./storage";

export type AiPagesMapping = {
  contentRoot: string;
  site: string;
};

export type AiPagesGroup = {
  mappings: readonly AiPagesMapping[];
  name: string;
  organization: string;
  tenantName: string;
};

const isAiPagesMapping = (value: unknown): value is AiPagesMapping => {
  if (!value || typeof value !== "object") return false;

  const mapping = value as Record<string, unknown>;
  return ["contentRoot", "site"].every(
    (key) => typeof mapping[key] === "string" && mapping[key].trim().length > 0,
  );
};

const isAiPagesGroup = (value: unknown): value is AiPagesGroup => {
  if (!value || typeof value !== "object") return false;

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
  return Array.isArray(value)
    ? value.filter(isAiPagesGroup).map(normalizeAiPagesGroup)
    : [];
}

export async function getAiPagesMappings(): Promise<readonly AiPagesGroup[]> {
  const result = await getStorageValue([STORAGE.KEY.AI_PAGES_MAPPINGS]);
  return normalizeAiPagesGroups(result[STORAGE.KEY.AI_PAGES_MAPPINGS]);
}

export async function setAiPagesMappings(groups: readonly AiPagesGroup[]): Promise<void> {
  await setStorageValue({ [STORAGE.KEY.AI_PAGES_MAPPINGS]: groups });
}

export function onAiPagesMappingsChange(
  callback: (groups: readonly AiPagesGroup[]) => void,
): void {
  onStorageChange(STORAGE.KEY.AI_PAGES_MAPPINGS, (newValue) => {
    callback(normalizeAiPagesGroups(newValue));
  });
}
