import { STORAGE } from "../../../constants/constants-b";
import { SITECORE } from "../../../constants/sitecore";
import { extensionLog } from "../../logger";
import { buildFoblesUrl } from "../augmentor/helper";
import { stripGuidBraces } from "../augmentor/shared/guid";
import {
  isRibbonCheckboxEnabled,
  setRibbonCheckboxEnabled,
} from "../../macros/ribbon-toggle-macro";
import { openRenderingGraphModal, openRenderingGraphProgressModal, closeRenderingGraphProgressModal } from "./rendering-graph-modal";
import { getCurrentItemId, getQuickInfoValue } from "./ai-pages";
import type {
  RenderingGraphControl,
  RenderingGraphResult,
} from "./rendering-graph.types";

// POC: harvests the active item's default-device layout straight from the Content Editor's own
// Layout section, instead of navigating LayoutDetails/DeviceEditor/SelectRendering/Field Editor -
// requires View > Standard Fields and View > Raw Values both enabled so the raw layout XML field
// is actually on the page. See src/rendering graph/README.md for the research behind this. Both
// toggles are enabled/restored automatically (see the resume machine at the bottom of this file)
// since flipping either one is a full page postback that destroys this execution context. The
// harvested graph rides along in the same persisted pending state, since the restore step's own
// reload would otherwise wipe it before the modal can be shown.

type PendingRenderingGraph = {
  itemId: string;
  restoreRawValues: boolean;
  restoreStandardFields: boolean;
  harvested: boolean;
  cancelled: boolean;
  graph: RenderingGraphResult | null;
};

// Shared by the fast path (harvestAndOpen) and the slow, reload-spanning path - Cancel aborts
// whichever one is currently in flight; a stale/already-settled controller is harmless to abort.
let renderingGraphAbortController: AbortController | null = null;

function findFieldInput(doc: Document, labelPrefix: string): HTMLInputElement | null {
  const label = Array.from(
    doc.querySelectorAll<HTMLElement>(SITECORE.SELECTORS.FIELD_LABEL),
  ).find((element) =>
    element.textContent?.trim().toLowerCase().startsWith(labelPrefix.toLowerCase()),
  );
  return (
    label
      ?.closest(SITECORE.SELECTORS.FIELD_CELL)
      ?.querySelector<HTMLInputElement>(SITECORE.SELECTORS.CONTENT_CONTROL) ?? null
  );
}

function parseParameters(raw: string | null): Record<string, string> {
  if (!raw) return {};
  const parameters: Record<string, string> = {};
  raw.split("&").filter(Boolean).forEach((pair) => {
    const separatorIndex = pair.indexOf("=");
    const key = separatorIndex === -1 ? pair : pair.slice(0, separatorIndex);
    const value = separatorIndex === -1 ? "" : decodeURIComponent(pair.slice(separatorIndex + 1));
    parameters[key] = value;
  });
  return parameters;
}

type ParsedDevice = {
  layoutId: string | null;
  controls: RenderingGraphControl[];
};

function parseDevice(xml: string, deviceId: string): ParsedDevice {
  const parsed = new DOMParser().parseFromString(xml, "application/xml");
  const device = Array.from(parsed.getElementsByTagName("d")).find(
    (candidate) => stripGuidBraces(candidate.getAttribute("id")) === stripGuidBraces(deviceId),
  );
  if (!device) return { layoutId: null, controls: [] };

  return {
    layoutId: device.getAttribute("l"),
    controls: Array.from(device.getElementsByTagName("r")).map((control) => ({
      renderingId: control.getAttribute("s:id") ?? "",
      name: null,
      path: null,
      template: null,
      datasource: control.getAttribute("s:ds"),
      datasourceLink: null,
      placeholder: control.getAttribute("s:ph") || null,
      uid: control.getAttribute("uid"),
      link: null,
      parameters: parseParameters(control.getAttribute("s:par")),
    })),
  };
}

async function resolveRenderingDetails(
  renderingId: string,
  signal: AbortSignal,
): Promise<{ name: string | null; path: string | null; template: string | null } | null> {
  try {
    const response = await fetch(buildFoblesUrl(renderingId), { credentials: "same-origin", signal });
    if (!response.ok) return null;
    const fetchedDoc = new DOMParser().parseFromString(await response.text(), "text/html");
    const path = getQuickInfoValue(fetchedDoc, "Item path:");
    return {
      name: path?.split("/").filter(Boolean).pop() ?? null,
      path,
      template: getQuickInfoValue(fetchedDoc, "Template:"),
    };
  } catch (error) {
    extensionLog.warn("Rendering graph: failed to resolve rendering details", { renderingId, error });
    return null;
  }
}

// "local:" datasource paths are relative to the item the rendering is placed on - everything
// else (a GUID, or an already-absolute /sitecore/... path) can go straight to buildFoblesUrl.
function resolveDatasourceLink(datasource: string | null, currentItemPath: string | null): string | null {
  if (!datasource) return null;
  if (!datasource.toLowerCase().startsWith("local:")) return buildFoblesUrl(datasource);
  if (!currentItemPath) return null;
  return buildFoblesUrl(`${currentItemPath}${datasource.slice("local:".length)}`);
}

// Quick Info's Template row carries its guid in a differently-classed readonly input
// (scEditorHeaderQuickInfoInputID) than every other row (scEditorHeaderQuickInfoInput) -
// getQuickInfoValue only reads the latter, so the template's guid needs its own lookup.
function getTemplateGuid(doc: Document): string | null {
  return doc.querySelector<HTMLInputElement>("input.scEditorHeaderQuickInfoInputID[readonly]")?.value.trim() || null;
}

export async function buildRenderingGraph(
  doc: Document,
  signal: AbortSignal,
): Promise<RenderingGraphResult | null> {
  const itemId = getCurrentItemId(doc);
  if (!itemId) {
    extensionLog.warn("Rendering graph: could not resolve current item id");
    return null;
  }

  const sharedLayoutInput = findFieldInput(doc, "Renderings");
  const finalLayoutInput = findFieldInput(doc, "Final renderings") ?? sharedLayoutInput;
  if (!finalLayoutInput?.value) {
    // Expected for items with no layout defined at all (e.g. folders) - not an error, just no graph to show.
    extensionLog.info(
      "Rendering graph: no Renderings field found for this item (no layout, or View > Standard Fields/Raw Values is off)",
    );
    return null;
  }

  const currentItemPath = getQuickInfoValue(doc, "Item path:");
  const templateGuid = getTemplateGuid(doc);
  const sharedDevice = sharedLayoutInput?.value
    ? parseDevice(sharedLayoutInput.value, SITECORE.DEVICES.DEFAULT)
    : { layoutId: null, controls: [] };
  const finalDevice = parseDevice(finalLayoutInput.value, SITECORE.DEVICES.DEFAULT);
  const layoutId = finalDevice.layoutId ?? sharedDevice.layoutId;
  const layoutDetails = layoutId ? await resolveRenderingDetails(layoutId, signal) : null;

  const enrichedControls = await Promise.all(
    finalDevice.controls.map(async (control) => {
      const details = control.renderingId ? await resolveRenderingDetails(control.renderingId, signal) : null;
      return {
        ...control,
        name: details?.name ?? null,
        path: details?.path ?? null,
        template: details?.template ?? null,
        link: control.renderingId ? buildFoblesUrl(control.renderingId) : null,
        datasourceLink: resolveDatasourceLink(control.datasource, currentItemPath),
      };
    }),
  );

  return {
    itemId,
    itemName: currentItemPath?.split("/").filter(Boolean).pop() ?? null,
    itemPath: currentItemPath,
    itemTemplate: getQuickInfoValue(doc, "Template:"),
    itemTemplateLink: templateGuid ? buildFoblesUrl(templateGuid) : null,
    itemLink: buildFoblesUrl(itemId),
    sharedLayoutName: layoutDetails?.name ?? null,
    sharedLayoutLink: layoutId ? buildFoblesUrl(layoutId) : null,
    controls: enrichedControls,
  };
}

function cancelRenderingGraph(doc: Document): void {
  renderingGraphAbortController?.abort();
  const pending = readPendingRenderingGraph();
  if (pending) writePendingRenderingGraph({ ...pending, cancelled: true });
  closeRenderingGraphProgressModal(doc);
}

async function harvestAndOpen(doc: Document): Promise<void> {
  const controller = new AbortController();
  renderingGraphAbortController = controller;
  const graph = await buildRenderingGraph(doc, controller.signal);
  closeRenderingGraphProgressModal(doc);
  if (controller.signal.aborted || !graph) return;
  openRenderingGraphModal(doc, graph);
}

function readPendingRenderingGraph(): PendingRenderingGraph | null {
  try {
    const raw = localStorage.getItem(STORAGE.KEY.RENDERING_GRAPH_PENDING);
    return raw ? (JSON.parse(raw) as PendingRenderingGraph) : null;
  } catch {
    return null;
  }
}

function writePendingRenderingGraph(pending: PendingRenderingGraph): void {
  localStorage.setItem(STORAGE.KEY.RENDERING_GRAPH_PENDING, JSON.stringify(pending));
}

function clearPendingRenderingGraph(): void {
  localStorage.removeItem(STORAGE.KEY.RENDERING_GRAPH_PENDING);
}

// Drives one step of the enable -> harvest -> restore sequence, each step separated by a full
// page reload (see the file header comment). Re-entrant: called both right after the button
// click and again on every subsequent page load via resumeRenderingGraph, until nothing is left
// to flip. A cancelled request skips straight to restoring the original toggle state - the view
// settings it already flipped shouldn't be left changed just because the user gave up waiting.
function advancePendingRenderingGraph(doc: Document, pending: PendingRenderingGraph): void {
  if (!pending.cancelled && !pending.harvested) {
    if (setRibbonCheckboxEnabled(doc, SITECORE.RIBBON_CHECKBOXES.STANDARD_FIELDS, true)) return;
    if (setRibbonCheckboxEnabled(doc, SITECORE.RIBBON_CHECKBOXES.RAW_VALUES, true)) return;

    const controller = new AbortController();
    renderingGraphAbortController = controller;
    void buildRenderingGraph(doc, controller.signal).then((graph) => {
      // Re-read rather than trust the closed-over pending - Cancel may have flagged it while fetches were in flight.
      const latest = readPendingRenderingGraph() ?? pending;
      const harvestedPending: PendingRenderingGraph = {
        ...latest,
        harvested: true,
        graph: latest.cancelled ? null : graph,
      };
      writePendingRenderingGraph(harvestedPending);
      advancePendingRenderingGraph(doc, harvestedPending);
    });
    return;
  }

  if (setRibbonCheckboxEnabled(doc, SITECORE.RIBBON_CHECKBOXES.STANDARD_FIELDS, pending.restoreStandardFields)) {
    return;
  }
  if (setRibbonCheckboxEnabled(doc, SITECORE.RIBBON_CHECKBOXES.RAW_VALUES, pending.restoreRawValues)) {
    return;
  }

  clearPendingRenderingGraph();
  closeRenderingGraphProgressModal(doc);
  if (pending.graph) openRenderingGraphModal(doc, pending.graph);
}

export function openRenderingGraph(doc: Document): void {
  const itemId = getCurrentItemId(doc);
  if (!itemId) {
    extensionLog.warn("Rendering graph: could not resolve current item id");
    return;
  }

  openRenderingGraphProgressModal(doc, () => cancelRenderingGraph(doc));

  const rawValuesOn = isRibbonCheckboxEnabled(doc, SITECORE.RIBBON_CHECKBOXES.RAW_VALUES) ?? true;
  const standardFieldsOn = isRibbonCheckboxEnabled(doc, SITECORE.RIBBON_CHECKBOXES.STANDARD_FIELDS) ?? true;

  if (rawValuesOn && standardFieldsOn) {
    void harvestAndOpen(doc);
    return;
  }

  const pending: PendingRenderingGraph = {
    itemId,
    restoreRawValues: rawValuesOn,
    restoreStandardFields: standardFieldsOn,
    harvested: false,
    cancelled: false,
    graph: null,
  };
  writePendingRenderingGraph(pending);
  advancePendingRenderingGraph(doc, pending);
}

// Hooked into every page load (see src/content/toolbar-runtime.ts) so the enable/restore
// sequence above keeps going across each reload it triggers.
export function resumeRenderingGraph(doc: Document): void {
  const pending = readPendingRenderingGraph();
  if (!pending) return;

  if (getCurrentItemId(doc) !== pending.itemId) {
    clearPendingRenderingGraph();
    return;
  }

  if (!pending.cancelled) openRenderingGraphProgressModal(doc, () => cancelRenderingGraph(doc));
  advancePendingRenderingGraph(doc, pending);
}
