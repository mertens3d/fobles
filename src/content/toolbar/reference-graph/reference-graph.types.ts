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
export type TreeChildNode = {
  name: string | undefined;
  itemId: string;
};
