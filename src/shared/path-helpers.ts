// No fetch needed - buildFoblesUrl accepts a sitecore path just as well as a guid, and the
// parent's path is just the current item's path with its last segment dropped.
export function getParentPath(itemPath: string | undefined): string | undefined {
  if (!itemPath) return undefined;
  const segments = itemPath.split("/").filter(Boolean);
  if (segments.length <= 1) return undefined;
  segments.pop();
  return `/${segments.join("/")}`;
}