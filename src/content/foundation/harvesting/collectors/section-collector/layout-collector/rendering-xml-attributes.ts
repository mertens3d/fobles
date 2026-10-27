// @source-path [fobles] src/content/foundation/harvesting/collectors/section-collector/layout-collector/rendering-xml-attributes.ts
import type { RenderingAttributeName, SitecoreRenderingXml } from "./sitecore-layout-xml-schema.types";

export function readRenderingAttribute(rendering: SitecoreRenderingXml, name: RenderingAttributeName): string | undefined {
  return rendering[name] ?? rendering[`s:${name}`];
}
