import { normalizeHistoryScope } from "../shared/item-history/item-history-model.ts";
import { applyKnownSitesChange, knownSitesStorageKey, normalizeKnownSitesChange } from "../shared/known-sites/known-sites-model.ts";
import { readKnownSites } from "../shared/known-sites/known-sites-repository.ts";
import { setStorageValue } from "../shared/storage/storage.ts";
import { KNOWN_SITES } from "../shared/structural/structural.const.ts";
import type { KnownSite, KnownSitesChange, KnownSitesResponse, StructuralScope } from "../shared/structural/structural.types.ts";

let writerQueue: Promise<void> = Promise.resolve();

export function validateKnownSitesSender(scope: StructuralScope, sender: chrome.runtime.MessageSender): void {
  const url = sender.url ?? sender.tab?.url;
  const optionsUrl = chrome.runtime.getURL("options.html");
  const trustedOptions = sender.id === chrome.runtime.id && sender.url === optionsUrl;
  if (!trustedOptions) {
    const senderScope = normalizeHistoryScope({ origin: url, database: scope.database });
    if (sender.id !== chrome.runtime.id || senderScope.origin !== scope.origin ||
      (sender.origin !== undefined && sender.origin !== scope.origin)) {
      throw new TypeError("Known Sites sender origin does not match scope");
    }
  }
}

export function enqueueKnownSitesChange(scope: StructuralScope, change: KnownSitesChange): Promise<KnownSite[]> {
  const result = writerQueue.then(async () => {
    const next = applyKnownSitesChange(await readKnownSites(scope), change, Date.now());
    await setStorageValue({ [knownSitesStorageKey(scope)]: next }, "local", true);
    return next;
  });
  writerQueue = result.then(() => undefined, () => undefined);
  return result;
}

function handleKnownSitesMessage(
  message: unknown,
  sender: chrome.runtime.MessageSender,
  respond: (response: KnownSitesResponse) => void,
): boolean {
  let keepOpen = false;
  if (typeof message === "object" && message !== null && "type" in message && message.type === KNOWN_SITES.CHANGE_MESSAGE) {
    try {
      const scope = normalizeHistoryScope("scope" in message ? message.scope : undefined);
      const change = normalizeKnownSitesChange("change" in message ? message.change : undefined);
      validateKnownSitesSender(scope, sender);
      void enqueueKnownSitesChange(scope, change).then(
        (sites) => respond({ ok: true, sites }),
        (error: unknown) => respond({ ok: false, error: error instanceof Error ? error.message : "Known Sites write failed" }),
      );
      keepOpen = true;
    } catch (error) {
      respond({ ok: false, error: error instanceof Error ? error.message : "Invalid Known Sites request" });
    }
  }
  return keepOpen;
}

chrome.runtime.onMessage.addListener(handleKnownSitesMessage);