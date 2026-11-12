import type { AuditRunner, AuditRunnerOptions } from "./auditor.types.js";
// @source-path [fobles] src/content/features/auditor/audit-runner.ts
import { openFoblesDataAcquisition } from "../../foundation/reference-data/reference-data-acquisition";
import type { FoblesDataAcquisition } from "../../foundation/reference-data/reference-data.types";
import { buildFoblesUrl } from "../../foundation/sitecore/fobles-url";
import type { AuditCheckContext } from "./auditor.types";
import { cacheValidationCheck } from "./checks/cache-validation-check";
import { itemNavigationCheck } from "./checks/item-navigation-check";
import { itemResolvedCheck } from "./checks/item-resolved-check";
import { referenceResolvedCheck } from "./checks/reference-resolved-check";

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
