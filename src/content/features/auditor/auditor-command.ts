// @source-path [fobles] src/content/features/auditor/auditor-command.ts

import { AuditOperation } from "./audit-operation";
import { openAuditorUtility } from "../../shell/utility/fobles-utility-launchers";

let activeAuditOperation: AuditOperation | undefined;

export async function openAuditor(doc: Document): Promise<void> {
  if (activeAuditOperation) {
    return;
  }
  const operation = new AuditOperation(doc);
  activeAuditOperation = operation;
  try {
    await operation.run();
    await openAuditorUtility(doc, operation.findings, operation.workOperationId, () => operation.cancel());
  } finally {
    if (activeAuditOperation === operation) {
      activeAuditOperation = undefined;
    }
    await operation.cancel();
  }
}
