
import { ATTRIBUTE, SELECTORS } from "../../constants";
import { SITECORE } from "../../sitecore";
import { extensionLog } from "../../logger";
import { FOBLES } from "./constants";
import { fieldConfigs } from "./_config";
import { walkFrameDocuments } from "./shared/frame-documents";
import type { FoblesConfig, FoblesStrategy } from "./fobles.types";
import { applyDroplinkStrategy } from "./field-strategies/sc-droplink";
import { applyDroplistStrategy } from "./field-strategies/sc-droplist";
import { applyDropTreeStrategy } from "./field-strategies/sc-droptree";
import { applyFileStrategy } from "./field-strategies/sc-file";
import { applyGeneralLinkStrategy } from "./field-strategies/sc-generallink";
import { applyIconStrategy } from "./field-strategies/sc-icon";
import { applyImageStrategy } from "./field-strategies/sc-image";
import { applyInternalLinkStrategy } from "./field-strategies/sc-internallink";
import { applyMultilistStrategy } from "./field-strategies/sc-multilist";
import { applyMultilistWithSearchStrategy } from "./field-strategies/sc-multilistwithsearch";
import { applyTagListStrategy } from "./field-strategies/sc-taglist";
import { applyTreeListStrategy } from "./field-strategies/sc-treelist";
import { applyTreelistExStrategy } from "./field-strategies/sc-treelistex";
import { applyQuickInfoSectionStrategy } from "./editor-strategies/quick-info-section";
import { applyReferenceLinksStrategy } from "./editor-strategies/reference-links";
import { applyTemplatePathStrategy } from "./editor-strategies/template-path";
import { applyStyleChecklistStrategy } from "./field-strategies/sc-style-checklist";
import { removeFoblesTooltips } from "./shared/fobles-tooltip";

const foblesDismissListeners = new WeakSet<Document>();
let dismissFoblesHandler: (() => void) | null = null;

export function setFoblesDismissHandler(handler: (() => void) | null): void {
  dismissFoblesHandler = handler;
}

function listenForFoblesDismissal(doc: Document): void {
  if (foblesDismissListeners.has(doc)) return;

  doc.addEventListener("click", (event) => {
    const target = event.target as Node | null;
    if (!target) return;

    const targetElement = target.nodeType === Node.ELEMENT_NODE
      ? target as Element
      : target.parentElement;
    if (
      targetElement?.closest(FOBLES.SELECTORS.BUTTON) ||
      targetElement?.closest(`.${FOBLES.CLASSES.DIALOG.BASE}`) ||
      doc.querySelector(SELECTORS.TOOLBAR_CONTAINER)?.contains(target)
    ) {
      return;
    }

    dismissFoblesHandler?.();
  });
  foblesDismissListeners.add(doc);
}

function applyStrategy(
  doc: Document,
  strategy: FoblesStrategy,
  config: FoblesConfig,
): void {
  switch (strategy) {
    case "drop-link":
      if (config.strategy !== "drop-link") return;
      applyDroplinkStrategy(doc, config);
      return;
    case "drop-tree":
      if (config.strategy !== "drop-tree") return;
      applyDropTreeStrategy(doc, config);
      return;
    case "droplist":
      if (config.strategy !== "droplist") return;
      applyDroplistStrategy(doc, config);
      return;
    case "file":
      if (config.strategy !== "file") return;
      applyFileStrategy(doc, config);
      return;
    case "general-link":
      if (config.strategy !== "general-link") return;
      applyGeneralLinkStrategy(doc, config);
      return;
    case "icon":
      if (config.strategy !== "icon") return;
      applyIconStrategy(doc, config);
      return;
    case "image":
      if (config.strategy !== "image") return;
      applyImageStrategy(doc, config);
      return;
    case "internal-link":
      if (config.strategy !== "internal-link") return;
      applyInternalLinkStrategy(doc, config);
      return;
    case "multilist-options":
      if (config.strategy !== "multilist-options") return;
      applyMultilistStrategy(doc, config);
      return;
    case "multilist-with-search":
      if (config.strategy !== "multilist-with-search") return;
      applyMultilistWithSearchStrategy(doc, config);
      return;
    case "quick-info-section":
      if (config.strategy !== "quick-info-section") return;
      applyQuickInfoSectionStrategy(doc, config);
      return;
    case "reference-links":
      if (config.strategy !== "reference-links") return;
      applyReferenceLinksStrategy(doc, config);
      return;
    case "style-checklist":
      if (config.strategy !== "style-checklist") return;
      applyStyleChecklistStrategy(doc, config);
      return;
    case "tag-list":
      if (config.strategy !== "tag-list") return;
      applyTagListStrategy(doc, config);
      return;
    case "template-path":
      if (config.strategy !== "template-path") return;
      applyTemplatePathStrategy(doc, config);
      return;
    case "tree-list":
      if (config.strategy !== "tree-list") return;
      applyTreeListStrategy(doc, config);
      return;
    case "treelist-ex":
      if (config.strategy !== "treelist-ex") return;
      applyTreelistExStrategy(doc, config);
      return;
    default: {
      const exhaustive: never = strategy;
      return exhaustive;
    }
  }
}

function walkDocuments(doc: Document, callback: (currentDoc: Document) => void): void {
  walkFrameDocuments(doc, callback, { skipMenuOwned: true });
}

function walkAllDocuments(doc: Document, callback: (currentDoc: Document) => void): void {
  walkFrameDocuments(doc, callback);
}

export function triggerFobles(doc: Document): void {
  walkDocuments(doc, (currentDoc) => {
    listenForFoblesDismissal(currentDoc);
    extensionLog.debug("triggerFobles", {
      url: location.href,
      topVsSelf: window.top !== window.self,
      frameElement: !!window.frameElement,
      readyState: document.readyState,
      selectCount: currentDoc.querySelectorAll("select").length,
      contentControlCount: currentDoc.querySelectorAll(SITECORE.SELECTORS.CONTENT_CONTROL).length,
      comboCount: currentDoc.querySelectorAll(SITECORE.SELECTORS.COMBOBOX).length,
      hasScEditorFieldMarker: !!currentDoc.querySelector(SITECORE.SELECTORS.EDITOR_FIELD_MARKER),
      iframeCount: currentDoc.querySelectorAll("iframe").length,
    });

    fieldConfigs.forEach((config) => {
      applyStrategy(currentDoc, config.strategy, config);
    });
  });
}

export function clearFobles(doc: Document): void {
  walkAllDocuments(doc, (currentDoc) => {
    removeFoblesTooltips(currentDoc);
    const headerArea = currentDoc.querySelector(SITECORE.SELECTORS.GLOBAL_HEADER_CONTENT);
    extensionLog.debug("clearFobles start", {
      headerButtons: headerArea ? headerArea.querySelectorAll("button").length : 0,
    });

    const resetElement = (el: HTMLElement): void => {
      el.classList.remove(FOBLES.CLASSES.HIDDEN);
      el.style.removeProperty(FOBLES.CSS_PROPERTIES.HEIGHT);
      el.removeAttribute(FOBLES.ATTRIBUTES.MARKER);
    };

    const restoreOriginal = (original: HTMLElement | null): void => {
      if (!original) return;
      resetElement(original);
    };

    currentDoc.querySelectorAll(FOBLES.SELECTORS.WRAPPER).forEach((wrapperEl) => {
      const wrapper = wrapperEl as HTMLElement;
      const original =
        (wrapper.previousElementSibling as HTMLElement | null) ??
        (wrapper.parentElement?.querySelector(FOBLES.SELECTORS.HIDDEN_PROCESSED) as HTMLElement | null) ??
        (wrapper.querySelector(FOBLES.SELECTORS.HIDDEN_PROCESSED) as HTMLElement | null) ??
        (wrapper.querySelector(FOBLES.SELECTORS.PROCESSED) as HTMLElement | null);

      const button = wrapper.querySelector(FOBLES.SELECTORS.BUTTON) ?? wrapper.querySelector(FOBLES.SELECTORS.TEMPLATE_BUTTON);
      if (button) {
        button.remove();
      }

      if (original && original !== wrapper && original !== button) {
        resetElement(original);
      }

      if (original && original.parentNode && original.nextElementSibling === wrapper) {
        wrapper.remove();
        return;
      }

      wrapper.remove();
    });

    currentDoc.querySelectorAll(FOBLES.SELECTORS.BUTTON).forEach((button) => {
      if (button.hasAttribute(ATTRIBUTE.DATA.KEY.FOBLES_NAV_OWNER)) return;
      button.remove();
    });

    currentDoc.querySelectorAll(`${SITECORE.SELECTORS.MULTILIST_BOX}${FOBLES.SELECTORS.PROCESSED}`).forEach((el) => {
      resetElement(el as HTMLElement);
    });

    currentDoc.querySelectorAll(`${SITECORE.SELECTORS.MULTILIST}${FOBLES.SELECTORS.PROCESSED}`).forEach((el) => {
      resetElement(el as HTMLElement);
    });

    currentDoc.querySelectorAll(FOBLES.SELECTORS.TEMPLATE_BUTTON).forEach((button) => {
      const prev = button.previousElementSibling;
      if (prev && prev.tagName === "SPAN" && getComputedStyle(prev).display === "none") {
        prev.remove();
      }
      button.remove();
    });

    currentDoc.querySelectorAll(FOBLES.SELECTORS.PROCESSED).forEach((el) => {
      resetElement(el as HTMLElement);
    });

    currentDoc.querySelectorAll(FOBLES.SELECTORS.HIDDEN_PROCESSED).forEach((el) => {
      restoreOriginal(el as HTMLElement);
    });

    currentDoc.querySelectorAll(`.${FOBLES.CLASSES.HIDDEN}`).forEach((el) => {
      resetElement(el as HTMLElement);
    });

    currentDoc.querySelectorAll(`.${FOBLES.CLASSES.FIELD_SPACER}`).forEach((spacer) => {
      spacer.remove();
    });

    currentDoc.querySelectorAll(`${SITECORE.SELECTORS.MULTILIST_NAV_BUTTON}, ${SITECORE.SELECTORS.MULTILIST_FIELD_BUTTONS}`).forEach((el) => {
      const htmlEl = el as HTMLElement;
      htmlEl.classList.remove(FOBLES.CLASSES.HIDDEN);
      htmlEl.style.display = "";
    });
  });
}
