export function toBracedGuid(id: string): string {
  return `{${id.toUpperCase()}}`;
}

export function toBracedGuidQuery(id: string): string {
  return encodeURIComponent(toBracedGuid(id));
}
