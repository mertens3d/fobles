import type { ItemKind } from "../../../../shared/structural/structural.types.ts";

export type TemplateDerivedRecord = {
  complete: boolean;
  fingerprint: string;
  inheritedIds: readonly string[];
  kind: ItemKind;
};