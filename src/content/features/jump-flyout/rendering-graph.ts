import { STORAGE } from "../../../constants/constants-b";
import { SITECORE } from "../../../constants/sitecore";
import { extensionLog } from "../../logger";
import { buildFoblesUrl } from "../augmentor/helper";
import { stripGuidBraces } from "../augmentor/shared/guid";
import {
  isRibbonCheckboxEnabled,
  setRibbonCheckboxEnabled,
} from "../../macros/ribbon-toggle-macro";
import { collectTreeChildren } from "../../macros/tree-expand-macro";
import { openRenderingGraphModal, openRenderingGraphProgressModal, closeRenderingGraphProgressModal } from "./rendering-graph-modal";
import { getCurrentItemId, getQuickInfoValue } from "./ai-pages";
import type {
  RenderingGraphChildItem,
  RenderingGraphControl,
  RenderingGraphField,
  RenderingGraphResult,
  RenderingGraphSection,
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

// No fetch needed - buildFoblesUrl accepts a sitecore path just as well as a guid, and the
// parent's path is just the current item's path with its last segment dropped.
function getParentPath(itemPath: string | null): string | null {
  if (!itemPath) return null;
  const segments = itemPath.split("/").filter(Boolean);
  if (segments.length <= 1) return null;
  segments.pop();
  return `/${segments.join("/")}`;
}

// Sections/fields already represented elsewhere in the graph, or not useful for this POC's
// purposes (Statistics/Security/Appearance are noisy system bookkeeping, not content-shape data).
// Quick Info is also a differently-shaped table (see getQuickInfoValue), not a field-marker
// section; Renderings/Final renderings get their own rich subtree (parseDevice) instead of a
// flat raw-value leaf.
const EXCLUDED_SECTION_NAMES = new Set(["appearance", "quick info", "security", "statistics"]);
const EXCLUDED_FIELD_LABEL_PREFIXES = ["final renderings", "renderings"];

function isHandledElsewhere(label: string): boolean {
  const normalized = label.toLowerCase();
  return EXCLUDED_FIELD_LABEL_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

// Raw Values (already forced on for the Layout field above) applies to every field on the page,
// not just Layout - so every other section's fields can be read the exact same way, generically,
// with no per-field-type parsing. Fields that don't render a raw .scContentControl under this
// mode (rare) just come back empty and get filtered out, same as an absent datasource/variant.
function collectSections(doc: Document): RenderingGraphSection[] {
  const sections: RenderingGraphSection[] = [];

  doc.querySelectorAll<HTMLElement>(SITECORE.SELECTORS.SECTION_CAPTION).forEach((caption) => {
    const name = caption.textContent?.trim() ?? "";
    if (!name || EXCLUDED_SECTION_NAMES.has(name.toLowerCase())) return;

    const panelId =
      caption.querySelector("img[aria-controls]")?.getAttribute("aria-controls") ?? `${caption.id}_controls`;
    const panel = doc.getElementById(panelId);
    if (!panel) return;

    const fields: RenderingGraphField[] = [];
    panel.querySelectorAll<HTMLElement>(SITECORE.SELECTORS.EDITOR_FIELD_MARKER).forEach((marker) => {
      const label = marker.querySelector<HTMLElement>(SITECORE.SELECTORS.FIELD_LABEL)?.textContent?.trim() ?? "";
      if (!label || isHandledElsewhere(label)) return;
      const value = marker.querySelector<HTMLInputElement>(SITECORE.SELECTORS.CONTENT_CONTROL)?.value.trim() || null;
      if (!value) return;
      fields.push({ label, value });
    });

    if (fields.length > 0) sections.push({ name, fields });
  });

  return sections;
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
    // Expected for items with no layout defined at all (e.g. folders) - not an error. The item
    // itself is still a valid root; it just won't have a device/layout/control branch under it.
    extensionLog.info(
      "Rendering graph: no Renderings field found for this item (no layout, or View > Standard Fields/Raw Values is off)",
    );
  }

  const currentItemPath = getQuickInfoValue(doc, "Item path:");
  const templateGuid = getTemplateGuid(doc);
  const sharedDevice = sharedLayoutInput?.value
    ? parseDevice(sharedLayoutInput.value, SITECORE.DEVICES.DEFAULT)
    : { layoutId: null, controls: [] };
  const finalDevice = finalLayoutInput?.value
    ? parseDevice(finalLayoutInput.value, SITECORE.DEVICES.DEFAULT)
    : { layoutId: null, controls: [] };
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

  const parentPath = getParentPath(currentItemPath);
  const treeChildren = await collectTreeChildren(doc, itemId);

  return {
    itemId,
    itemName: currentItemPath?.split("/").filter(Boolean).pop() ?? null,
    itemPath: currentItemPath,
    itemTemplate: getQuickInfoValue(doc, "Template:"),
    itemTemplateLink: templateGuid ? buildFoblesUrl(templateGuid) : null,
    itemLink: buildFoblesUrl(itemId),
    parentName: parentPath?.split("/").filter(Boolean).pop() ?? null,
    parentLink: parentPath ? buildFoblesUrl(parentPath) : null,
    sharedLayoutName: layoutDetails?.name ?? null,
    sharedLayoutLink: layoutId ? buildFoblesUrl(layoutId) : null,
    controls: enrichedControls,
    sections: collectSections(doc),
    childItems: treeChildren.map(
      (child): RenderingGraphChildItem => ({ name: child.name, itemId: child.itemId, link: buildFoblesUrl(child.itemId) }),
    ),
  };
}

function cancelRenderingGraph(doc: Document): void {
  renderingGraphAbortController?.abort();
  const pending = readPendingRenderingGraph();
  if (pending) writePendingRenderingGraph({ ...pending, cancelled: true });
  closeRenderingGraphProgressModal(doc);
}

// Left-clicking a graph node re-roots the SAME open modal at that item, with no page navigation
// at all - fetches that item's own content-editor page (same technique resolveRenderingDetails
// already uses) and re-harvests against the fetched document instead of the live one. Raw
// Values/Standard Fields are already confirmed on by the time any node is clickable, so the
// fetched page reflects them too (both are session-level view settings, not per-page).
async function harvestGraphForLink(link: string): Promise<RenderingGraphResult | null> {
  const controller = new AbortController();
  renderingGraphAbortController = controller;
  try {
    const response = await fetch(link, { credentials: "same-origin" });
    if (!response.ok) return null;
    const fetchedDoc = new DOMParser().parseFromString(await response.text(), "text/html");
    return await buildRenderingGraph(fetchedDoc, controller.signal);
  } catch (error) {
    extensionLog.warn("Rendering graph: failed to re-harvest for clicked node", { link, error });
    return null;
  }
}

async function harvestAndOpen(doc: Document): Promise<void> {
  const controller = new AbortController();
  renderingGraphAbortController = controller;
  const graph = await buildRenderingGraph(doc, controller.signal);
  closeRenderingGraphProgressModal(doc);
  if (controller.signal.aborted || !graph) return;
  openRenderingGraphModal(doc, graph, harvestGraphForLink);
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
  if (pending.graph) openRenderingGraphModal(doc, pending.graph, harvestGraphForLink);
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
