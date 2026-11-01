// @source-path [fobles] src/content/features/auditor/auditor-command.ts
import { AuditOperation } from "./audit-operation";
import { openAuditorToolWindow } from "../../shell/tool-window/fobles-tool-launchers";

let activeAuditOperation: AuditOperation | undefined;

export async function openAuditor(doc: Document): Promise<void> {
  if (activeAuditOperation) return;
  const operation = new AuditOperation(doc);
  activeAuditOperation = operation;
  try {
    await operation.run();
    await openAuditorToolWindow(doc, operation.findings, operation.workOperationId, () => operation.cancel());
  } finally {
    if (activeAuditOperation === operation) activeAuditOperation = undefined;
    await operation.cancel();
  }
}
