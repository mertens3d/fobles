export type AiPagesMapping = { contentRoot: string; site: string };

export type AiPagesGroup = {
  name: string;
  organization: string;
  tenantName: string;
  mappings: AiPagesMapping[];
};
