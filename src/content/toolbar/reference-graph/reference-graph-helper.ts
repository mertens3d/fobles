// Node ids only need to be unique strings - not real selectors - but keeping them readable helps
// when debugging via the devtools elements panel.
export function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
