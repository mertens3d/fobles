export type RenderingGraphControl = {
  renderingId: string;
  name: string | null;
  path: string | null;
  template: string | null;
  datasource: string | null;
  datasourceLink: string | null;
  placeholder: string | null;
  uid: string | null;
  link: string | null;
  parameters: Record<string, string>;
};

export type RenderingGraphResult = {
  itemId: string;
  itemName: string | null;
  itemPath: string | null;
  itemTemplate: string | null;
  itemTemplateLink: string | null;
  itemLink: string;
  sharedLayoutName: string | null;
  sharedLayoutLink: string | null;
  controls: readonly RenderingGraphControl[];
};
