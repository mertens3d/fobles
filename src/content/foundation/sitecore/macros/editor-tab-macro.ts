// @source-path [fobles] src/content/foundation/sitecore/macros/editor-tab-macro.ts

import { CONST } from "../../../../constants/const";
import { extensionLog } from "../../../logger";

const SITECORE_EDITOR_TAB_TIMEOUT_MS = 5000;

function getContentEditorDocument(doc: Document): Document | undefined {
  if (doc.querySelector(CONST.SITECORE.SELECTORS.EDITOR_TABS.ROOT)) {
    return doc;
  }
  try {
    const parentDoc = doc.defaultView?.parent.document;
    return parentDoc?.querySelector(CONST.SITECORE.SELECTORS.EDITOR_TABS.ROOT) ? parentDoc : undefined;
  } catch {
    return undefined;
  }
}

export async function openScInheritanceTab(doc: Document, signal: AbortSignal): Promise<Document | undefined> {
  const editorDoc = getContentEditorDocument(doc);
  const tab = editorDoc?.querySelector<HTMLAnchorElement>(CONST.SITECORE.SELECTORS.EDITOR_TABS.INHERITANCE);
  const frame = editorDoc?.querySelector<HTMLIFrameElement>(CONST.SITECORE.SELECTORS.EDITOR_FRAMES.INHERITANCE);
  if (!editorDoc || !tab || !frame) {
    extensionLog.warn("[openScInheritanceTab] - Sitecore Inheritance tab or frame not found", {
      editorDocumentFound: Boolean(editorDoc), tabFound: Boolean(tab), frameFound: Boolean(frame),
    });
    return undefined;
  }
  if (tab.classList.contains("scRibbonEditorTabNormal")) {
    tab.click();
  }
  return new Promise((resolve) => {
    const startedAt = performance.now();
    const poll = (): void => {
      let inheritanceDoc: Document | undefined;
      try {
        inheritanceDoc = frame.contentDocument ?? undefined;
      } catch {
        inheritanceDoc = undefined;
      }
      const ready = inheritanceDoc?.querySelector(CONST.SITECORE.SELECTORS.TEMPLATE_INHERITANCE.LIST);
      if (ready || signal.aborted || performance.now() - startedAt >= SITECORE_EDITOR_TAB_TIMEOUT_MS) {
        extensionLog.debug("[openScInheritanceTab] - Inheritance tab result", {
          ready: Boolean(ready), aborted: signal.aborted, elapsedMs: Math.round(performance.now() - startedAt),
          frameSrc: frame.getAttribute("src"),
        });
        resolve(ready ? inheritanceDoc : undefined);
      } else {
        window.setTimeout(poll, 50);
      }
    };
    poll();
  });
}
