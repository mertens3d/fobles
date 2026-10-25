// @source-path [fobles] src/content/features/auditor/audit-session.ts
import { showFoblesErrorDialog } from "../../../shared/error-dialog";
import { extensionLog } from "../../logger";
import { createWorkSession } from "../../shell/work-session/work-session";
import type { WorkSession } from "../../shell/work-session/work-session.types";
import { createAuditFindingStore, type AuditFindingStore } from "./audit-finding-store";
import { createAuditRunner, type AuditRunner } from "./audit-runner";
import { createAuditorSessionContainer, removeAuditorSessionContainer } from "./auditor-session-container";
import { openAuditorDialog } from "./components/auditor-dialog";
type AuditSessionState = "created" | "running" | "closing" | "closed";
export class AuditSession {
  private readonly sessionId = crypto.randomUUID();
  private readonly findingStore: AuditFindingStore = createAuditFindingStore();
  private readonly workSession: WorkSession = createWorkSession();
  private readonly runner: AuditRunner;
  private runnerPromise: Promise<void> | undefined;
  private closePromise: Promise<void> | undefined;
  private state: AuditSessionState = "created";
  constructor(private readonly doc: Document) { this.runner = createAuditRunner({ doc: this.doc, findingStore: this.findingStore, workSession: this.workSession, onError: (error) => this.handleRunError(error) }); }
  cancel(): Promise<void> { this.closePromise ??= this.close(); return this.closePromise; }
  async run(): Promise<void> {
    this.state = "running";
    createAuditorSessionContainer(this.doc, this.sessionId);
    extensionLog.debug("Auditor session: started", { sessionId: this.sessionId, workSessionId: this.workSession.id });
    this.runnerPromise = this.runner.run();
    try { await openAuditorDialog(this.doc, this.findingStore, this.workSession.id, () => this.cancel()); }
    finally { await this.cancel(); }
  }
  private handleRunError(error: unknown): void {
    if (this.state === "closed") return;
    extensionLog.error("AUDITOR: audit run failed", { sessionId: this.sessionId, error });
    showFoblesErrorDialog(this.doc, { title: "Fobles Auditor", messagePublicFacing: error instanceof Error ? error.message : "Something has gone wrong while auditing the Reference Model." });
  }
  private async close(): Promise<void> {
    if (this.state === "closed") return;
    this.state = "closing";
    extensionLog.debug("Auditor session: cancellation requested", { sessionId: this.sessionId });
    this.runner.dispose();
    await this.workSession.cancel();
    await this.runnerPromise?.catch((error: unknown) => { extensionLog.debug("Auditor session: cancelled runner settled with error", { sessionId: this.sessionId, error }); });
    this.findingStore.dispose();
    removeAuditorSessionContainer(this.doc, this.sessionId);
    this.state = "closed";
    extensionLog.debug("Auditor session: closed", { sessionId: this.sessionId, workSessionId: this.workSession.id });
  }
}
