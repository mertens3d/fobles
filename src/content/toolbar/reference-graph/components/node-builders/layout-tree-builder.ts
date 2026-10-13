// @source-path [Fobles] src/content/toolbar/reference-graph/components/node-builders/layout-tree-builder.ts

import type {
  ScControl,
  LayoutDevice,
  LayoutSectionField,
  SitecoreHarvestResult,
} from "../../../../sitecore-harvester/sitecore-harvester.types";
import {
  kindClass,
  slugify,
} from "../../graph-helpers";
import { lastPathSegment } from "../../cytoscape/graph-node-helpers";
import { buildLabel } from "../../cytoscape/graph-node-helpers";
import { buildTooltip, buildTooltipContent } from "../../graph-tooltip";
import type { SatelliteDescriptor } from "../../reference-graph.types";
import { CONST } from "../../../../../constants/const";
import { createPlaceholderTreeNodes } from "./placeholder-tree-nodes";
import type { CompoundGraphNode } from "../../graph.types";
import { createPlaceholderGraphNodes } from "./placeholder-graph-nodes";

export function createScopedId(...parts: Array<string | undefined>): string {
  return parts
    .filter((part): part is string => Boolean(part))
    .map(slugify)
    .join("-");
}

function createDeviceTree(
  layoutId: string,
  device: LayoutDevice,
  deviceIndex: number,
): CompoundGraphNode {
  const item = device.scLayoutViewItem;

  const descriptor: SatelliteDescriptor = {
    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.DEVICE,
    item,
    value: item?.scItemName ?? "Unknown device",
    filterClass: CONST.FOBLES.REFERENCE_GRAPH.FILTER_CLASS.layouts,
  };

  const deviceNodeId = createScopedId(
    layoutId,
    "device",
    device.scDeviceItem?.scItemId ?? String(deviceIndex),
  );

  const placeholderTrees = createPlaceholderTreeNodes(device.controls); 
  const placeholderGraphNodes = createPlaceholderGraphNodes(deviceNodeId, placeholderTrees);

  return {
    item: descriptor.item,
    nodeTargetId: deviceNodeId,
    label: buildLabel(
      descriptor.kind,
      descriptor.item?.scItemName ?? device.scDeviceItem?.scItemId ?? "Unknown",
    ),
    kind: descriptor.kind,
    link: descriptor.item?.link,
    drillDown: Boolean(descriptor.item?.link),
    tooltip: buildTooltipContent(buildTooltip(descriptor)),
    children: placeholderGraphNodes,
  };
}

export function createRenderingTree(
  deviceNodeId: string,
  control: ScControl,
  controlIndex: number,
): CompoundGraphNode {
  const rendering = control.rendering;

  const renderingNodeId = createScopedId(
    deviceNodeId,
    "rendering",
    control.uid ?? rendering.scItemId ?? String(controlIndex),
  );

  const children: CompoundGraphNode[] = [];

  if (control.datasource) {
    const datasourceDescriptor: SatelliteDescriptor = {
      kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.DATASOURCE,
      item: control.datasource,
    };

    children.push({
      nodeTargetId: createScopedId(
        renderingNodeId,
        CONST.FOBLES.REFERENCE_GRAPH.LAYOUT_SCOPE.DATASOURCE,
      ),
      item: control.datasource,
      label:
        control.datasource.scItemName ??
        lastPathSegment(control.datasource.scItemPath) ??
        control.datasource.scItemId ??
        "Unknown datasource",
      kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.DATASOURCE,
      link: control.datasource.link,
      drillDown: Boolean(control.datasource.link),
      tooltip: buildTooltipContent(buildTooltip(datasourceDescriptor)),
      children: [],
    });
  }

  const parameters = Object.entries(control.parameters);

  if (parameters.length > 0) {
    children.push(createRenderingParametersTree(renderingNodeId, parameters));
  }

  const renderingDescriptor: SatelliteDescriptor = {
    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.CONTROL,
    item: rendering,
    placeholder: control.placeholder,
  };

  return {
    nodeTargetId: renderingNodeId,
    label: rendering.scItemName ?? rendering.scItemId ?? "Unknown rendering",
    item: rendering,
    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.CONTROL,
    link: rendering.link,
    drillDown: Boolean(rendering.link),
    tooltip: buildTooltipContent(buildTooltip(renderingDescriptor)),
    children,
  };
}
function createRenderingParametersTree(
  renderingNodeId: string,
  parameters: Array<[string, string]>,
): CompoundGraphNode {
  const parametersDescriptor: SatelliteDescriptor = {
    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.STRUCTURAL,
    value: "Rendering Parameters",
  };

  return {
    nodeTargetId: createScopedId(
      renderingNodeId,
      CONST.FOBLES.REFERENCE_GRAPH.LAYOUT_SCOPE.PARAMETERS,
    ),
    label: "Rendering Parameters",
    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.STRUCTURAL,
    item: undefined,
    tooltip: buildTooltipContent(buildTooltip(parametersDescriptor)),
    children: parameters.map(([name, value]): CompoundGraphNode => {
      const parameterDescriptor: SatelliteDescriptor = {
        kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.STRUCTURAL,
        value: name,
        path: value || undefined,

      };

      return {
        nodeTargetId: createScopedId(
          renderingNodeId,
          CONST.FOBLES.REFERENCE_GRAPH.LAYOUT_SCOPE.PARAMETER,
          name,
        ),
        label: value ? `${name}: ${value}` : name,
        kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.STRUCTURAL,
        tooltip: buildTooltipContent(buildTooltip(parameterDescriptor)),
        children: [],
        item: undefined,
      };
    }),
  };
}

export function appendCompoundGraphNode(
  node: CompoundGraphNode,
  cytoNodes: cytoscape.ElementDefinition[],
  parentId?: string,
): void {
  cytoNodes.push({
    data: {
      id: node.nodeTargetId,
      parent: parentId,
      label: node.label,
      itemId: node.item?.scItemId,
      path: node.item?.scItemPath,
      link: node.link,
      drillDown: node.drillDown,
      tooltip: node.tooltip,
    },
    classes: `${kindClass(node.kind)} ${CONST.FOBLES.REFERENCE_GRAPH.FILTER_CLASS.layouts}`,
  });

  node.children.forEach((child) => {
    appendCompoundGraphNode(child, cytoNodes, node.nodeTargetId);
  });
}

export function createLayoutTree(
  graphReferenceResult: SitecoreHarvestResult,
): CompoundGraphNode {
  const descriptor: SatelliteDescriptor = {
    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.STRUCTURAL,
    value: "Layouts",
  };

  return {
    nodeTargetId: CONST.FOBLES.REFERENCE_GRAPH.NODE_ID.MAIN_LAYOUT_BOX_NODE_ID,
    label: descriptor.value ?? "",
    kind: descriptor.kind,
    tooltip: buildTooltipContent(buildTooltip(descriptor)),
    item: undefined,
    children: (graphReferenceResult.layoutSectionFields ?? []).map(
      createLayoutSectionTree,
    ),
  };
}

function createLayoutSectionTree(
  layout: LayoutSectionField,
): CompoundGraphNode {
  const layoutId = createScopedId(
    CONST.FOBLES.REFERENCE_GRAPH.NODE_ID.MAIN_LAYOUT_BOX_NODE_ID,
    layout.name,
  );

  const descriptor: SatelliteDescriptor = {
    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.STRUCTURAL,
    value: layout.name ?? "",
  };

  return {
    nodeTargetId: layoutId,
    label: descriptor.value ?? "",
    kind: descriptor.kind,
    item: undefined,    
    tooltip: buildTooltipContent(buildTooltip(descriptor)),
    children: (layout.devices ?? []).map((device, deviceIndex) =>
      createDeviceTree(layoutId, device, deviceIndex),
    ),
  };
}


