// @source-path [fobles] src/content/foundation/reference-data/model/layout-reference-model-builder.ts

import { CONST } from "../../../../constants/const";
import { GRAPH_COLLAPSE_KEY } from "./model.const.ts";
import { createReferenceModelItemNode, createReferenceModelNonItemNode } from "./reference-model-node-factory.ts";
import { createSitecoreItemProvenance, createSyntheticProvenance } from "./reference-model-provenance.ts";
import type { ReferenceModelNode } from "./model.types.ts";
import type { ReferenceModelNonItemNode } from "./model.types.ts";
import type { ReferenceModelItemNode } from "./model.types.ts";
import { createRenderingReferenceModelNode } from "./rendering-reference-model-builder.ts";
import { slugify } from "./slugify.ts";
import type { LayoutDevice } from "./model.types.ts";
import type { LayoutPlacement } from "./model.types.ts";
import type { LayoutSectionField } from "./model.types.ts";
import type { ItemGraphNodeData } from "./model.types.ts";
import type { ScControl } from "./model.types.ts";

const LAYOUT_DELTA_ROOT_PATTERN = /^\s*<r\b[^>]*\bp:p\s*=\s*["']1["']/i;
const NUMBERED_DYNAMIC_PLACEHOLDER_PATTERN = /-(\d+)$/;
const UID_DYNAMIC_PLACEHOLDER_PATTERN = /-(\{[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\})-\d+$/i;

export function createReferenceModelNodeId(...parts: Array<string | undefined>): string {
  return parts
    .filter((part): part is string => Boolean(part))
    .map(slugify)
    .join("-");
}

// Agent: Layout data comes from Sitecore markup and from cached copies written by older builds, so nothing in it is
// Agent: assumed complete or well formed: lists may be missing, strings may be absent, controls may lack raw data.
function listOf<T>(value: readonly T[] | null | undefined): readonly T[] {
  return Array.isArray(value) ? value : [];
}

function textOf(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function recordOf(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function readableDevices(layout: LayoutSectionField | null | undefined): LayoutDevice[] {
  return listOf(layout?.devices).filter((device): device is LayoutDevice =>
    Boolean(recordOf(device).scDeviceItem && typeof recordOf(device).scDeviceItem === "object"),
  );
}

function readableControls(placement: LayoutPlacement): ScControl[] {
  return listOf(placement.controls).filter((control): control is ScControl =>
    Boolean(recordOf(control).rendering && typeof recordOf(control).rendering === "object"),
  );
}

function readablePlacements(placements: readonly LayoutPlacement[] | null | undefined): LayoutPlacement[] {
  return listOf(placements).filter((placement): placement is LayoutPlacement => typeof placement === "object");
}

export function createPageLayoutItemsByDeviceId(
  layoutSectionFields: readonly LayoutSectionField[],
): Map<string, ItemGraphNodeData> {
  const pageLayoutItemsByDeviceId = new Map<string, ItemGraphNodeData>();

  listOf(layoutSectionFields).forEach((layoutSectionField) => {
    readableDevices(layoutSectionField).forEach((device) => {
      const deviceId = device.scDeviceItem.scItemId;
      const pageLayoutItem = device.scPageLayoutItem;

      if (deviceId && pageLayoutItem?.scItemId && !pageLayoutItemsByDeviceId.has(deviceId)) {
        pageLayoutItemsByDeviceId.set(deviceId, pageLayoutItem);
      }
    });
  });

  return pageLayoutItemsByDeviceId;
}

export function createLayoutSectionReferenceModel(
  layout: LayoutSectionField,
  pageLayoutItemsByDeviceId: Map<string, ItemGraphNodeData>,
): ReferenceModelNonItemNode {
  const treeNodeId = createReferenceModelNodeId(
    CONST.FOBLES.REFERENCE_GRAPH.NODE_ID.MAIN_LAYOUT_BOX_NODE_ID,
    layout.name,
  );

  return createReferenceModelNonItemNode({
    treeNodeId,
    name: layout.name ?? "",
    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.STRUCTURAL,
    provenance: layout.rawMarkup
      ? { type: "layout-xml", label: layout.name ?? "Layout", rawMarkup: layout.rawMarkup }
      : createSyntheticProvenance(layout.name ?? "Layout"),
    collapseKey: GRAPH_COLLAPSE_KEY.LAYOUT_SECTION,
    branch: "layouts",
    relationshipToParent: "related",
    children: readableDevices(layout).map((device, deviceIndex) =>
      createDeviceReferenceModelNode(treeNodeId, device, deviceIndex, pageLayoutItemsByDeviceId, isLayoutDelta(layout)),
    ),
  });
}

function createDeviceReferenceModelNode(
  layoutTreeNodeId: string,
  device: LayoutDevice,
  deviceIndex: number,
  pageLayoutItemsByDeviceId: Map<string, ItemGraphNodeData>,
  inheritsLayout: boolean,
): ReferenceModelItemNode {
  const treeNodeId = createReferenceModelNodeId(
    layoutTreeNodeId,
    "device",
    device.scDeviceItem.scItemId ?? String(deviceIndex),
  );
  const pageLayoutItem =
    device.scPageLayoutItem ??
    (device.scDeviceItem.scItemId ? pageLayoutItemsByDeviceId.get(device.scDeviceItem.scItemId) : undefined);
  const pageLayoutNode = pageLayoutItem
    ? createPageLayoutReferenceModelNode(treeNodeId, pageLayoutItem, readablePlacements(device.placements))
    : createMissingPageLayoutReferenceModelNode(treeNodeId, readablePlacements(device.placements), inheritsLayout);

  return createReferenceModelItemNode({
    treeNodeId,
    scItem: device.scDeviceItem,
    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.DEVICE,
    provenance: { type: "layout-device", device },
    collapseKey: GRAPH_COLLAPSE_KEY.DEVICE,
    branch: "layouts",
    relationshipToParent: "related",
    children: [pageLayoutNode],
  });
}

// Agent: A layout field whose root is <r p:p="1"> is a delta over the template's __Standard Values. A device in a delta
// Agent: without an l="" attribute keeps the Standard Values layout; it is not missing. Only a full (non-delta) layout
// Agent: value without l="" really has no layout set.
function isLayoutDelta(layout: LayoutSectionField): boolean {
  return LAYOUT_DELTA_ROOT_PATTERN.test(textOf(layout.rawMarkup));
}

function createMissingPageLayoutReferenceModelNode(
  deviceTreeNodeId: string,
  placements: readonly LayoutPlacement[],
  inheritsLayout: boolean,
): ReferenceModelNonItemNode {
  const treeNodeId = createReferenceModelNodeId(deviceTreeNodeId, "page-layout");
  // Agent: Graph labels wrap at 16 characters per line, so the qualifier stays short ("Page Layout" / "(inherited)").
  const name = inheritsLayout ? "Page Layout (inherited)" : "Page Layout (none set)";

  return createReferenceModelNonItemNode({
    treeNodeId,
    name,
    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.PAGE_LAYOUT,
    provenance: createSyntheticProvenance(name),
    collapseKey: GRAPH_COLLAPSE_KEY.PAGE_LAYOUT,
    branch: "layouts",
    relationshipToParent: "related",
    children: placements.map((placement) => createPlacementReferenceModelNode(treeNodeId, placement)),
  });
}

function createPageLayoutReferenceModelNode(
  deviceTreeNodeId: string,
  pageLayoutItem: ItemGraphNodeData,
  placements: readonly LayoutPlacement[],
): ReferenceModelItemNode {
  const treeNodeId = createReferenceModelNodeId(deviceTreeNodeId, "page-layout", pageLayoutItem.scItemId);

  return createReferenceModelItemNode({
    treeNodeId,
    scItem: pageLayoutItem,
    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.PAGE_LAYOUT,
    provenance: createSitecoreItemProvenance(pageLayoutItem),
    collapseKey: GRAPH_COLLAPSE_KEY.PAGE_LAYOUT,
    branch: "layouts",
    relationshipToParent: "related",
    children: placements.map((placement) => createPlacementReferenceModelNode(treeNodeId, placement)),
  });
}

function createPlacementReferenceModelNode(
  scopeTreeNodeId: string,
  placement: LayoutPlacement,
): ReferenceModelNonItemNode {
  const path = textOf(placement.path);
  const name = textOf(placement.name);
  const treeNodeId = createReferenceModelNodeId(
    scopeTreeNodeId,
    CONST.FOBLES.REFERENCE_GRAPH.LAYOUT_SCOPE.PLACEHOLDER,
    path,
  );
  const controls = readableControls(placement);
  const childPlacements = readablePlacements(placement.placements);
  const ownerByPlacement = new Map(
    childPlacements.map((childPlacement) => [childPlacement, findOwningControl(controls, childPlacement)]),
  );
  const childPlaceholderNodes = (owner: ScControl | undefined): ReferenceModelNode[] =>
    childPlacements
      .filter((childPlacement) => ownerByPlacement.get(childPlacement) === owner)
      .map((childPlacement) => createPlacementReferenceModelNode(treeNodeId, childPlacement));
  const children: ReferenceModelNode[] = [
    ...childPlaceholderNodes(undefined),
    ...controls.map((control, controlIndex) =>
      createRenderingReferenceModelNode(treeNodeId, control, controlIndex, childPlaceholderNodes(control)),
    ),
  ];

  return createReferenceModelNonItemNode({
    treeNodeId,
    name,
    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.PLACEHOLDER,
    provenance: { type: "placeholder", placeholderPath: path, displayName: name },
    collapseKey: GRAPH_COLLAPSE_KEY.PLACEHOLDER,
    branch: "layouts",
    relationshipToParent: "related",
    children,
  });
}

// Agent: Dynamic placeholders belong to the rendering that exposes them, so they nest under that rendering instead of
// Agent: beside it. SXA/JSS keys look like "container-1" (the owner has DynamicPlaceholderId=1 in its parameters);
// Agent: classic keys look like "main-{RENDERING UID}-0". A placeholder with no single clear owner stays where it is.
function findOwningControl(controls: readonly ScControl[], child: LayoutPlacement): ScControl | undefined {
  const ownerUid = rawPlaceholderSegments(child)
    .map((segment) => UID_DYNAMIC_PLACEHOLDER_PATTERN.exec(segment)?.[1])
    .find((uid): uid is string => Boolean(uid));
  const dynamicId = NUMBERED_DYNAMIC_PLACEHOLDER_PATTERN.exec(textOf(child.name))?.[1];
  const candidates = ownerUid
    ? controls.filter((control) => normalizeGuid(control.uid) === normalizeGuid(ownerUid))
    : controls.filter((control) => dynamicId !== undefined && readDynamicPlaceholderId(control) === dynamicId);

  return candidates.length === 1 ? candidates[0] : undefined;
}

function rawPlaceholderSegments(placement: LayoutPlacement): string[] {
  const depth = textOf(placement.path).split("/").length - 1;
  return listOf(placement.sourcePaths)
    .map((sourcePath) => textOf(sourcePath).split("/").filter(Boolean)[depth])
    .filter((segment): segment is string => Boolean(segment));
}

// Agent: Prefer the parsed parameters; fall back to the raw s:par / par attribute. Either may be missing (cached
// Agent: controls can lack rawData entirely).
function readDynamicPlaceholderId(control: ScControl): string | undefined {
  const parsed = textOf(recordOf(control.parameters).DynamicPlaceholderId).trim();
  const raw = recordOf(control.rawData);
  const rawParameters = textOf(raw["s:par"]) || textOf(raw.par);
  return parsed || new URLSearchParams(rawParameters).get("DynamicPlaceholderId")?.trim() || undefined;
}

function normalizeGuid(value: unknown): string {
  return textOf(value).replace(/[{}]/g, "").toLowerCase();
}
