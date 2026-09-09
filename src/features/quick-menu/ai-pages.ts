import { STORAGE } from "../../extension/constants";
import { extractGuid } from "../fobles/shared/guid";

type AiPagesMapping = {
  contentRoot: string;
  site: string;
};

type AiPagesGroup = {
  mappings: readonly AiPagesMapping[];
  name: string;
  organization: string;
  tenantName: string;
};

type ResolvedAiPagesMapping = AiPagesMapping & Omit<AiPagesGroup, "mappings">;

let aiPagesGroups: readonly AiPagesGroup[] = [];

const normalizeContentPath = (value: string): string =>
  value.trim().replace(/\/+$/, "").toLowerCase();

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

const setAiPagesGroups = (value: unknown): void => {
  aiPagesGroups = Array.isArray(value)
    ? value.filter(isAiPagesGroup).map(normalizeAiPagesGroup)
    : [];
};

void chrome.storage?.sync
  ?.get([STORAGE.KEY.AI_PAGES_MAPPINGS])
  .then((result) => {
    setAiPagesGroups(result[STORAGE.KEY.AI_PAGES_MAPPINGS]);
  })
  .catch(() => undefined);

chrome.storage?.onChanged?.addListener((changes, areaName) => {
  if (areaName === "sync" && STORAGE.KEY.AI_PAGES_MAPPINGS in changes) {
    setAiPagesGroups(changes[STORAGE.KEY.AI_PAGES_MAPPINGS].newValue);
  }
});

export const getQuickInfoValue = (
  doc: Document,
  labelPrefix: string,
): string | null => {
  const quickInfoTables = doc.querySelectorAll<HTMLTableElement>(
    "td.scEditorSectionPanelCell > table.scEditorQuickInfo",
  );

  for (const table of quickInfoTables) {
    for (const row of Array.from(table.rows)) {
      const label = row.cells.item(0)?.textContent?.trim().toLowerCase() ?? "";
      if (!label.startsWith(labelPrefix.toLowerCase())) continue;

      const valueElement = row.cells
        .item(1)
        ?.querySelector<HTMLInputElement>(
          "input.scEditorHeaderQuickInfoInput[readonly]",
        );
      const value =
        valueElement?.value.trim() ?? row.cells.item(1)?.textContent?.trim();
      if (value) return value;
    }
  }

  return null;
};

export const getCurrentItemId = (doc: Document): string | null =>
  extractGuid(getQuickInfoValue(doc, "Item ID:"));

const getAiPagesMapping = (itemPath: string): ResolvedAiPagesMapping | null => {
  const normalizedPath = normalizeContentPath(itemPath);
  return (
    aiPagesGroups
      .flatMap((group) =>
        group.mappings.map((mapping) => ({
          ...mapping,
          name: group.name,
          organization: group.organization,
          tenantName: group.tenantName,
        })),
      )
      .filter((mapping) => {
        const root = normalizeContentPath(mapping.contentRoot);
        return normalizedPath === root || normalizedPath.startsWith(`${root}/`);
      })
      .sort(
        (left, right) => right.contentRoot.length - left.contentRoot.length,
      )[0] ?? null
  );
};

export const openAiPages = (doc: Document): void => {
  const itemId = getCurrentItemId(doc);
  const itemPath = getQuickInfoValue(doc, "Item path:");
  const language = getQuickInfoValue(doc, "Language:");
  const version = getQuickInfoValue(doc, "Version:");
  const mapping = itemPath ? getAiPagesMapping(itemPath) : null;

  if (!itemId || !mapping) {
    window.alert(
      "No AI Pages mapping matches the active item. Configure AI Pages mappings in the extension options.",
    );
    return;
  }

  const url = new URL("https://pages.sitecorecloud.io/editor");
  url.searchParams.set("sc_itemid", itemId);
  url.searchParams.set("sc_site", mapping.site);
  url.searchParams.set("organization", mapping.organization);
  url.searchParams.set("tenantName", mapping.tenantName);
  if (language) url.searchParams.set("sc_lang", language);
  if (version) url.searchParams.set("sc_version", version);
};
