import { CONST } from "../../constants/const";
import { buildFoblesUrl } from "../features/augmentor/helper";
import { type FieldLink } from "./sitecore-harvester.types";
import { type FieldLinkResolver } from "./sitecore-harvester.types";

// Only treelist-ex is wired up so far (see docs/TODO.md) - every other strategy still falls back
// to a flat raw value until it gets its own resolver added to FIELD_LINK_RESOLVERS above.

export function resolveFieldLinks(marker: HTMLElement): FieldLink[] | null {
    for (const resolver of FIELD_LINK_RESOLVERS) {
        const links = resolver(marker);
        if (links){
            return links;
        }
    }
    return null;
}

export const resolveTreelistExLinks: FieldLinkResolver = (marker) => {
  const host = marker.querySelector<HTMLElement>(CONST.SITECORE.SELECTORS.TREELIST_EX.ROOT);
  if (!host) return null;

  const links = Array.from(host.children)
  .filter((child): child is HTMLElement => child.tagName === "DIV" && child.hasAttribute("title"))
  .map((child) => {
      const title = child.getAttribute("title")?.trim();
      const label = child.textContent?.trim();
      return title && label ? { itemId: toItemPath(title), label } : null;
    })
    .filter((link): link is FieldLink => link !== null);
    
    return links.length > 0 ? links : null;
};

export const FIELD_LINK_RESOLVERS: readonly FieldLinkResolver[] = [resolveTreelistExLinks];
// A selected item's title is the display path - usually relative to the content root (e.g.
// "/Fobles Testing/Home"), but already absolute when the field's root lives outside content
// (e.g. a template picker: "/sitecore/templates/..."). Only prefix when it isn't already rooted.

export function toItemPath(title: string): string {
  return title.startsWith(CONST.SITECORE.RELATIVE_PATHS_ENCODED.ROOT)
    ? title
    : `${CONST.SITECORE.RELATIVE_PATHS_ENCODED.ROOT}/content${title}`;
}// "local:" datasource paths are relative to the item the rendering is placed on - everything
// else (a GUID, or an already-absolute /sitecore/... path) can go straight to buildFoblesUrl.

export function resolveDatasourceLink(datasource: string | undefined, currentItemPath: string | undefined): string | undefined {
  if (!datasource) return undefined;
  if (!datasource.toLowerCase().startsWith("local:")) return buildFoblesUrl(datasource);
  if (!currentItemPath) return undefined;
  return buildFoblesUrl(`${currentItemPath}${datasource.slice("local:".length)}`);
}
