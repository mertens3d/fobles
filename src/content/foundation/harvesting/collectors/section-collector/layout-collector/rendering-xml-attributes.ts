// @source-path [fobles] src/content/foundation/harvesting/collectors/section-collector/layout-collector/rendering-xml-attributes.ts
import type { SitecoreRenderingXml } from "./layout-collector.types";
import type { RenderingAttributeName } from "./layout-collector.types";

export function readRenderingAttribute(
  rendering: SitecoreRenderingXml,
  name: RenderingAttributeName,
): string | undefined {
  return rendering[name] ?? rendering[`s:${name}`];
}
