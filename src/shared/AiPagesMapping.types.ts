export type AiPagesMapping = { contentRoot: string; site: string };

export type AiPagesGroup = {
  mappings: readonly AiPagesMapping[];
  name: string;
  organization: string;
  tenantName: string;
};
