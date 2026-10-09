export type RenderingGraphControl = {
  renderingId: string;
  name: string | undefined;
  path: string | undefined;
  template: string | undefined;
  datasource: string | undefined;
  datasourceLink: string | undefined;
  placeholder: string | undefined;
  uid: string | undefined;
  link: string | undefined;
  parameters: Record<string, string>;
};

export type RenderingGraphFieldLink = {
  label: string;
  itemId: string;
};

export type RenderingGraphField = {
  label: string;
  value: string | undefined;
  // Set when a field-link strategy (rendering-graph-field-links.ts) recognized this field's raw
  // markup as a list of other items - e.g. treelist-ex's Insert options - so each one can render
  // as its own clickable node instead of being flattened into `value`.
  links?: readonly RenderingGraphFieldLink[];
};

export type RenderingGraphSection = {
  name: string;
  fields: readonly RenderingGraphField[];
};


export type _baseItem = {
  name: string | undefined;
  itemId: string;
  link: string;
  path: string | undefined;
};

export type RenderingGraphChildItem = _baseItem & {
};

export type RenderingGraphReferrer = _baseItem & {
};

export type ReferenceGraphResult = {
  itemId: string;
  itemName: string | undefined;
  itemPath: string | undefined;
  itemTemplate: string | undefined;
  itemTemplateLink: string | undefined;
  itemLink: string;
  parentName: string | undefined;
  parentLink: string | undefined;
  parentPath: string | undefined;
  sharedLayoutName: string | undefined;
  sharedLayoutLink: string | undefined;
  sharedLayoutPath: string | undefined;
  controls: readonly RenderingGraphControl[];
  sections: readonly RenderingGraphSection[];
  childItems: readonly RenderingGraphChildItem[];
  referrers: readonly RenderingGraphReferrer[];
};
