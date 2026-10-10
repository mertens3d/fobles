import { CONST } from "../../constants/const";

// The administrator suffix (" [shared]", " [shared, standard value]", ...) is only ever
// relevant in the Content Editor's own chrome - stripped here so it doesn't leak into node
// labels/tooltips the graph builds from this text.

export function extractFieldLabel(marker: HTMLElement): string {
  const labelElement = marker.querySelector<HTMLElement>(CONST.SITECORE.SELECTORS.FIELD_LABEL);
  if (!labelElement) return "";
  const clone = labelElement.cloneNode(true) as HTMLElement;
  clone.querySelector(CONST.SITECORE.SELECTORS.FIELD_LABEL_ADMINISTRATOR)?.remove();
  return clone.textContent?.trim() ?? "";
}

export function isHandledElsewhere(label: string): boolean {
  const normalized = label.toLowerCase();
  return CONST.SITECORE.HARVEST.EXCLUDED_FIELD_LABEL_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}
// Raw Values (already forced on for the Layout field above) applies to every field on the page,
// not just Layout - so every other section's fields can be read the exact same way, generically,
// with no per-field-type parsing. Fields that don't render a raw .scContentControl under this
// mode (rare) just come back empty and get filtered out, same as an absent datasource/variant.
// Several raw-value controls (multilist tables, tree-list divs, ...) match .scContentControl
// just as much as a real input/select/textarea does, but don't carry a `.value` at all - reading
// one unconditionally throws. Anything that isn't actually value-bearing is treated the same as
// "no value" (filtered out below), same as a genuinely empty field.

export function readRawFieldValue(marker: HTMLElement): string | undefined {
  const control = marker.querySelector<HTMLElement>(CONST.SITECORE.SELECTORS.CONTENT_CONTROL);
  if (!(control instanceof HTMLInputElement) &&
    !(control instanceof HTMLSelectElement) &&
    !(control instanceof HTMLTextAreaElement)) {
    return undefined;
  }
  return control.value.trim() || undefined;
}
