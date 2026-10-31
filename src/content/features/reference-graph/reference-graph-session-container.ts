// @source-path [fobles] src/content/features/reference-graph/reference-graph-session-container.ts

import { extensionLog } from "../../logger";

export const REFERENCE_GRAPH_SESSION_CONTAINER_ID = "fobles-reference-graph-session";

export function createReferenceGraphSessionContainer(doc: Document, sessionId: string): HTMLDivElement {
  doc.getElementById(REFERENCE_GRAPH_SESSION_CONTAINER_ID)?.remove();
  const container = doc.createElement("div");
  container.className = "fobles-specialist-session";
  container.id = REFERENCE_GRAPH_SESSION_CONTAINER_ID;
  container.dataset.foblesReferenceGraphSession = sessionId;
  doc.body.appendChild(container);
  extensionLog.debug("Reference graph session view: created", { sessionId });
  return container;
}

export function getReferenceGraphSessionContainer(doc: Document): HTMLDivElement | undefined {
  const container = doc.getElementById(REFERENCE_GRAPH_SESSION_CONTAINER_ID);
  return container instanceof HTMLDivElement ? container : undefined;
}

export function requireReferenceGraphSessionContainer(doc: Document): HTMLDivElement {
  const container = getReferenceGraphSessionContainer(doc);
  if (!container) throw new Error("Reference Graph session view is not active");
  return container;
}

export function removeReferenceGraphSessionContainer(doc: Document, sessionId: string): void {
  const container = getReferenceGraphSessionContainer(doc);
  if (!container || container.dataset.foblesReferenceGraphSession !== sessionId) return;
  container.remove();
  extensionLog.debug("Reference graph session view: removed", { sessionId });
}
