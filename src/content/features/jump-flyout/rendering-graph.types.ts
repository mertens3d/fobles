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

export type RenderingGraphField = {
  label: string;
  value: string | null;
};

export type RenderingGraphSection = {
  name: string;
  fields: readonly RenderingGraphField[];
};

export type RenderingGraphChildItem = {
  name: string | null;
  itemId: string;
  link: string;
};

export type RenderingGraphResult = {
  itemId: string;
  itemName: string | null;
  itemPath: string | null;
  itemTemplate: string | null;
  itemTemplateLink: string | null;
  itemLink: string;
  parentName: string | null;
  parentLink: string | null;
  sharedLayoutName: string | null;
  sharedLayoutLink: string | null;
  controls: readonly RenderingGraphControl[];
  sections: readonly RenderingGraphSection[];
  childItems: readonly RenderingGraphChildItem[];
};
