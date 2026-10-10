import { STORAGE } from "../../../constants/constants-b";
import { CONST } from "../../../constants/const";
import { extensionLog } from "../../logger";
import { buildFoblesUrl } from "../../features/augmentor/helper";
import { extractGuid, formatFoId } from "../../features/augmentor/shared/guid";
import {
  isRibbonCheckboxEnabled,
  setRibbonCheckboxEnabled,
} from "../../macros/ribbon-toggle-macro";
import { buildReferenceGraph, collectTreeChildren } from "./build-graph";
import {
  openReferenceGraphModal,
} from "./reference-graph-modal";
import { closeReferenceGraphProgressModal, openReferenceGraphProgressModal, updateReferenceGraphProgressModal } from "./build-progress";
import { getCurrentItemId } from "../jump-flyout/ai-pages";
import { getQuickInfo } from "../jump-flyout/quick-info";
import type { QuickInfo } from "../types";
import type { PendingReferenceGraph } from "./graph.types";
import { harvestGraphForLink } from "./harvester";
import { collectSections } from "./build-steps";
import { parseDevice } from "./layout-parsing";
import { REFERENCE_GRAPH } from "../../../constants/graph.const";

// Shared by the fast path (harvestAndOpen) and the slow, reload-spanning path - Cancel aborts
// whichever one is currently in flight; a stale/already-settled controller is harmless to abort.
export let referenceGraphAbortController: AbortController | undefined = undefined;

function findFieldInput(doc: Document, labelPrefix: string): HTMLInputElement | undefined {
  const label = Array.from(
    doc.querySelectorAll<HTMLElement>(CONST.SITECORE.SELECTORS.FIELD_LABEL),
  ).find((element) =>
    element.textContent?.trim().toLowerCase().startsWith(labelPrefix.toLowerCase()),
  );
  return (
    label
      ?.closest(CONST.SITECORE.SELECTORS.FIELD_CELL)
      ?.querySelector<HTMLInputElement>(CONST.SITECORE.SELECTORS.CONTENT_CONTROL) ?? undefined
  );
}


async function resolveQuickInfoFromItemId(
  renderingId: string,
  signal: AbortSignal,
): Promise<QuickInfo | undefined> {
  try {
    const response = await fetch(buildFoblesUrl(renderingId), { credentials: "same-origin", signal });
    if (!response.ok) return undefined;
    const fetchedDoc = new DOMParser().parseFromString(await response.text(), "text/html");

    const quickInfo = getQuickInfo(fetchedDoc);
    return quickInfo;
  } catch (error) {
    extensionLog.warn("Reference graph: failed to resolve rendering details", { renderingId, error });
    return undefined;
  }
}

// "local:" datasource paths are relative to the item the rendering is placed on - everything
// else (a GUID, or an already-absolute /sitecore/... path) can go straight to buildFoblesUrl.
function resolveDatasourceLink(datasource: string | undefined, currentItemPath: string | undefined): string | undefined {
  if (!datasource) return undefined;
  if (!datasource.toLowerCase().startsWith("local:")) return buildFoblesUrl(datasource);
  if (!currentItemPath) return undefined;
  return buildFoblesUrl(`${currentItemPath}${datasource.slice("local:".length)}`);
}

// Quick Info's Template row carries its guid in a differently-classed readonly input
// (scEditorHeaderQuickInfoInputID) than every other row (scEditorHeaderQuickInfoInput) -
// getQuickInfoValue only reads the latter, so the template's guid needs its own lookup.
function getTemplateGuid(doc: Document): string | undefined {
  return doc.querySelector<HTMLInputElement>("input.scEditorHeaderQuickInfoInputID[readonly]")?.value.trim() || undefined;
}

// No fetch needed - buildFoblesUrl accepts a sitecore path just as well as a guid, and the
// parent's path is just the current item's path with its last segment dropped.
function getParentPath(itemPath: string | undefined): string | undefined {
  if (!itemPath) return undefined;
  const segments = itemPath.split("/").filter(Boolean);
  if (segments.length <= 1) return undefined;
  segments.pop();
  return `/${segments.join("/")}`;
}

export function isHandledElsewhere(label: string): boolean {
  const normalized = label.toLowerCase();
  return REFERENCE_GRAPH.EXCLUDED_FIELD_LABEL_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

// The administrator suffix (" [shared]", " [shared, standard value]", ...) is only ever
// relevant in the Content Editor's own chrome - stripped here so it doesn't leak into node
// labels/tooltips the graph builds from this text.
export function extractFieldLabel(marker: HTMLElement): string {
  const labelElement = marker.querySelector<HTMLElement>(CONST.SITECORE.SELECTORS.FIELD_LABEL);
  if (!labelElement) return "";
  const clone = labelElement.cloneNode(true) as HTMLElement;
  clone.querySelector(CONST.SITECORE.SELECTORS.FIELD_LABEL_ADMINISTRATOR)?.remove();
  return clone.textContent?.trim() ?? "";
}

// Raw Values (already forced on for the Layout field above) applies to every field on the page,
// not just Layout - so every other section's fields can be read the exact same way, generically,
// with no per-field-type parsing. Fields that don't render a raw .scContentControl under this
// mode (rare) just come back empty and get filtered out, same as an absent datasource/variant.
// Several raw-value controls (multilist tables, tree-list divs, ...) match .scContentControl
// just as much as a real input/select/textarea does, but don't carry a `.value` at all - reading
// one unconditionally throws. Anything that isn't actually value-bearing is treated the same as
// "no value" (filtered out below), same as a genuinely empty field.
export function readRawFieldValue(marker: HTMLElement): string | undefined {
  const control = marker.querySelector<HTMLElement>(CONST.SITECORE.SELECTORS.CONTENT_CONTROL);
  if (
    !(control instanceof HTMLInputElement) &&
    !(control instanceof HTMLSelectElement) &&
    !(control instanceof HTMLTextAreaElement)
  ) {
    return undefined;
  }
  return control.value.trim() || undefined;
}

function buildGalleryLinksUrl(itemId: string): string {
  const origin = `${window.location.protocol}//${window.location.hostname}`;
  const params = new URLSearchParams({
    [CONST.SITECORE.SEARCH_PARAMS.XML_CONTROL]: "Gallery.Links",
    [CONST.SITECORE.SEARCH_PARAMS.ITEM_ID]: formatFoId(itemId),
    la: "en",
    vs: "1",
    db: "master",
    sc_content: "master",
    ShowEditor: "1",
    "Ribbon.RenderTabs": "true",
  });
  return `${origin}${CONST.SITECORE.RELATIVE_PATHS_ENCODED.SHELL_DEFAULT}?${params.toString()}`;
}



function cancelReferenceGraph(doc: Document): void {
  referenceGraphAbortController?.abort();
  const pending = readPendingReferenceGraph();
  if (pending) writePendingReferenceGraph({ ...pending, cancelled: true });
  closeReferenceGraphProgressModal(doc);
}

async function harvestAndOpen(doc: Document): Promise<void> {
  const controller = new AbortController();
  referenceGraphAbortController = controller;
  const graph = await buildReferenceGraph(doc, controller.signal);
  closeReferenceGraphProgressModal(doc);
  if (controller.signal.aborted || !graph) return;
  openReferenceGraphModal(doc, graph, (link) => harvestGraphForLink(link, doc, referenceGraphAbortController));
}

function readPendingReferenceGraph(): PendingReferenceGraph | undefined {
  try {
    const raw = localStorage.getItem(STORAGE.KEY.REFERENCE_GRAPH.PENDING);
    return raw ? (JSON.parse(raw) as PendingReferenceGraph) : undefined;
  } catch {
    return undefined;
  }
}

function writePendingReferenceGraph(pending: PendingReferenceGraph): void {
  localStorage.setItem(STORAGE.KEY.REFERENCE_GRAPH.PENDING, JSON.stringify(pending));
}

function clearPendingReferenceGraph(): void {
  localStorage.removeItem(STORAGE.KEY.REFERENCE_GRAPH.PENDING);
}

// Drives one step of the enable -> harvest -> restore sequence, each step separated by a full
// page reload (see the file header comment). Re-entrant: called both right after the button
// click and again on every subsequent page load via resumeReferenceGraph, until nothing is left
// to flip. A cancelled request skips straight to restoring the original toggle state - the view
// settings it already flipped shouldn't be left changed just because the user gave up waiting.
function advancePendingReferenceGraph(doc: Document, pending: PendingReferenceGraph): void {
  if (!pending.cancelled && !pending.harvested) {
    if (setRibbonCheckboxEnabled(doc, CONST.SITECORE.RIBBON_CHECKBOXES.STANDARD_FIELDS, true)) return;
    if (setRibbonCheckboxEnabled(doc, CONST.SITECORE.RIBBON_CHECKBOXES.RAW_VALUES, true)) return;

    const controller = new AbortController();
    referenceGraphAbortController = controller;
    void buildReferenceGraph(doc, controller.signal).then((graph) => {
      // Re-read rather than trust the closed-over pending - Cancel may have flagged it while fetches were in flight.
      const latest = readPendingReferenceGraph() ?? pending;
      const harvestedPending: PendingReferenceGraph = {
        ...latest,
        harvested: true,
        graph: latest.cancelled ? undefined : graph,
      };
      writePendingReferenceGraph(harvestedPending);
      advancePendingReferenceGraph(doc, harvestedPending);
    });
    return;
  }

  if (setRibbonCheckboxEnabled(doc, CONST.SITECORE.RIBBON_CHECKBOXES.STANDARD_FIELDS, pending.restoreStandardFields)) {
    return;
  }
  if (setRibbonCheckboxEnabled(doc, CONST.SITECORE.RIBBON_CHECKBOXES.RAW_VALUES, pending.restoreRawValues)) {
    return;
  }

  clearPendingReferenceGraph();
  closeReferenceGraphProgressModal(doc);
  if (pending.graph) openReferenceGraphModal(doc, pending.graph, (link) => harvestGraphForLink(link, doc, undefined));
}

export function openReferenceGraph(doc: Document): void {
  const itemId = getCurrentItemId(doc);
  if (!itemId) {
    extensionLog.warn("Reference graph: could not resolve current item id");
    return;
  }

  openReferenceGraphProgressModal(doc, () => cancelReferenceGraph(doc));

  const rawValuesOn = isRibbonCheckboxEnabled(doc, CONST.SITECORE.RIBBON_CHECKBOXES.RAW_VALUES) ?? true;
  const standardFieldsOn = isRibbonCheckboxEnabled(doc, CONST.SITECORE.RIBBON_CHECKBOXES.STANDARD_FIELDS) ?? true;

  if (rawValuesOn && standardFieldsOn) {
    void harvestAndOpen(doc);
    return;
  }

  const pending: PendingReferenceGraph = {
    itemId,
    restoreRawValues: rawValuesOn,
    restoreStandardFields: standardFieldsOn,
    harvested: false,
    cancelled: false,
    graph: undefined,
  };
  writePendingReferenceGraph(pending);
  advancePendingReferenceGraph(doc, pending);
}

// Hooked into every page load (see src/content/toolbar-runtime.ts) so the enable/restore
// sequence above keeps going across each reload it triggers.
export function resumeReferenceGraph(doc: Document): void {
  const pending = readPendingReferenceGraph();
  if (!pending) return;

  if (getCurrentItemId(doc) !== pending.itemId) {
    clearPendingReferenceGraph();
    return;
  }

  if (!pending.cancelled) openReferenceGraphProgressModal(doc, () => cancelReferenceGraph(doc));
  advancePendingReferenceGraph(doc, pending);
}
