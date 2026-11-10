import type { AiPagesMapping, AiPagesGroup } from "../../../shared/AiPagesMapping.types";

export type ResolvedAiPagesMapping = AiPagesMapping & Omit<AiPagesGroup, "mappings">;
