import { structuralScopeMatches } from "../../shared/structural/structural-command.ts";
import { getHistory } from "../../shared/item-history/item-history-repository.ts";
import { mutateKnownSites, readKnownSites } from "../../shared/known-sites/known-sites-repository.ts";
import { invalidateStructuralCache } from "../foundation/cache/sitecore-data/structural-cache-invalidation.ts";
import { invalidateStructuralScope, rediscoverStructuralScope } from "../foundation/reference-data/processing/item-kind/structural-discovery.ts";
import { createStructuralCommandHandler } from "./structural-command-handler.ts";
import { maintainStructuralScope } from "./structural-maintenance.ts";
import { resolveStructuralCommandScope } from "./structural-command-scope.ts";

export function registerStructuralCommands(doc: Document, win: Window): () => void {
  const listener = createStructuralCommandHandler({
    currentScope: () => resolveStructuralCommandScope(doc, win),
    execute: (action, scope) => maintainStructuralScope(action, scope, {
      assertScope: (target) => {
        if (!structuralScopeMatches(resolveStructuralCommandScope(doc, win), target)) {
          throw new TypeError("Content Editor scope changed before structural maintenance");
        }
      },
      invalidateCache: (target) => invalidateStructuralCache(target, win.location.origin),
      invalidateScope: invalidateStructuralScope,
      invalidateSites: (target) => mutateKnownSites(target, { action: "invalidate-validation" }),
      readHistory: getHistory,
      readSites: readKnownSites,
      rediscover: rediscoverStructuralScope,
    }),
  });
  chrome.runtime.onMessage.addListener(listener);
  return () => chrome.runtime.onMessage.removeListener(listener);
}