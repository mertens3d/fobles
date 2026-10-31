// @source-path [fobles] src/content/features/auditor/auditor-session-container.ts

import { extensionLog } from "../../logger";

export const AUDITOR_SESSION_CONTAINER_ID = "fobles-auditor-session";

export function createAuditorSessionContainer(doc: Document, sessionId: string): HTMLDivElement {
  doc.getElementById(AUDITOR_SESSION_CONTAINER_ID)?.remove();
  const container = doc.createElement("div");
  container.className = "fobles-specialist-session";
  container.id = AUDITOR_SESSION_CONTAINER_ID;
  container.dataset.foblesAuditorSession = sessionId;
  doc.body.appendChild(container);
  extensionLog.debug("Auditor session view: created", { sessionId });
  return container;
}

export function getAuditorSessionContainer(doc: Document): HTMLDivElement | undefined {
  const container = doc.getElementById(AUDITOR_SESSION_CONTAINER_ID);
  return container instanceof HTMLDivElement ? container : undefined;
}

export function requireAuditorSessionContainer(doc: Document): HTMLDivElement {
  const container = getAuditorSessionContainer(doc);
  if (!container) throw new Error("Auditor session view is not active");
  return container;
}

export function removeAuditorSessionContainer(doc: Document, sessionId: string): void {
  const container = getAuditorSessionContainer(doc);
  if (!container || container.dataset.foblesAuditorSession !== sessionId) return;
  container.remove();
  extensionLog.debug("Auditor session view: removed", { sessionId });
}
