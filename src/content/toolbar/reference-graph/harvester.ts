import { extensionLog } from "../../logger";
import { buildReferenceGraph } from "./build-graph";
import type { ReferenceGraphFiltersState } from "./graph.types";
import type { ReferenceGraphResult } from "./reference-graph.types";

// Left-clicking a graph node re-roots the SAME open modal at that item, with no page navigation
// at all - fetches that item's own content-editor page (same technique resolveRenderingDetails
// already uses) and re-harvests against the fetched document instead of the live one. Raw
// Values/Standard Fields are already confirmed on by the time any node is clickable, so the
// fetched page reflects them too (both are session-level view settings, not per-page).

export async function harvestGraphForLink(link: string, 
  progressDoc: Document,
  referenceGraphAbortController: AbortController | undefined,
  filters: ReferenceGraphFiltersState,
): Promise<ReferenceGraphResult | undefined> {
  const controller = new AbortController();
  referenceGraphAbortController = controller;
  let result: ReferenceGraphResult | undefined = undefined;
  try {
    const response = await fetch(link, { credentials: "same-origin" });
    if (!response.ok) return undefined;
    const fetchedDoc = new DOMParser().parseFromString(await response.text(), "text/html");
    result = await buildReferenceGraph(fetchedDoc, controller.signal, filters, progressDoc,);

  } catch (error) {
    extensionLog.warn("Reference graph: failed to re-harvest for clicked node", { link, error });
  }
  return result;
}
