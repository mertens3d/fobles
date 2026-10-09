import { extractGuid } from "../../features/augmentor/shared/guid";
import {
  getAiPagesMappings,
  onAiPagesMappingsChange,
  type AiPagesGroup,
  type AiPagesMapping,
} from "../../../shared/ai-pages-mappings";
import { getQuickInfo } from "./quick-info";

type ResolvedAiPagesMapping = AiPagesMapping & Omit<AiPagesGroup, "mappings">;

let aiPagesGroups: readonly AiPagesGroup[] = [];

const normalizeContentPath = (value: string): string =>
  value.trim().replace(/\/+$/, "").toLowerCase();

void getAiPagesMappings().then((groups) => {
  aiPagesGroups = groups;
});

onAiPagesMappingsChange((groups) => {
  aiPagesGroups = groups;
});

export const getCurrentItemId = (doc: Document): string | null =>
  extractGuid(getQuickInfo(doc).itemId);

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

const buildAiPagesUrl = (
  itemId: string,
  mapping: ResolvedAiPagesMapping,
  language: string | null,
  version: string | null,
): string => {
  const url = new URL("https://pages.sitecorecloud.io/editor");
  url.searchParams.set("sc_itemid", itemId);
  url.searchParams.set("sc_site", mapping.site);
  url.searchParams.set("organization", mapping.organization);
  url.searchParams.set("tenantName", mapping.tenantName);
  if (language) url.searchParams.set("sc_lang", language);
  if (version) url.searchParams.set("sc_version", version);
  return url.toString();
};

export const openAiPages = (doc: Document): void => {
  const itemId = getCurrentItemId(doc);
  const docQuickInfo = getQuickInfo(doc);
  const language = "";
  const version = "";
  const mapping = docQuickInfo?.itemPath ? getAiPagesMapping(docQuickInfo?.itemPath ?? "") : null;

  if (itemId && mapping) {
    const url = buildAiPagesUrl(itemId, mapping, language, version);
    window.open(url, "_blank", "noopener,noreferrer");
  } else {
    window.alert(
      "No AI Pages mapping matches the active item. Configure AI Pages mappings in the extension options.",
    );
  }
};
