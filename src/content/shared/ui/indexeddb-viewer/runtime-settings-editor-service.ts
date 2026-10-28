// @source-path [fobles] src/content/shared/ui/indexeddb-viewer/runtime-settings-editor-service.ts
import { getStorageValue, setStorageValue } from "../../../../shared/storage/storage";
import { normalizeRuntimeSettings, RUNTIME_SETTINGS_STORAGE_KEY } from "../../../runtime-settings/runtime-settings";
import type { RuntimeSettingsSaveResult } from "./developer-dialog.types";
const SAVED = "Saved.";
const SAVED_NORMALIZED = "Saved. Unknown keys were dropped and missing or invalid values were reset to defaults.";
const NOT_AN_OBJECT = "Settings must be a JSON object.";
const NOT_PERSISTED = "Save failed: the value was not persisted. The extension context may have been reloaded - refresh the page.";
function prettify(value: unknown): string { return JSON.stringify(value, null, 2); }
// Key-order-insensitive form, so reordering keys is not reported as a change.
function canonical(value: unknown): string { return JSON.stringify(value, (_key, nested) => (nested && typeof nested === "object" && !Array.isArray(nested) ? Object.fromEntries(Object.entries(nested).sort(([left], [right]) => left.localeCompare(right))) : nested)); }
function parseJson(text: string): { ok: true; value: unknown } | { ok: false; error: string } {
  let parsed: { ok: true; value: unknown } | { ok: false; error: string };
  try { parsed = { ok: true, value: JSON.parse(text) }; }
  catch (error) { parsed = { ok: false, error: error instanceof Error ? error.message : String(error) }; }
  return parsed;
}
async function readStored(): Promise<unknown> { return (await getStorageValue<unknown>([RUNTIME_SETTINGS_STORAGE_KEY], "local"))[RUNTIME_SETTINGS_STORAGE_KEY]; }
// Shows the stored value normalized, so keys added since it was persisted (and defaults, when nothing is stored yet) are visible and editable.
export async function loadRuntimeSettingsText(): Promise<string> { return prettify(normalizeRuntimeSettings(await readStored())); }
// The value stays in the same storage key and area; it is normalized with the same rules the runtime applies on load, written, then read back to prove it persisted.
export async function saveRuntimeSettingsText(text: string): Promise<RuntimeSettingsSaveResult> {
  const parsed = parseJson(text);
  let result: RuntimeSettingsSaveResult;
  if (!parsed.ok) {
    result = { ok: false, message: `Invalid JSON: ${parsed.error}` };
  } else if (parsed.value === null || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
    result = { ok: false, message: NOT_AN_OBJECT };
  } else {
    const normalized = normalizeRuntimeSettings(parsed.value);
    await setStorageValue({ [RUNTIME_SETTINGS_STORAGE_KEY]: normalized }, "local");
    const stored = await readStored();
    if (stored === undefined || canonical(stored) !== canonical(normalized)) result = { ok: false, message: NOT_PERSISTED };
    else result = { ok: true, message: canonical(parsed.value) === canonical(normalized) ? SAVED : SAVED_NORMALIZED, text: prettify(normalized) };
  }
  return result;
}
