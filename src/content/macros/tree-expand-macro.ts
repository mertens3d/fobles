import { SITECORE } from "../../constants/sitecore";
import { formatFoId, stripGuidBraces } from "../features/augmentor/shared/guid";

export type TreeChildNode = {
  name: string | null;
  itemId: string;
};

function getGlyphId(itemId: string): string {
  return `${SITECORE.TREE_ID_PREFIXES.GLYPH}${stripGuidBraces(itemId).replace(/-/g, "").toUpperCase()}`;
}

function isExpanded(glyph: HTMLImageElement): boolean {
  return glyph.src.toLowerCase().includes("treemenu_expanded");
}

// Children of an expanded node live in a single trailing, unclassed <div> right after its own
// Tree_Node_ anchor (see src/rendering graph/example markup/tree partial.html) - :scope keeps
// this to direct children only, not every descendant node further down the tree.
function readChildNodes(glyph: HTMLImageElement): TreeChildNode[] {
  const anchor = glyph.parentElement?.querySelector<HTMLAnchorElement>(SITECORE.SELECTORS.TREE_NODE_LINK);
  const childrenContainer = anchor?.nextElementSibling;
  if (!childrenContainer) return [];

  return Array.from(childrenContainer.querySelectorAll<HTMLElement>(`:scope > ${SITECORE.SELECTORS.TREE_NODE}`))
    .map((childNode) => {
      const childGlyph = childNode.querySelector<HTMLImageElement>(SITECORE.SELECTORS.TREE_GLYPH);
      const childAnchor = childNode.querySelector<HTMLAnchorElement>(SITECORE.SELECTORS.TREE_NODE_LINK);
      const rawId = childGlyph?.id.replace(SITECORE.TREE_ID_PREFIXES.GLYPH, "");
      const name = childAnchor?.textContent?.trim() ?? null;
      if (!rawId) return null;
      return { name, itemId: formatFoId(rawId) };
    })
    .filter((child): child is TreeChildNode => child !== null);
}

// Polls (rather than a MutationObserver) since it only needs to notice one thing: the glyph's
// own src flipping to expanded once Sitecore's postback finishes loading the children. A no-op
// on a detached/static document (e.g. one built from fetch() + DOMParser, not the live page) -
// clicking there doesn't trigger any real postback, so this just times out harmlessly.
function waitForExpansion(glyph: HTMLImageElement, timeoutMs = 2_000): Promise<void> {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const poll = (): void => {
      if (isExpanded(glyph) || Date.now() - startedAt >= timeoutMs) {
        resolve();
        return;
      }
      setTimeout(poll, 100);
    };
    poll();
  });
}

// Finds itemId's own tree node, expanding it first (and restoring it back to collapsed
// afterward) if needed, then returns its direct children. Only the live document can actually
// expand anything - see waitForExpansion's note - so a fetched/static document just reports
// whatever children happen to already be rendered (usually none).
export async function collectTreeChildren(doc: Document, itemId: string): Promise<TreeChildNode[]> {
  const glyph = doc.getElementById(getGlyphId(itemId)) as HTMLImageElement | null;
  if (!glyph) return [];

  const wasCollapsed = !isExpanded(glyph);
  if (wasCollapsed) {
    glyph.click();
    await waitForExpansion(glyph);
  }

  const children = readChildNodes(glyph);

  if (wasCollapsed && isExpanded(glyph)) {
    glyph.click();
  }

  return children;
}
