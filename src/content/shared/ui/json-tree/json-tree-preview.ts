// @source-path [fobles] src/content/shared/ui/json-tree/json-tree-preview.ts
import { JSON_TREE } from "./json-tree.const";
import type { JsonEntry } from "./json-tree.types";

function truncate(text: string, maxChars: number): string {
  return text.length > maxChars ? `${text.slice(0, maxChars)}\u2026` : text;
}

export function getJsonEntries(value: unknown): JsonEntry[] | undefined {
  let entries: JsonEntry[] | undefined;
  if (Array.isArray(value)) entries = value.map((item, index): JsonEntry => [String(index), item]);
  else if (value !== null && typeof value === "object") entries = Object.entries(value);
  return entries;
}

export function formatJsonPrimitive(value: unknown, maxStringChars: number): string {
  let text: string;
  if (typeof value === "string") text = `"${truncate(value, maxStringChars)}"`;
  else text = String(value);
  return text;
}

function previewChild(value: unknown): string {
  const entries = getJsonEntries(value);
  let text: string;
  if (!entries) text = formatJsonPrimitive(value, JSON_TREE.PREVIEW_MAX_STRING_CHARS);
  else if (Array.isArray(value)) text = `Array(${entries.length})`;
  else text = entries.length === 0 ? JSON_TREE.TEXT.EMPTY_OBJECT : "{\u2026}";
  return text;
}

export function previewJson(value: unknown): string {
  const entries = getJsonEntries(value);
  let text: string;
  if (!entries) {
    text = formatJsonPrimitive(value, JSON_TREE.PREVIEW_MAX_STRING_CHARS);
  } else {
    const shown = entries.slice(0, JSON_TREE.PREVIEW_MAX_ENTRIES);
    const more = entries.length > shown.length ? ", \u2026" : "";
    if (Array.isArray(value)) text = `Array(${entries.length}) [${shown.map(([, item]) => previewChild(item)).join(", ")}${more}]`;
    else text = `{${shown.map(([key, item]) => `${key}: ${previewChild(item)}`).join(", ")}${more}}`;
  }
  return text;
}
