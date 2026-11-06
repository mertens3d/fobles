import type { STRUCTURAL_COMMAND } from "./structural.const.ts";
import type { StructuralScope } from "./structural.types.ts";

export type StructuralAction = typeof STRUCTURAL_COMMAND.ACTION[keyof typeof STRUCTURAL_COMMAND.ACTION];

export type StructuralCommand = { action: StructuralAction; scope: StructuralScope };

export type StructuralCommandResponse =
  | { ok: true; scope: StructuralScope; scheduled: number }
  | { ok: false; error: string };

export type StructuralRelayDependencies = {
  queryTabs: () => Promise<chrome.tabs.Tab[]>;
  send: (tabId: number, message: unknown) => Promise<unknown>;
};