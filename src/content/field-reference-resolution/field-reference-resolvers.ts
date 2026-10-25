// @source-path [fobles] src/content/field-reference-resolution/field-reference-resolvers.ts

import { SITECORE } from "../../constants/sitecore.ts";
import { collectGuidOptionItems } from "../features/augmentor/shared/collect-select-options.ts";
import { extractGuid, formatFoId, hasAnyGuidLikeOption } from "../features/augmentor/shared/guid.ts";
import type { FieldReference } from "./field-reference.types";

// Returning undefined means the field does not match the strategy. Returning an array, including an
// empty array, means the strategy claimed the field and generic GUID inference must not run.
export type FieldReferenceResolver = (marker: HTMLElement) => FieldReference[] | undefined;

function toSitecorePath(value: string): string | undefined {
  const trimmed = value.trim();
  return /^\/?sitecore\//i.test(trimmed) ? (trimmed.startsWith("/") ? trimmed : `/${trimmed}`) : undefined;
}

function toMediaPath(value: string): string {
  return value.startsWith("/") ? `/sitecore/media library${value}` : `/sitecore/media library/${value}`;
}

function strategyReference(target: string, strategy: FieldReference["strategy"], sourceValue: string, label?: string): FieldReference {
  return { target, label: label?.trim() || undefined, confidence: "strategy", strategy, sourceValue };
}

export function resolveDropLinkReferences(marker: HTMLElement): FieldReference[] | undefined {
  const select = marker.querySelector<HTMLSelectElement>("select.scContentControl.scCombobox");
  if (!select || !hasAnyGuidLikeOption(select)) return undefined;

  const option = select.options[select.selectedIndex];
  const sourceValue = option?.value ?? "";
  const guid = extractGuid(sourceValue);

  return guid ? [strategyReference(guid, "drop-link", sourceValue, option?.textContent ?? undefined)] : [];
}

export function resolveDropTreeReferences(marker: HTMLElement): FieldReference[] | undefined {
  const input = marker.querySelector<HTMLInputElement>("input.scComboboxEdit[readonly]");
  if (!input) return undefined;

  const value = input.value.trim();
  const target = value ? extractGuid(value) ?? toSitecorePath(value) : undefined;
  return target ? [strategyReference(target, "drop-tree", value, input.getAttribute("title") ?? undefined)] : [];
}

function resolveSingleInputReference(
  marker: HTMLElement,
  inputSelector: string,
  actionPrefix: string,
  strategy: FieldReference["strategy"],
  resolveTarget: (value: string) => string | undefined,
): FieldReference[] | undefined {
  const input = marker.querySelector<HTMLInputElement>(inputSelector);
  if (!input) return undefined;

  const hasAction = Array.from(marker.querySelectorAll<HTMLElement>(SITECORE.SELECTORS.FIELD_ACTION)).some((button) =>
    (button.getAttribute("onclick") ?? "").toLowerCase().includes(`${actionPrefix.toLowerCase()}:`),
  );
  if (!hasAction) return undefined;

  const value = input.value.trim();
  const target = value ? resolveTarget(value) : undefined;
  const label = input.getAttribute("title")?.trim() || input.getAttribute("aria-label")?.trim() || undefined;

  return target ? [strategyReference(target, strategy, value, label)] : [];
}

export function resolveGeneralLinkReferences(marker: HTMLElement): FieldReference[] | undefined {
  return resolveSingleInputReference(
    marker,
    "input.scContentControl",
    SITECORE.ACTION_PREFIXES.GENERAL_LINK,
    "general-link",
    (value) => {
      const guid = extractGuid(value);
      if (guid) return guid;

      const path = toSitecorePath(value);
      if (path) return path;

      return /^\//.test(value) ? toMediaPath(value) : undefined;
    },
  );
}

export function resolveInternalLinkReferences(marker: HTMLElement): FieldReference[] | undefined {
  return resolveSingleInputReference(
    marker,
    "input.scContentControl",
    SITECORE.ACTION_PREFIXES.INTERNAL_LINK,
    "internal-link",
    (value) => extractGuid(value) ?? toSitecorePath(value),
  );
}

export function resolveFileReferences(marker: HTMLElement): FieldReference[] | undefined {
  return resolveSingleInputReference(
    marker,
    "input.scContentControl",
    SITECORE.ACTION_PREFIXES.FILE,
    "file",
    toMediaPath,
  );
}

export function resolveImageReferences(marker: HTMLElement): FieldReference[] | undefined {
  return resolveSingleInputReference(
    marker,
    "input.scContentControlImage",
    SITECORE.ACTION_PREFIXES.IMAGE,
    "image",
    toMediaPath,
  );
}

function resolveSelectedListReferences(
  host: Element | null | undefined,
  strategy: FieldReference["strategy"],
  selectSelector: string,
): FieldReference[] | undefined {
  if (!host) return undefined;

  const select = host.querySelector<HTMLSelectElement>(selectSelector);
  if (!select) return undefined;

  return collectGuidOptionItems(select).map((item) =>
    strategyReference(item.value, strategy, item.value, item.label),
  );
}

export function resolveMultilistOptionsReferences(marker: HTMLElement): FieldReference[] | undefined {
  const host = marker.querySelector("table.scContentControlMultilist");
  if (host?.closest(".scContentControlSearchListContainer")) return undefined;

  return resolveSelectedListReferences(
    host,
    "multilist-options",
    `${SITECORE.SELECTORS.MULTILIST.BOX}[id$="_selected"]`,
  );
}

export function resolveMultilistWithSearchReferences(marker: HTMLElement): FieldReference[] | undefined {
  const host = marker.querySelector(".scContentControlSearchListContainer > table.scContentControlMultilist");

  return resolveSelectedListReferences(
    host,
    "multilist-with-search",
    `${SITECORE.SELECTORS.MULTILIST.BOX}[id$="_selected"]`,
  );
}

export function resolveTreeListReferences(marker: HTMLElement): FieldReference[] | undefined {
  const host = marker.querySelector("div.scContentControl.scContentControlTreelist");
  if (!host) return undefined;

  const selectedPane = host.querySelector(SITECORE.SELECTORS.TREE.LIST_SELECTED_PANE);
  return resolveSelectedListReferences(selectedPane, "tree-list", SITECORE.SELECTORS.MULTILIST.BOX);
}

export function resolveTagListReferences(marker: HTMLElement): FieldReference[] | undefined {
  const host = marker.querySelector("table.scContentControl.scContentControlTreelist");
  return resolveSelectedListReferences(host, "tag-list", "select.scContentControlMultilistBox");
}

export function resolveStyleChecklistReferences(marker: HTMLElement): FieldReference[] | undefined {
  const checkboxes = Array.from(
    marker.querySelectorAll<HTMLInputElement>(".style-field .style-selector input[type='checkbox'][styleid]"),
  );
  if (checkboxes.length === 0) return undefined;

  return checkboxes
    .filter((checkbox) => checkbox.checked)
    .map((checkbox): FieldReference | undefined => {
      const styleId = checkbox.getAttribute("styleid");
      if (!styleId) return undefined;

      const label =
        checkbox.closest("label")?.textContent?.trim() ??
        checkbox.parentElement?.textContent?.trim();

      return strategyReference(formatFoId(styleId), "style-checklist", styleId, label);
    })
    .filter((reference): reference is FieldReference => reference !== undefined);
}

export function resolveTreelistExReferences(marker: HTMLElement): FieldReference[] | undefined {
  const host = marker.querySelector<HTMLElement>(SITECORE.SELECTORS.TREELIST_EX.ROOT);
  if (!host) return undefined;

  return Array.from(host.children)
    .filter((child): child is HTMLElement => child.tagName === "DIV" && child.hasAttribute("title"))
    .map((child): FieldReference | undefined => {
      const title = child.getAttribute("title")?.trim();
      if (!title) return undefined;

      const path = title.startsWith(SITECORE.RELATIVE_PATHS_ENCODED.ROOT)
        ? title
        : `/sitecore/content${title}`;
      const label = child.textContent?.trim() || title.split("/").filter(Boolean).pop();

      return strategyReference(path, "treelist-ex", title, label);
    })
    .filter((reference): reference is FieldReference => reference !== undefined);
}

export const KNOWN_FIELD_REFERENCE_RESOLVERS: readonly FieldReferenceResolver[] = [
  resolveDropLinkReferences,
  resolveDropTreeReferences,
  resolveTreelistExReferences,
  resolveTagListReferences,
  resolveTreeListReferences,
  resolveMultilistWithSearchReferences,
  resolveMultilistOptionsReferences,
  resolveStyleChecklistReferences,
  resolveImageReferences,
  resolveFileReferences,
  resolveGeneralLinkReferences,
  resolveInternalLinkReferences,
];