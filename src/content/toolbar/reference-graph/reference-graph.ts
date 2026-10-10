// @source-path [fobles] src/content/toolbar/reference-graph/reference-graph.ts

import { STORAGE } from "../../../constants/constants-b";
import { CONST } from "../../../constants/const";
import { extensionLog } from "../../logger";
import { buildFoblesUrl } from "../../features/augmentor/helper";
import { formatFoId } from "../../features/augmentor/shared/guid";
import {
  isRibbonCheckboxEnabled,
  setRibbonCheckboxEnabled,
} from "../../macros/ribbon-toggle-macro";
import { harvestSitecore } from "../../sitecore-harvester/harvest-sitecore";
import {
  openReferenceGraphModal,
} from "./reference-graph-modal";
import { closeReferenceGraphProgressModal, handleHarvestProgress, initializeReferenceGraphProgressModal, openReferenceGraphProgressModal } from "./build-progress";
import { getCurrentItemId } from "../jump-flyout/ai-pages";
import { getQuickInfo } from "../jump-flyout/quick-info";
import type { QuickInfo } from "../types";
import type { PendingReferenceGraph } from "./graph.types";
import { harvestGraphForLink } from "./harvester";
import { getReferenceGraphFilters } from "../../../shared/reference-graph-settings";
import type { HarvestSitecoreInBackgroundTabMessage, SitecoreHarvestProgressMessage } from "../../sitecore-harvester/sitecore-harvester.messages";
import type { SitecoreHarvestFiltersState, SitecoreHarvestResult } from "../../sitecore-harvester/sitecore-harvester.types";
import { HARVEST_STEPS } from "../../sitecore-harvester/harvest-steps";

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
  const itemId = getCurrentItemId(doc);

  if (!itemId) {
    return;
  }
  referenceGraphAbortController = controller;
  const filters = await getReferenceGraphFilters();

  initializeReferenceGraphProgressModal(
    doc,
    HARVEST_STEPS,
    filters,
  );

  console.log("REFERENCE GRAPH: awaiting background harvest");

  const graph = await harvestInBackgroundTab({
    doc,
    url: buildFoblesUrl(itemId),
    filters,
  });

  console.log("REFERENCE GRAPH: background harvest returned", {
    graph,
    isNull: graph === null,
    isUndefined: graph === undefined,
  });

  closeReferenceGraphProgressModal(doc);

  console.log("REFERENCE GRAPH: post-harvest", {
    aborted: controller.signal.aborted,
    hasGraph: Boolean(graph),
  });

  if (controller.signal.aborted || !graph) return;

  console.log("REFERENCE GRAPH: calling openReferenceGraphModal");

  openReferenceGraphModal(doc, graph, async (link, filters) => await harvestGraphForLink(
    link, doc, referenceGraphAbortController, filters));
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
async function advancePendingReferenceGraph(doc: Document, pending: PendingReferenceGraph): Promise<void> {
  if (!pending.cancelled && !pending.harvested) {
    if (setRibbonCheckboxEnabled(doc, CONST.SITECORE.RIBBON_CHECKBOXES.STANDARD_FIELDS, true)) return;
    if (setRibbonCheckboxEnabled(doc, CONST.SITECORE.RIBBON_CHECKBOXES.RAW_VALUES, true)) return;

    const controller = new AbortController();
    referenceGraphAbortController = controller;
    const filters = await getReferenceGraphFilters();
    void harvestSitecore(doc, controller.signal, filters,).then(async (graph) => {
      // Re-read rather than trust the closed-over pending - Cancel may have flagged it while fetches were in flight.
      const latest = readPendingReferenceGraph() ?? pending;
      const harvestedPending: PendingReferenceGraph = {
        ...latest,
        harvested: true,
        graph: latest.cancelled ? undefined : graph,
      };
      writePendingReferenceGraph(harvestedPending);
      await advancePendingReferenceGraph(doc, harvestedPending);
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
  const filters = await getReferenceGraphFilters();
  if (pending.graph) openReferenceGraphModal(doc, pending.graph,
    async (link) => await harvestGraphForLink(link, doc, undefined, filters));
}

export async function openReferenceGraph(doc: Document): Promise<void> {
  const itemId = getCurrentItemId(doc);
  if (!itemId) {
    extensionLog.warn("Reference graph: could not resolve current item id");
    return;
  }

  openReferenceGraphProgressModal(doc, () => cancelReferenceGraph(doc));

  const rawValuesOn = isRibbonCheckboxEnabled(doc, CONST.SITECORE.RIBBON_CHECKBOXES.RAW_VALUES) ?? true;
  const standardFieldsOn = isRibbonCheckboxEnabled(doc, CONST.SITECORE.RIBBON_CHECKBOXES.STANDARD_FIELDS) ?? true;

  if (rawValuesOn && standardFieldsOn) {
    await harvestAndOpen(doc);
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
  await advancePendingReferenceGraph(doc, pending);
}

// Hooked into every page load (see src/content/toolbar-runtime.ts) so the enable/restore
// sequence above keeps going across each reload it triggers.
export async function resumeReferenceGraph(doc: Document): Promise<void> {
  const pending = readPendingReferenceGraph();
  if (!pending) return;

  if (getCurrentItemId(doc) !== pending.itemId) {
    clearPendingReferenceGraph();
    return;
  }

  if (!pending.cancelled) openReferenceGraphProgressModal(doc, () => cancelReferenceGraph(doc));
  await advancePendingReferenceGraph(doc, pending);
}

type ReferenceGraphBackgroundHarvestContext = {
  doc: Document;
  url: string;
  filters: SitecoreHarvestFiltersState;
};

async function harvestInBackgroundTab(
  context: ReferenceGraphBackgroundHarvestContext,
): Promise<SitecoreHarvestResult | undefined> {
  const requestId = crypto.randomUUID();

  const progressListener = (
    message: SitecoreHarvestProgressMessage,
  ): void => {
    if (
      message.type !== "SITECORE_HARVEST_PROGRESS" ||
      message.requestId !== requestId
    ) {
      return;
    }

    handleHarvestProgress(
      context.doc,
      {
        harvestStepKey: message.harvestStepKey,
        label: message.label,
      },
      message.status,
    );
  };

  chrome.runtime.onMessage.addListener(progressListener);

  try {
    const message: HarvestSitecoreInBackgroundTabMessage = {
      type: "HARVEST_SITECORE_IN_BACKGROUND_TAB",
      requestId,
      url: context.url,
      filters: context.filters,
    };

    return await chrome.runtime.sendMessage(message);
  } finally {
    chrome.runtime.onMessage.removeListener(progressListener);
  }
}