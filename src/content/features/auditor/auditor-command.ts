// @source-path [fobles] src/content/features/auditor/auditor-command.ts
import { AuditOperation } from "./audit-operation";
import { openAuditorUtility } from "../../shell/utility/fobles-utility-launchers";
import { runWithFoblesUtilityLock } from "../../shell/utility/fobles-utility";

let activeAuditOperation: AuditOperation | undefined;

export async function openAuditor(doc: Document): Promise<void> {
  if (activeAuditOperation) return;
  await runWithFoblesUtilityLock(doc, async () => {
    const operation = new AuditOperation(doc);
    activeAuditOperation = operation;
    try {
      await operation.run();
      await openAuditorUtility(doc, operation.findings, operation.workOperationId, () => operation.cancel(), true);
    } finally {
      if (activeAuditOperation === operation) activeAuditOperation = undefined;
      await operation.cancel();
    }
  });
}
