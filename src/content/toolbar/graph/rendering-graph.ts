import { STORAGE } from "../../../constants/constants-b";
import { CONST } from "../../../constants/const";
import { extensionLog } from "../../logger";
import { buildFoblesUrl } from "../../features/augmentor/helper";
import { extractGuid, formatFoId } from "../../features/augmentor/shared/guid";
import {
  isRibbonCheckboxEnabled,
  setRibbonCheckboxEnabled,
} from "../../macros/ribbon-toggle-macro";
import { collectTreeChildren } from "../../macros/tree-expand-macro";
import {
  openRenderingGraphModal,
  openRenderingGraphProgressModal,
  closeRenderingGraphProgressModal,
  updateRenderingGraphProgressModal,
} from "./rendering-graph-modal";
import { getCurrentItemId } from "../jump-flyout/ai-pages";
import { getQuickInfo } from "../jump-flyout/quick-info";
import type {
  RenderingGraphChildItem,
  RenderingGraphReferrer,
  ReferenceGraphResult,
} from "./rendering-graph.types";
import type { QuickInfo } from "../types";
import type { PendingRenderingGraph } from "./graph.types";
import { collectSections, harvestGraphForLink } from "./harvester";
import { parseDevice } from "./layout-parsing";
import { EXCLUDED_FIELD_LABEL_PREFIXES } from "./graph.const";

// Shared by the fast path (harvestAndOpen) and the slow, reload-spanning path - Cancel aborts
// whichever one is currently in flight; a stale/already-settled controller is harmless to abort.
export let renderingGraphAbortController: AbortController | undefined = undefined;

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
    extensionLog.warn("Rendering graph: failed to resolve rendering details", { renderingId, error });
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
  return EXCLUDED_FIELD_LABEL_PREFIXES.some((prefix) => normalized.startsWith(prefix));
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

// Items that reference this one - Sitecore's own "Links" gallery (ribbon: Links -> "Items that
// refer to the selected item"), fetched directly instead of clicking through the ribbon. Same
// #Links/.scLink markup the Content Editor's own inline reference-links strategy already parses
// (src/content/features/augmentor/editor-strategies/reference-links.ts) - same extraction here,
// just without that strategy's DOM-mutation (button-building) half, which doesn't apply here.
// Scoped to specifically the "refers to" section's own .scRef sibling - #Links can carry other
// sections too (e.g. items the selected item itself uses), already captured elsewhere.
async function collectReferrers(itemId: string, signal: AbortSignal): Promise<RenderingGraphReferrer[]> {
  try {
    const response = await fetch(buildGalleryLinksUrl(itemId), { credentials: "same-origin", signal });
    if (!response.ok) return [];
    const fetchedDoc = new DOMParser().parseFromString(await response.text(), "text/html");
    const referrerAnchors = Array.from(fetchedDoc.querySelectorAll<HTMLElement>(".scMenuHeader"))
      .filter((header) => header.textContent?.toLowerCase().includes("refer to the selected item"))
      .flatMap((header) =>
        Array.from(header.nextElementSibling?.querySelectorAll<HTMLAnchorElement>("a.scLink") ?? []),
      );

    return referrerAnchors
      .map((anchor) => {
        const referrerId = extractGuid(anchor.getAttribute("onclick"));
        // "Name - [/sitecore/full/path] - The reference from 'Field' field. Language: en, ..."
        const fullLabel = anchor.textContent?.replace(/\s+/g, " ").trim() ?? "";
        const name = fullLabel.split(" - [")[0]?.trim() || undefined;
        const path = fullLabel.match(/ - \[(.*?)\]/)?.[1]?.trim() || undefined;
        if (!referrerId) return undefined;
        return { name, itemId: referrerId, link: buildFoblesUrl(referrerId), path };
      })
      .filter((referrer): referrer is RenderingGraphReferrer => referrer !== undefined);
  } catch (error) {
    extensionLog.warn("Rendering graph: failed to collect referring items", { itemId, error });
    return [];
  }
}

export async function buildReferenceGraph(
  doc: Document,
  signal: AbortSignal,
  progressDoc: Document = doc,
): Promise<ReferenceGraphResult | undefined> {
  const itemId = getCurrentItemId(doc);
  if (!itemId) {
    extensionLog.warn("Rendering graph: could not resolve current item id");
    return undefined;
  }

  const sharedLayoutInput = findFieldInput(doc, "Renderings");
  const finalLayoutInput = findFieldInput(doc, "Final renderings") ?? sharedLayoutInput;
  if (!finalLayoutInput?.value) {
    // Expected for items with no layout defined at all (e.g. folders) - not an error. The item
    // itself is still a valid root; it just won't have a device/layout/control branch under it.
    extensionLog.info(
      "Rendering graph: no Renderings field found for this item (no layout, or View > Standard Fields/Raw Values is off)",
    );
  }

  const quickInfoForDoc = getQuickInfo(doc);
  const templateGuid = getTemplateGuid(doc);
  const sharedDevice = sharedLayoutInput?.value
    ? parseDevice(sharedLayoutInput.value, CONST.SITECORE.DEVICES.DEFAULT)
    : { layoutId: undefined, controls: [] };
  const finalDevice = finalLayoutInput?.value
    ? parseDevice(finalLayoutInput.value, CONST.SITECORE.DEVICES.DEFAULT)
    : { layoutId: undefined, controls: [] };
  const layoutId = finalDevice.layoutId ?? sharedDevice.layoutId;

  // Not a real percentage (no good way to know total work upfront) - just a ticking counter so
  // Cancel/the progress message reads as "genuinely still working", not hung.
  const totalSteps = (layoutId ? 1 : 0) + finalDevice.controls.length + 2;
  let completedSteps = 0;
  const reportProgress = (): void => {
    completedSteps += 1;
    updateRenderingGraphProgressModal(progressDoc, completedSteps, totalSteps);
  };

  const layoutDetailsQuickInfo = layoutId ? await resolveQuickInfoFromItemId(layoutId, signal) : undefined;
  if (layoutId) reportProgress();

  const enrichedControls = await Promise.all(
    finalDevice.controls.map(async (control) => {
      const quickInfo = control.renderingId ? await resolveQuickInfoFromItemId(control.renderingId, signal) : undefined;
      reportProgress();
      return {
        ...control,
        name: quickInfo?.itemName ?? undefined,
        path: quickInfo?.itemPath ?? undefined,
        template: quickInfo?.template ?? undefined,
        link: control.renderingId ? buildFoblesUrl(control.renderingId) : undefined,
        datasourceLink: resolveDatasourceLink(control.datasource, quickInfoForDoc.itemPath),
      };
    }),
  );

  const parentPath = getParentPath(quickInfoForDoc.itemPath);
  const treeChildren = await collectTreeChildren(doc, itemId);
  reportProgress();
  const referrers = await collectReferrers(itemId, signal);
  reportProgress();

  const result: ReferenceGraphResult = {
    itemId,
    itemName: quickInfoForDoc.itemName,
    itemPath: quickInfoForDoc.itemPath,
    itemTemplate: quickInfoForDoc.template,
    itemTemplateLink: templateGuid ? buildFoblesUrl(templateGuid) : undefined,
    itemLink: buildFoblesUrl(itemId),
    parentName: parentPath?.split("/").filter(Boolean).pop() ?? undefined,
    parentLink: parentPath ? buildFoblesUrl(parentPath) : undefined,
    parentPath,
    sharedLayoutName: layoutDetailsQuickInfo?.itemName,
    sharedLayoutLink: layoutId ? buildFoblesUrl(layoutId) : undefined,
    sharedLayoutPath: layoutDetailsQuickInfo?.itemPath,
    controls: enrichedControls,
    sections: collectSections(doc),
    childItems: treeChildren.map(
      (child): RenderingGraphChildItem => (
        {
          name: child.name,
          itemId: child.itemId,
          link: buildFoblesUrl(child.itemId),
          path: undefined,
        }),
    ),
    referrers,
  };

  return result;
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
  const graph = await buildReferenceGraph(doc, controller.signal);
  closeRenderingGraphProgressModal(doc);
  if (controller.signal.aborted || !graph) return;
  openRenderingGraphModal(doc, graph, (link) => harvestGraphForLink(link, doc, renderingGraphAbortController));
}

function readPendingRenderingGraph(): PendingRenderingGraph | undefined {
  try {
    const raw = localStorage.getItem(STORAGE.KEY.RENDERING_GRAPH_PENDING);
    return raw ? (JSON.parse(raw) as PendingRenderingGraph) : undefined;
  } catch {
    return undefined;
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
    if (setRibbonCheckboxEnabled(doc, CONST.SITECORE.RIBBON_CHECKBOXES.STANDARD_FIELDS, true)) return;
    if (setRibbonCheckboxEnabled(doc, CONST.SITECORE.RIBBON_CHECKBOXES.RAW_VALUES, true)) return;

    const controller = new AbortController();
    renderingGraphAbortController = controller;
    void buildReferenceGraph(doc, controller.signal).then((graph) => {
      // Re-read rather than trust the closed-over pending - Cancel may have flagged it while fetches were in flight.
      const latest = readPendingRenderingGraph() ?? pending;
      const harvestedPending: PendingRenderingGraph = {
        ...latest,
        harvested: true,
        graph: latest.cancelled ? undefined : graph,
      };
      writePendingRenderingGraph(harvestedPending);
      advancePendingRenderingGraph(doc, harvestedPending);
    });
    return;
  }

  if (setRibbonCheckboxEnabled(doc, CONST.SITECORE.RIBBON_CHECKBOXES.STANDARD_FIELDS, pending.restoreStandardFields)) {
    return;
  }
  if (setRibbonCheckboxEnabled(doc, CONST.SITECORE.RIBBON_CHECKBOXES.RAW_VALUES, pending.restoreRawValues)) {
    return;
  }

  clearPendingRenderingGraph();
  closeRenderingGraphProgressModal(doc);
  if (pending.graph) openRenderingGraphModal(doc, pending.graph, (link) => harvestGraphForLink(link, doc, undefined));
}

export function openRenderingGraph(doc: Document): void {
  const itemId = getCurrentItemId(doc);
  if (!itemId) {
    extensionLog.warn("Rendering graph: could not resolve current item id");
    return;
  }

  openRenderingGraphProgressModal(doc, () => cancelRenderingGraph(doc));

  const rawValuesOn = isRibbonCheckboxEnabled(doc, CONST.SITECORE.RIBBON_CHECKBOXES.RAW_VALUES) ?? true;
  const standardFieldsOn = isRibbonCheckboxEnabled(doc, CONST.SITECORE.RIBBON_CHECKBOXES.STANDARD_FIELDS) ?? true;

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
    graph: undefined,
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
