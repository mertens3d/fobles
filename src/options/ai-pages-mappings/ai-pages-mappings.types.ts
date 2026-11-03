// @source-path [fobles] src/options/ai-pages-mappings/ai-pages-mappings.types.ts

export type EditableAiPagesMapping = { id: string; contentRoot: string; site: string };

export type EditableAiPagesGroup = {
  id: string;
  name: string;
  organization: string;
  tenantName: string;
  mappings: EditableAiPagesMapping[];
};

export type AiPagesFieldErrors = Record<string, string>;
