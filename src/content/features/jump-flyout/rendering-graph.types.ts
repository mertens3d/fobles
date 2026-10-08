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

export type RenderingGraphFieldLink = {
  label: string;
  itemId: string;
};

export type RenderingGraphField = {
  label: string;
  value: string | null;
  // Set when a field-link strategy (rendering-graph-field-links.ts) recognized this field's raw
  // markup as a list of other items - e.g. treelist-ex's Insert options - so each one can render
  // as its own clickable node instead of being flattened into `value`.
  links?: readonly RenderingGraphFieldLink[];
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

export type RenderingGraphReferrer = {
  name: string | null;
  itemId: string;
  link: string;
  path: string | null;
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
  parentPath: string | null;
  sharedLayoutName: string | null;
  sharedLayoutLink: string | null;
  sharedLayoutPath: string | null;
  controls: readonly RenderingGraphControl[];
  sections: readonly RenderingGraphSection[];
  childItems: readonly RenderingGraphChildItem[];
  referrers: readonly RenderingGraphReferrer[];
};
