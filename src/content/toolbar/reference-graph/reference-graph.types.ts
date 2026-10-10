
export type ReferenceGraphControl = {
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

export type ReferenceGraphFieldLink = {
  label: string;
  itemId: string;
};

export type ReferenceGraphField = {
  label: string;
  value: string | undefined;
  // Set when a field-link strategy (reference-graph-field-links.ts) recognized this field's raw
  // markup as a list of other items - e.g. treelist-ex's Insert options - so each one can render
  // as its own clickable node instead of being flattened into `value`.
  links?: readonly ReferenceGraphFieldLink[];
};

export type ReferenceGraphSection = {
  name: string;
  fields: readonly ReferenceGraphField[];
};


export type itemNodeData = {
  name: string | undefined;
  itemId: string;
  link: string | undefined;
  path: string | undefined;
  templateLink: string | undefined;
  template: string | undefined;
};

export type ReferenceGraphResult = {
  rootItem: itemNodeData;
  parent: itemNodeData | undefined;
  sharedLayoutName: string | undefined;
  sharedLayoutLink: string | undefined;
  sharedLayoutPath: string | undefined;
  controls: readonly ReferenceGraphControl[] | undefined;
  sections: readonly ReferenceGraphSection[] | undefined;
  childItems: readonly itemNodeData[] | undefined;
  referrers: readonly itemNodeData[] | undefined;
};


export type SatelliteDescriptor = {
  kind: string;
  value: string | undefined;
  link?: string | undefined;
  // Defaults to `kind` - set explicitly when `kind` is really a dynamic label (section field
  // names) rather than a fixed category, so coloring still falls into one shared bucket.
  category?: string;
  // Referrer -> this item is the real-world direction (a referrer points at this item), the
  // opposite of every other satellite (this item -> its template/datasource/child/...).
  reverse?: boolean;
  // One of FILTER_DEFS' classes - lets the Parent/Children/Layout/Referrers/Sections checkboxes
  // show/hide this node (and transitively its edges) without rebuilding the graph.
  filterClass?: string;
  // Full path, shown only in the tooltip - `value` stays short (e.g. a name) for the node label.
  path?: string | undefined;
  // Visually nests this node inside a compound box (e.g. the Layout super-compound) on top of
  // its normal edge - nesting and edges are independent in cytoscape, so both can apply at once.
  compoundParent?: string;
  // Skips the "[kind]" suffix buildLabel normally adds - for kinds whose container already makes
  // that implicit (e.g. a Child inside the "Children" box), same as Control nodes do already.
  plainLabel?: boolean;
};
export type TooltipData = {
  name: string | undefined;
  guid: string | undefined;
  path: string | undefined;
  placeholder: string | undefined;
};
export type ParsedDevice = {
  layoutId: string | undefined;
  controls: ReferenceGraphControl[];
};


export type TreeChildNode = {
  name: string | undefined;
  itemId: string;
};

