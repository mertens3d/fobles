import { CONST } from "../../constants/const";
import { formatFoId, stripGuidBraces } from "../features/augmentor/shared/guid";
import type { GlyphState } from "../toolbar/reference-graph/graph.types";
import type { TreeChildNode } from "../toolbar/reference-graph/reference-graph.types";

export function getGlyphId(itemId: string): string {
  return `${CONST.SITECORE.TREE_ID_PREFIXES.GLYPH}${stripGuidBraces(itemId).replace(/-/g, "").toUpperCase()}`;
}

// A leaf (no children at all) renders a plain spacer glyph (noexpand15x15.gif) - neither
// expanded nor collapsed - so it has to be its own state, not just "not expanded", or a leaf
// gets misread as collapsed and clicked (a no-op at best; see collectTreeChildren below).
export function getGlyphState(glyph: HTMLImageElement): GlyphState {
  const src = glyph.src.toLowerCase();
  if (src.includes("treemenu_expanded")) return "expanded";
  if (src.includes("treemenu_collapsed")) return "collapsed";
  return "leaf";
}

// Children of an expanded node live in a single trailing, unclassed <div> right after its own
// Tree_Node_ anchor (see src/reference graph/example markup/tree partial.html) - :scope keeps
// this to direct children only, not every descendant node further down the tree.
export function readChildNodes(glyph: HTMLImageElement): TreeChildNode[] {
  const anchor = glyph.parentElement?.querySelector<HTMLAnchorElement>(CONST.SITECORE.SELECTORS.TREE.NODE_LINK);
  const childrenContainer = anchor?.nextElementSibling;
  if (!childrenContainer) return [];

  return Array.from(childrenContainer.querySelectorAll<HTMLElement>(`:scope > ${CONST.SITECORE.SELECTORS.TREE.NODE}`))
    .map((childNode) => {
      const childGlyph = childNode.querySelector<HTMLImageElement>(CONST.SITECORE.SELECTORS.TREE.GLYPH);
      const childAnchor = childNode.querySelector<HTMLAnchorElement>(CONST.SITECORE.SELECTORS.TREE.NODE_LINK);
      const rawId = childGlyph?.id.replace(CONST.SITECORE.TREE_ID_PREFIXES.GLYPH, "");
      const name = childAnchor?.textContent?.trim() ?? undefined;
      if (!rawId) return undefined;
      return { name, itemId: formatFoId(rawId) };
    })
    .filter((child): child is TreeChildNode => child !== undefined);
}

// Polls (rather than a MutationObserver) since it only needs to notice one thing: some glyph's
// src flipping to expanded once Sitecore's postback finishes loading the children. Re-queries by
// id on every tick rather than trusting the element captured before the click - Sitecore's AJAX
// response can replace the whole node's markup (new elements, same ids), leaving a pre-click
// reference detached and permanently stuck in its old state. Returns undefined on a detached/static
// document (e.g. one built from fetch() + DOMParser, not the live page) - clicking there doesn't
// trigger any real postback, so this just times out harmlessly.
export function waitForExpansion(doc: Document, glyphId: string, timeoutMs = 3_000): Promise<HTMLImageElement | undefined> {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const poll = (): void => {
      const glyph = doc.getElementById(glyphId) as HTMLImageElement | undefined;
      if ((glyph && getGlyphState(glyph) === "expanded") || Date.now() - startedAt >= timeoutMs) {
        resolve(glyph);
        return;
      }
      setTimeout(poll, 100);
    };
    poll();
  });
}
