import { STRUCTURAL } from "../../../../../shared/structural/structural.const.ts";

export const ITEM_KIND_LIMITS = {
  MAX_UNIQUE_TEMPLATES: STRUCTURAL.MAX_TEMPLATES,
  MAX_VISITED_ANCESTORS: STRUCTURAL.MAX_ANCESTORS,
} as const;