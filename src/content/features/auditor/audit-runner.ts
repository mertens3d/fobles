// @source-path [fobles] src/content/features/auditor/audit-runner.ts
import type { SitecoreHarvestFiltersState } from "../../foundation/harvesting/sitecore-harvester.types";
import {
  openFoblesDataAcquisition,
  type FoblesDataAcquisition,
} from "../../foundation/reference-data/reference-data-acquisition";
import { buildFoblesUrl } from "../../foundation/sitecore/fobles-url";
import type { WorkOperation } from "../../foundation/workers/operation/work-operation.types";
import type { AuditCheckContext } from "./audit-check.types";
import type { AuditFindingStore } from "./audit-finding-store";
import { cacheValidationCheck } from "./checks/cache-validation-check";
import { itemNavigationCheck } from "./checks/item-navigation-check";
import { itemResolvedCheck } from "./checks/item-resolved-check";
import { referenceResolvedCheck } from "./checks/reference-resolved-check";

export type AuditRunnerOptions = {
  doc: Document;
  findingStore: AuditFindingStore;
  workOperation: WorkOperation;
  filters: SitecoreHarvestFiltersState;
  onError?: (error: unknown) => void;
};

export type AuditRunner = { run: () => Promise<void>; dispose: () => void };

export function createAuditRunner({
  doc,
  findingStore,
  workOperation,
  filters,
  onError,
}: AuditRunnerOptions): AuditRunner {
  let dataAcquisition: FoblesDataAcquisition | undefined;
  let unsubscribe: (() => void) | undefined;
  let disposed = false;

  function dispose(): void {
    if (disposed) {
      return;
    }
    disposed = true;
    unsubscribe?.();
    dataAcquisition?.dispose();
  }

  async function run(): Promise<void> {
    try {
      dataAcquisition = await openFoblesDataAcquisition({
        flavor: "reference-model",
        target: "current-object",
        doc,
        workOperation,
        signal: workOperation.signal,
        filters,
      });
      if (disposed || workOperation.signal.aborted || !dataAcquisition) {
        return;
      }
      const data = dataAcquisition.data;

      function buildContext(): AuditCheckContext {
        return {
          signal: workOperation.signal,
          referenceModelRoot: data.model.referenceModel,
          referenceModelNodesById: data.model.nodesById,
          findingStore,
          processingStateByTreeNodeId: data.model.processingStateByTreeNodeId,
          resolveCandidateTreeNodeIds: data.resolveCandidateTreeNodeIds,
          cacheRevalidationResultByTreeNodeId: data.cacheRevalidationResultByTreeNodeId,
          buildSitecoreUrl: buildFoblesUrl,
        };
      }

      async function project(): Promise<void> {
        await referenceResolvedCheck.run(buildContext());
        await cacheValidationCheck.run(buildContext());
      }

      await itemResolvedCheck.run(buildContext());
      await itemNavigationCheck.run(buildContext());
      unsubscribe = dataAcquisition.subscribeChange(() => project());
      await project();
      await dataAcquisition.completion;
      if (!disposed && !workOperation.signal.aborted) {
        await project();
        await workOperation.complete();
      }
    } catch (error) {
      if (!disposed && !workOperation.signal.aborted) {
        onError?.(error);
      }
    }
  }

  return { run, dispose };
}
