import { SITECORE } from "../../../constants/sitecore";

export type FieldLink = {
  label: string;
  itemId: string;
};

// One resolver per field-strategy, mirroring src/constants/_config.ts's per-strategy
// FoblesTopSelectors - but reading Sitecore's own raw markup directly (not the augmentor's
// injected buttons, which don't exist in a fetched/re-rooted document). Returns null when the
// marker isn't that strategy's shape at all, so collectSections' flat-text fallback still applies.
type FieldLinkResolver = (marker: HTMLElement) => FieldLink[] | null;

// A selected item's title is the display path - usually relative to the content root (e.g.
// "/Fobles Testing/Home"), but already absolute when the field's root lives outside content
// (e.g. a template picker: "/sitecore/templates/..."). Only prefix when it isn't already rooted.
function toItemPath(title: string): string {
  return title.startsWith(SITECORE.RELATIVE_PATHS_ENCODED.ROOT)
    ? title
    : `${SITECORE.RELATIVE_PATHS_ENCODED.ROOT}/content${title}`;
}

const resolveTreelistExLinks: FieldLinkResolver = (marker) => {
  const host = marker.querySelector<HTMLElement>(SITECORE.SELECTORS.TREELIST_EX);
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

const FIELD_LINK_RESOLVERS: readonly FieldLinkResolver[] = [resolveTreelistExLinks];

// Only treelist-ex is wired up so far (see docs/TODO.md) - every other strategy still falls back
// to a flat raw value until it gets its own resolver added to FIELD_LINK_RESOLVERS above.
export function resolveFieldLinks(marker: HTMLElement): FieldLink[] | null {
  for (const resolver of FIELD_LINK_RESOLVERS) {
    const links = resolver(marker);
    if (links) return links;
  }
  return null;
}
