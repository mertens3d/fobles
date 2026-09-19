import { extensionLog } from "../../../logger";
import { isMenuOwnedFrame } from "../../../guard";
import { SITECORE } from "../../../sitecore";
import { FOBLES } from "../constants";
import {
  buildFoblesUrl,
  openFoblesUrl,
} from "../helper";
import { attachFoblesTooltip } from "../shared/fobles-tooltip";
import { extractGuid, formatFoId } from "../shared/guid";

export function clearTreeButtons(root: ParentNode = document): void {
  root.querySelectorAll(`.${FOBLES.CLASSES.TREE.BUTTON}`).forEach((button) => button.remove());
  root.querySelectorAll(`.${FOBLES.CLASSES.TREE.WRAPPER}`).forEach((wrapper) => wrapper.remove());
  root.querySelectorAll(`.${FOBLES.CLASSES.TREE.SPACER}`).forEach((spacer) => spacer.remove());

  root.querySelectorAll(`${SITECORE.SELECTORS.TREE_GLYPH}.${FOBLES.CLASSES.TREE.GLYPH_HIDDEN}`).forEach((glyph) => {
    const icon = glyph as HTMLImageElement;
    icon.classList.remove(FOBLES.CLASSES.TREE.GLYPH_HIDDEN);
  });

  root.querySelectorAll(FOBLES.SELECTORS.FRAMES).forEach((frame) => {
    try {
      const frameEl = frame as HTMLIFrameElement | HTMLFrameElement;
      if (isMenuOwnedFrame(frameEl)) return;

      const doc = frameEl.contentDocument || frameEl.contentWindow?.document;
      if (doc) {
        clearTreeButtons(doc);
      }
    } catch {
      // Ignore cross-origin frames.
    }
  });
}

export function toggleTreeButtons(): void {
  const buttonClass = FOBLES.CLASSES.TREE.BUTTON;

  function buildNewUrl(itemId: string): string {
    return buildFoblesUrl(formatFoId(itemId));
  }

  function removeOpenButtons(root: ParentNode): void {
    clearTreeButtons(root);
  }

  function extractItemIdFromAnchor(anchor: Element | null): string | null {
    if (!anchor) return null;

    const attributes = [
      anchor.getAttribute("href"),
      anchor.getAttribute("onclick"),
      anchor.getAttribute("data-id"),
      anchor.getAttribute("id"),
    ];

    for (const value of attributes) {
      if (!value) continue;

      const guid = extractGuid(value);
      if (guid) {
        return guid;
      }

      const bare = value.match(new RegExp(`${SITECORE.TREE_ID_PREFIXES.GLYPH}(.+)$`));
      if (bare) {
        return bare[1];
      }
    }

    return null;
  }

  function getTreeNodeItemId(node: Element): string | null {
    const glyph = node.querySelector(SITECORE.SELECTORS.TREE_GLYPH) as HTMLImageElement | null;
    const anchor = node.querySelector(SITECORE.SELECTORS.TREE_NODE_LINK) as HTMLAnchorElement | null;

    extensionLog.debug("tree node inspect", {
      nodeHtml: node.outerHTML.slice(0, 400),
      glyphId: glyph?.id ?? null,
      anchorId: anchor?.id ?? null,
    });

    if (glyph?.id) {
      const raw = glyph.id.replace(SITECORE.TREE_ID_PREFIXES.GLYPH, "");
      if (raw) return raw;
    }

    if (anchor?.id) {
      const raw = anchor.id.replace(SITECORE.TREE_ID_PREFIXES.NODE, "");
      if (raw) return raw;
    }

    const directId = node.getAttribute("id") ?? "";
    if (directId.startsWith(SITECORE.TREE_ID_PREFIXES.NODE)) {
      return directId.replace(SITECORE.TREE_ID_PREFIXES.NODE, "");
    }

    if (directId.startsWith(SITECORE.TREE_ID_PREFIXES.GLYPH)) {
      return directId.replace(SITECORE.TREE_ID_PREFIXES.GLYPH, "");
    }

    if (directId.startsWith(SITECORE.TREE_ID_PREFIXES.SELECT_RENDERING)) {
      return directId.replace(
        SITECORE.TREE_ID_PREFIXES.SELECT_RENDERING,
        "",
      );
    }

    return null;
  }

  function addOpenButton(node: Element): void {
    if (node.querySelector(`.${buttonClass}`)) {
      extensionLog.debug("tree node already has fobles", node.outerHTML.slice(0, 200));
      return;
    }

    const itemId = getTreeNodeItemId(node);
    extensionLog.debug("tree node itemId", itemId);

    if (!itemId) {
      extensionLog.debug("tree node could not resolve itemId", node.outerHTML.slice(0, 400));
      return;
    }

    const glyph = node.querySelector(SITECORE.SELECTORS.TREE_GLYPH) as HTMLImageElement | null;
    const glyphHeight = glyph
      ? Math.ceil(glyph.getBoundingClientRect().height || glyph.clientHeight || glyph.offsetHeight || 18)
      : 18;
    const measuredHeight = Math.max(glyphHeight, 18) + 2;

    const wrapper = document.createElement("div");
    wrapper.className = FOBLES.CLASSES.TREE.WRAPPER;
    wrapper.style.setProperty(FOBLES.CSS_PROPERTIES.TREE_HEIGHT, `${measuredHeight}px`);

    const button = document.createElement("button");
    button.type = "button";
    button.className = buttonClass;
    button.textContent = FOBLES.SYMBOLS.TREE_BUTTON;
    attachFoblesTooltip(button);
    button.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      void openFoblesUrl(buildNewUrl(itemId), event);
      return false;
    };

    wrapper.appendChild(button);

    if (glyph) {
      const spacer = glyph.cloneNode(false) as HTMLImageElement;
      spacer.removeAttribute("id");
      Array.from(spacer.attributes).forEach((attribute) => {
        if (attribute.name.toLowerCase().startsWith("on")) {
          spacer.removeAttribute(attribute.name);
        }
      });
      spacer.classList.add(FOBLES.CLASSES.TREE.SPACER);
      spacer.alt = "";
      spacer.setAttribute("aria-hidden", "true");
      spacer.style.visibility = "hidden";
      spacer.style.pointerEvents = "none";

      glyph.classList.add(FOBLES.CLASSES.TREE.GLYPH_HIDDEN);
      glyph.after(spacer);
    }

    node.insertBefore(wrapper, node.firstChild);
    extensionLog.debug("tree node button inserted", { itemId, measuredHeight, nodeHtml: node.outerHTML.slice(0, 250) });
  }

  function walkTree(root: Document | ShadowRoot): void {
    root.querySelectorAll(SITECORE.SELECTORS.TREE_ROOT).forEach((treePanel) => {
      treePanel.querySelectorAll(SITECORE.SELECTORS.TREE_NODE).forEach((node) => {
        addOpenButton(node);
      });
    });

    root.querySelectorAll(FOBLES.SELECTORS.FRAMES).forEach((frame) => {
      try {
        const frameEl = frame as HTMLIFrameElement | HTMLFrameElement;
        if (isMenuOwnedFrame(frameEl)) return;

        const doc = frameEl.contentDocument || frameEl.contentWindow?.document;
        if (doc) {
          walkTree(doc);
        }
      } catch {
        // Ignore cross-origin frames.
      }
    });
  }

  const existingTreeButtons = document.querySelectorAll(`.${buttonClass}`);

  if (existingTreeButtons.length > 0) {
    removeOpenButtons(document);
    return;
  }

  walkTree(document);
}
