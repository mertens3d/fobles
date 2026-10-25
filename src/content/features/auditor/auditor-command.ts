// @source-path [fobles] src/content/features/auditor/auditor-command.ts

import { showFoblesErrorDialog } from "../../../shared/error-dialog";
import { AuditSession } from "./audit-session";
import { acquireAuditorSessionLock, releaseAuditorSessionLock } from "./auditor-session-lock";

let activeAuditSession: AuditSession | undefined;

// The toolbar-invokable entry point for the Fobles Auditor - mirrors openReferenceGraph's own
// singleton + cross-tab lock pattern so the two features can never collide over one tab's worker
// pool, but uses its own lock/session identity rather than sharing Reference Graph's.
export async function openAuditor(doc: Document): Promise<void> {
  if (activeAuditSession) return;

  const acquired = await acquireAuditorSessionLock();
  if (!acquired) {
    showFoblesErrorDialog(doc, {
      title: "Auditor Already Active",
      messagePublicFacing: "Only one Fobles Auditor can be active in this browser session. Close the existing Auditor, or use another browser profile or Incognito window.",
    });
    return;
  }

  const session = new AuditSession(doc);
  activeAuditSession = session;

  try {
    await session.run();
  } finally {
    if (activeAuditSession === session) activeAuditSession = undefined;
    await releaseAuditorSessionLock();
  }
}
