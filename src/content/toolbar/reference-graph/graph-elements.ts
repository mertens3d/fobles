// @source-path [fobles] src/content/toolbar/reference-graph/graph-elements.ts

import type cytoscape from "cytoscape";
import { REFERENCE_GRAPH } from "../../../constants/graph.const";
import { CONST } from "../../../constants/const";
import type {
  HarvestFieldLink,
  SitecoreHarvestField,
  SitecoreHarvestResult,
} from "../../sitecore-harvester/sitecore-harvester.types";
import {
  appendCompoundChildren,
  appendSatellites,
  buildLabel,
  createItemSatelliteDescriptor,
} from "./cytoscape/graph-node-helpers";
import { buildLayoutNodes } from "./components/node-builders/layout-nodes-builder";
import { kindClass, slugify } from "./graph-helpers";
import { buildTooltip } from "./graph-tooltip";
import type { SatelliteDescriptor } from "./reference-graph.types";

export function buildElements(
  graphReferenceResult: SitecoreHarvestResult,
): cytoscape.ElementDefinition[] {
  const rootDescriptor = createItemSatelliteDescriptor(
    graphReferenceResult.rootItem,
    REFERENCE_GRAPH.NODE_KIND.ITEM,
    "",
  );

  const cytoNodes: cytoscape.ElementDefinition[] = [
    {
      data: {
        id: graphReferenceResult.rootItem.itemId,
        label: buildLabel(
          REFERENCE_GRAPH.NODE_KIND.ITEM,
          graphReferenceResult.rootItem.name ??
            graphReferenceResult.rootItem.itemId ??
            "Unknown item",
        ),
        link: graphReferenceResult.rootItem.link,
        tooltip: buildTooltip(rootDescriptor),
      },
      classes: kindClass(REFERENCE_GRAPH.NODE_KIND.ITEM),
    },
  ];

  const cytoEdges: cytoscape.ElementDefinition[] = [];

  buildLayoutNodes(graphReferenceResult, cytoNodes, cytoEdges);

  buildTemplateNode(graphReferenceResult, cytoNodes, cytoEdges);

  buildParentNode(graphReferenceResult, cytoNodes, cytoEdges);

  buildChildNodes(graphReferenceResult, cytoNodes, cytoEdges);

  buildReferrerNode(graphReferenceResult, cytoNodes, cytoEdges);

  buildSectionsNode(graphReferenceResult, cytoNodes, cytoEdges);

  return [...cytoNodes, ...cytoEdges];
}

function buildParentNode(
  graphReferenceResult: SitecoreHarvestResult,
  cytoNodes: cytoscape.ElementDefinition[],
  cytoEdges: cytoscape.ElementDefinition[],
): void {
  if (!graphReferenceResult.parent) {
    return;
  }

  appendSatellites(cytoNodes, cytoEdges, graphReferenceResult.rootItem.itemId, [
    createItemSatelliteDescriptor(
      graphReferenceResult.parent,
      REFERENCE_GRAPH.NODE_KIND.PARENT,
      REFERENCE_GRAPH.FILTER_CLASS.parent,
    ),
  ]);
}

function buildTemplateNode(
  graphReferenceResult: SitecoreHarvestResult,
  cytoNodes: cytoscape.ElementDefinition[],
  cytoEdges: cytoscape.ElementDefinition[],
): void {
  const template = graphReferenceResult.rootItem.template;

  if (!template) {
    return;
  }

  appendSatellites(cytoNodes, cytoEdges, graphReferenceResult.rootItem.itemId, [
    createItemSatelliteDescriptor(
      template,
      REFERENCE_GRAPH.NODE_KIND.TEMPLATE,
      REFERENCE_GRAPH.FILTER_CLASS.template,
    ),
  ]);
}

function buildSectionsNode(
  graphReferenceResult: SitecoreHarvestResult,
  cytoNodes: cytoscape.ElementDefinition[],
  cytoEdges: cytoscape.ElementDefinition[],
): void {
  const sectionsWithValues =
    graphReferenceResult.sections?.filter((section) =>
      section.fields.some((field) => Boolean(field.value)),
    ) ?? [];

  if (sectionsWithValues.length === 0) {
    return;
  }

  const sectionsId = `${graphReferenceResult.rootItem.itemId}-sections`;

  const sectionsDescriptor: SatelliteDescriptor = {
    kind: "Structural",
    value: "Sections",
  };

  cytoNodes.push({
    data: {
      id: sectionsId,
      label: sectionsDescriptor.value,
      link: undefined,
      tooltip: buildTooltip(sectionsDescriptor),
    },
    classes:
      `${kindClass("Structural")} ` + REFERENCE_GRAPH.FILTER_CLASS.sections,
  });

  cytoEdges.push({
    data: {
      id: `edge-${sectionsId}`,
      source: graphReferenceResult.rootItem.itemId,
      target: sectionsId,
    },
  });

  sectionsWithValues.forEach((section) => {
    const sectionId =
      `${graphReferenceResult.rootItem.itemId}` +
      `-section-${slugify(section.name)}`;

    const sectionDescriptor: SatelliteDescriptor = {
      kind: REFERENCE_GRAPH.NODE_KIND.SECTION,
      value: section.name,
    };

    cytoNodes.push({
      data: {
        id: sectionId,
        parent: sectionsId,
        label: buildLabel(
          sectionDescriptor.kind,
          sectionDescriptor.value ?? "",
        ),
        link: undefined,
        tooltip: buildTooltip(sectionDescriptor),
      },
      classes:
        `${kindClass(REFERENCE_GRAPH.NODE_KIND.SECTION)} ` +
        REFERENCE_GRAPH.FILTER_CLASS.sections,
    });

    const fieldIds = appendCompoundChildren(
      cytoNodes,
      sectionId,
      section.fields.map(
        (field: SitecoreHarvestField): SatelliteDescriptor => ({
          kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.FIELD,
          value: field.value,
          category: REFERENCE_GRAPH.NODE_KIND.FIELD,
          filterClass: REFERENCE_GRAPH.FILTER_CLASS.sections,
        }),
      ),
    );

    section.fields.forEach((field, index) => {
      const fieldId = fieldIds[index];

      if (!fieldId || !field.links || field.links.length === 0) {
        return;
      }

      appendSatellites(
        cytoNodes,
        cytoEdges,
        fieldId,
        field.links.map(
          (link: HarvestFieldLink): SatelliteDescriptor => ({
            ...createItemSatelliteDescriptor(
              link.valueItem,
              REFERENCE_GRAPH.NODE_KIND.FIELD,
              REFERENCE_GRAPH.FILTER_CLASS.sections,
            ),
            value: link.label,
          }),
        ),
      );
    });
  });
}

function buildReferrerNode(
  graphReferenceResult: SitecoreHarvestResult,
  cytoNodes: cytoscape.ElementDefinition[],
  cytoEdges: cytoscape.ElementDefinition[],
): void {
  const referrers = graphReferenceResult.referrers ?? [];

  if (referrers.length === 0) {
    return;
  }

  const referrersId = `${graphReferenceResult.rootItem.itemId}-referrers`;

  const referrersDescriptor: SatelliteDescriptor = {
    kind: "Structural",
    value: `${referrers.length} item(s)`,
  };

  cytoNodes.push({
    data: {
      id: referrersId,
      label: "Referrers",
      link: undefined,
      tooltip: buildTooltip(referrersDescriptor),
    },
    classes:
      `${kindClass("Structural")} ` + REFERENCE_GRAPH.FILTER_CLASS.referrers,
  });

  cytoEdges.push({
    data: {
      id: CONST.FOBLES.REFERENCE_GRAPH.EDGE_IDS.REFERRERS,
      source: referrersId,
      target: graphReferenceResult.rootItem.itemId,
    },
  });

  appendCompoundChildren(
    cytoNodes,
    referrersId,
    referrers.map((referrer) =>
      createItemSatelliteDescriptor(
        referrer,
        REFERENCE_GRAPH.NODE_KIND.REFERRER,
        REFERENCE_GRAPH.FILTER_CLASS.referrers,
      ),
    ),
  );
}

function buildChildNodes(
  graphReferenceResult: SitecoreHarvestResult,
  cytoNodes: cytoscape.ElementDefinition[],
  cytoEdges: cytoscape.ElementDefinition[],
): void {
  const childItems = graphReferenceResult.childItems ?? [];

  if (childItems.length === 0) {
    return;
  }

  const childrenId = `${graphReferenceResult.rootItem.itemId}-children`;

  const childrenDescriptor: SatelliteDescriptor = {
    kind: "Structural",
    value: `${childItems.length} item(s)`,
  };

  cytoNodes.push({
    data: {
      id: childrenId,
      label: "Children",
      link: undefined,
      tooltip: buildTooltip(childrenDescriptor),
    },
    classes:
      `${kindClass("Structural")} ` + REFERENCE_GRAPH.FILTER_CLASS.children,
  });

  cytoEdges.push({
    data: {
      id: CONST.FOBLES.REFERENCE_GRAPH.EDGE_IDS.CHILDREN,
      source: graphReferenceResult.rootItem.itemId,
      target: childrenId,
    },
  });

  appendCompoundChildren(
    cytoNodes,
    childrenId,
    childItems.map((child) =>
      createItemSatelliteDescriptor(
        child,
        REFERENCE_GRAPH.NODE_KIND.CHILD,
        REFERENCE_GRAPH.FILTER_CLASS.children,
      ),
    ),
  );
}
