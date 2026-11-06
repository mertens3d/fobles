import { normalizeHistoryScope } from "../item-history/item-history-model.ts";
import { STRUCTURAL_COMMAND } from "./structural.const.ts";
import type { StructuralCommand, StructuralCommandResponse } from "./structural-command.types.ts";
import type { StructuralScope } from "./structural.types.ts";

export function normalizeStructuralCommand(value: unknown): StructuralCommand {
  if (typeof value !== "object" || value === null || !("action" in value) ||
    (value.action !== STRUCTURAL_COMMAND.ACTION.INVALIDATE && value.action !== STRUCTURAL_COMMAND.ACTION.REDISCOVER)) {
    throw new TypeError("Invalid structural command");
  }
  return { action: value.action, scope: normalizeHistoryScope("scope" in value ? value.scope : undefined) };
}

export function structuralScopeMatches(value: unknown, scope: StructuralScope): boolean {
  let matches: boolean;
  try {
    const candidate = normalizeHistoryScope(value);
    const expected = normalizeHistoryScope(scope);
    matches = candidate.origin === expected.origin && candidate.database === expected.database;
  } catch {
    matches = false;
  }
  return matches;
}

export function requireStructuralResponse(value: unknown, scope: StructuralScope): Extract<StructuralCommandResponse, { ok: true }> {
  if (typeof value !== "object" || value === null || !("ok" in value)) {
    throw new Error("Structural content tab unavailable");
  }
  if (value.ok !== true) {
    throw new Error("error" in value && typeof value.error === "string" ? value.error : "Structural command failed");
  }
  if (!("scope" in value) || !structuralScopeMatches(value.scope, scope) || !("scheduled" in value) ||
    typeof value.scheduled !== "number" || !Number.isSafeInteger(value.scheduled) || value.scheduled < 0) {
    throw new TypeError("Invalid structural content response scope");
  }
  return { ok: true, scope: normalizeHistoryScope(value.scope), scheduled: value.scheduled };
}

export async function requestStructuralCommand(command: StructuralCommand) {
  const normalized = normalizeStructuralCommand(command);
  const response: unknown = await chrome.runtime.sendMessage({ type: STRUCTURAL_COMMAND.REQUEST_MESSAGE, ...normalized });
  return requireStructuralResponse(response, normalized.scope);
}