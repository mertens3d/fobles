// @source-path [fobles] src/content/macros/macro-helpers/content-editor-postback-helper.ts

const SITECORE_CONTENT_EDITOR_POSTBACK_STABLE_ROOT_SELECTOR = "#Editors";
const SITECORE_CONTENT_EDITOR_POSTBACK_REPLACEMENT_SENTINEL_SELECTOR = ".scEditorHeader";
const SITECORE_CONTENT_EDITOR_POSTBACK_TIMEOUT_MS = 5000;

// @keep Sitecore Content Editor callbacks replace editor markup beneath #Editors.
// @keep The existing .scEditorHeader is used only as a DOM-generation replacement sentinel.
// @keep Validate both selectors when supporting another Sitecore version.
export function waitForSitecoreContentEditorPostbackReplacement(
  container: ParentNode,
  triggerPostback: () => void,
): Promise<void> {
  const stableRoot = container.querySelector(SITECORE_CONTENT_EDITOR_POSTBACK_STABLE_ROOT_SELECTOR);
  const replacementSentinel = stableRoot?.querySelector(
    SITECORE_CONTENT_EDITOR_POSTBACK_REPLACEMENT_SENTINEL_SELECTOR,
  );

  if (!(stableRoot instanceof Element)) {
    return Promise.reject(
      new Error(
        `Sitecore Content Editor postback root not found: ${SITECORE_CONTENT_EDITOR_POSTBACK_STABLE_ROOT_SELECTOR}`,
      ),
    );
  }

  if (!(replacementSentinel instanceof Element)) {
    return Promise.reject(
      new Error(
        `Sitecore Content Editor postback replacement sentinel not found: ${SITECORE_CONTENT_EDITOR_POSTBACK_REPLACEMENT_SENTINEL_SELECTOR}`,
      ),
    );
  }

  return new Promise<void>((resolve, reject) => {
    let settled = false;

    const settle = (error?: Error): void => {
      if (!settled) {
        settled = true;
        observer.disconnect();
        window.clearTimeout(timeoutId);
        if (error) reject(error);
        else resolve();
      }
    };

    const observer = new MutationObserver(() => {
      if (!replacementSentinel.isConnected) settle();
    });

    const timeoutId = window.setTimeout(() => {
      settle(
        new Error(
          `Sitecore Content Editor postback did not replace ${SITECORE_CONTENT_EDITOR_POSTBACK_REPLACEMENT_SENTINEL_SELECTOR} within ${SITECORE_CONTENT_EDITOR_POSTBACK_TIMEOUT_MS}ms`,
        ),
      );
    }, SITECORE_CONTENT_EDITOR_POSTBACK_TIMEOUT_MS);

    observer.observe(stableRoot, { childList: true, subtree: true });

    try {
      triggerPostback();
      if (!replacementSentinel.isConnected) settle();
    } catch (error) {
      settle(error instanceof Error ? error : new Error("Sitecore Content Editor postback trigger failed"));
    }
  });
}