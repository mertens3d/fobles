// @source-path [fobles] src/content/features/auditor/audit-operation.ts
import { showFoblesErrorDialog } from "../../../shared/error-dialog";
import { getReferenceGraphFilters } from "../../../shared/reference-graph-settings";
import { createWorkOperation } from "../../shell/work-operation/work-operation";
import { extensionLog } from "../../logger";
import type { WorkOperation } from "../../foundation/workers/operation/work-operation.types";
import { createAuditFindingStore, type AuditFindingStore } from "./audit-finding-store";
import { createAuditRunner, type AuditRunner } from "./audit-runner";
import { getAuditorGraphFilters } from "./auditor-ui-settings";

type AuditOperationState = "created" | "running" | "closing" | "closed";

export class AuditOperation {
  private readonly operationId = crypto.randomUUID();
  private readonly findingStore: AuditFindingStore = createAuditFindingStore();
  private readonly workOperation: WorkOperation = createWorkOperation();
  private runner: AuditRunner | undefined;
  private runnerPromise: Promise<void> | undefined;
  private closePromise: Promise<void> | undefined;
  private state: AuditOperationState = "created";

  constructor(private readonly doc: Document) {}

  get findings(): AuditFindingStore {
    return this.findingStore;
  }

  get workOperationId(): string {
    return this.workOperation.id;
  }

  cancel(): Promise<void> {
    this.closePromise ??= this.close();
    return this.closePromise;
  }

  async run(): Promise<void> {
    this.state = "running";
    const [referenceGraphFilters, auditorGraphFilters] = await Promise.all([
      getReferenceGraphFilters(),
      getAuditorGraphFilters(),
    ]);
    const filters = { ...referenceGraphFilters, ...auditorGraphFilters };
    this.runner = createAuditRunner({
      doc: this.doc,
      findingStore: this.findingStore,
      workOperation: this.workOperation,
      filters,
      onError: (error) => this.handleRunError(error),
    });
    extensionLog.debug("Auditor operation: started", {
      operationId: this.operationId,
      workOperationId: this.workOperation.id,
      filters,
    });
    this.runnerPromise = this.runner.run();
  }

  private handleRunError(error: unknown): void {
    if (this.state === "closed") {
      return;
    }
    extensionLog.error("AUDITOR: audit run failed", { operationId: this.operationId, error });
    showFoblesErrorDialog(this.doc, {
      title: "Fobles Auditor",
      messagePublicFacing:
        error instanceof Error ? error.message : "Something has gone wrong while auditing the Reference Model.",
    });
  }

  private async close(): Promise<void> {
    if (this.state === "closed") {
      return;
    }
    this.state = "closing";
    extensionLog.debug("Auditor operation: cancellation requested", { operationId: this.operationId });
    this.runner?.dispose();
    await this.workOperation.cancel();
    await this.runnerPromise?.catch((error: unknown) => {
      extensionLog.debug("Auditor operation: cancelled runner settled with error", {
        operationId: this.operationId,
        error,
      });
    });
    this.findingStore.dispose();
    this.state = "closed";
    extensionLog.debug("Auditor operation: closed", {
      operationId: this.operationId,
      workOperationId: this.workOperation.id,
    });
  }
}
