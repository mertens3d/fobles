// Dynamic placeholders key each instance as "basekey-{renderingOrDatasourceGuid}-index" (e.g.
// "vert-column-1-{1F4F7280-6873-44F8-8A78-20EA0EF3D157}-0") so Sitecore can tell repeated
// instances of the same placeholder apart - stripped here so every instance of "vert-column-1"
// groups together instead of each becoming its own one-off placeholder group.
export function stripDynamicPlaceholderSuffix(segment: string): string {
  return segment.replace(/-\{[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\}-\d+$/i, "");
}

// Node ids only need to be unique strings - not real selectors - but keeping them readable helps
// when debugging via the devtools elements panel.
export function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function kindClass(kind: string): string {
  return `fobles-reference-graph-kind-${slugify(kind)}`;
}