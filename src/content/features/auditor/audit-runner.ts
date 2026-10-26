// @source-path [fobles] src/content/features/auditor/audit-runner.ts
import { buildFoblesUrl } from "../../foundation/sitecore/fobles-url";
import type { WorkSession } from "../../foundation/workers/session/work-session.types";
import type { SitecoreHarvestFiltersState } from "../../foundation/harvesting/sitecore-harvester.types";
import { openFoblesDataSession, type FoblesDataSession } from "../../foundation/reference-data/reference-data-service";
import type { AuditCheckContext } from "./audit-check.types";
import type { AuditFindingStore } from "./audit-finding-store";
import { cacheValidationCheck } from "./checks/cache-validation-check";
import { itemNavigationCheck } from "./checks/item-navigation-check";
import { itemResolvedCheck } from "./checks/item-resolved-check";
import { referenceResolvedCheck } from "./checks/reference-resolved-check";
export type AuditRunnerOptions = { doc: Document; findingStore: AuditFindingStore; workSession: WorkSession; onError?: (error: unknown) => void; };
export type AuditRunner = { run: () => Promise<void>; dispose: () => void; };
export function createAuditRunner({ doc, findingStore, workSession, onError }: AuditRunnerOptions): AuditRunner {
  let dataSession: FoblesDataSession | undefined;
  let unsubscribe: (() => void) | undefined;
  let disposed = false;
  function dispose(): void { if (disposed) return; disposed = true; unsubscribe?.(); dataSession?.dispose(); }
  async function run(): Promise<void> {
    try {
      const completeFilters: SitecoreHarvestFiltersState = { parent: true, children: true, layouts: true, referrers: true, customFields: true, standardFields: true, template: true };
      dataSession = await openFoblesDataSession({ flavor: "reference-model", target: "current-object", doc, workSession, signal: workSession.signal, filters: completeFilters });
      if (disposed || workSession.signal.aborted || !dataSession) return;
      const data = dataSession.data;
      function buildContext(): AuditCheckContext { return { signal: workSession.signal, referenceModelRoot: data.model.referenceModel, referenceModelNodesById: data.model.nodesById, findingStore, processingStateByTreeNodeId: data.model.processingStateByTreeNodeId, resolveCandidateTreeNodeIds: data.resolveCandidateTreeNodeIds, cacheRevalidationResultByTreeNodeId: data.cacheRevalidationResultByTreeNodeId, buildSitecoreUrl: buildFoblesUrl }; }
      async function project(): Promise<void> { await referenceResolvedCheck.run(buildContext()); await cacheValidationCheck.run(buildContext()); }
      await itemResolvedCheck.run(buildContext());
      await itemNavigationCheck.run(buildContext());
      unsubscribe = dataSession.subscribeChange(() => project());
      await project();
      await dataSession.completion;
      if (!disposed && !workSession.signal.aborted) { await project(); await workSession.complete(); }
    } catch (error) { if (!disposed && !workSession.signal.aborted) onError?.(error); }
  }
  return { run, dispose };
}
