// @source-path [fobles] src/content/sitecore-harvester/harvest-steps.ts

import { CONST } from "../../constants/const";
import { SITECORE } from "../../constants/sitecore";
import { buildFoblesUrl } from "../features/augmentor/helper";
import { resolveDatasourceLink } from "./field-links";
import { findFieldInput } from "./harvest-helpers";
import { resolveQuickInfoForRenderingId } from "./harvest-helpers";
import { collectTreeChildren, collectReferrers } from "./harvest-sitecore";
import type { HarvestStep, SitecoreHarvestField } from "./sitecore-harvester.types";
import type { HarvestContext } from "./sitecore-harvester.types";
import { parseDevice } from "./layout-parsing";
import { readRawFieldValue } from "./field-harvester";
import { isHandledElsewhere } from "./field-harvester";
import { extractFieldLabel } from "./field-harvester";
import { resolveFieldLinks } from "./field-links";
import type { SitecoreHarvestSection } from "./sitecore-harvester.types";
import type { itemNodeData } from "./sitecore-harvester.types";
import { getParentPath } from "../../shared/path-helpers";

export const HARVEST_STEPS: readonly HarvestStep[] = [
  {
    harvestStepKey: "children",

    filterKey: "children",
    label: "Children",
    build: async (buildContext: HarvestContext) => {
      buildContext.result.childItems = await collectTreeChildren(buildContext.doc, buildContext.itemId);
    },
  },
  {
    harvestStepKey: "sections",
    filterKey: "sections",
    label: "Sections",
    build: (buildContext: HarvestContext) => {
      buildContext.result.sections = collectSections(buildContext.doc);
      return Promise.resolve();
    },
  },
  {
    harvestStepKey: "layout",
    filterKey: "layout",
    label: "Layout",
    build: async (buildContext: HarvestContext) => {

      const sharedLayoutInput = findFieldInput(buildContext.doc, "Renderings");
      const finalLayoutInput = findFieldInput(buildContext.doc, "Final renderings") ?? sharedLayoutInput;
      const sharedDevice = sharedLayoutInput?.value
        ? parseDevice(sharedLayoutInput.value, CONST.SITECORE.DEVICES.DEFAULT)
        : { layoutId: undefined, controls: [] };
      const finalDevice = finalLayoutInput?.value
        ? parseDevice(finalLayoutInput.value, CONST.SITECORE.DEVICES.DEFAULT)
        : { layoutId: undefined, controls: [] };
      const layoutId = finalDevice.layoutId ?? sharedDevice.layoutId;

      const layoutDetailsQuickInfo = layoutId ? await resolveQuickInfoForRenderingId(layoutId, buildContext.signal) : undefined;
      buildContext.result.sharedLayoutName = layoutDetailsQuickInfo?.itemName;
      buildContext.result.sharedLayoutLink = layoutId ? buildFoblesUrl(layoutId) : undefined;
      buildContext.result.sharedLayoutPath = layoutDetailsQuickInfo?.itemPath;
    },
  },

  {
    harvestStepKey: "controls",
    filterKey: "controls",
    label: "Controls",
    build: async (buildContext: HarvestContext) => {
      const sharedLayoutInput = findFieldInput(buildContext.doc, "Renderings");
      const finalLayoutInput = findFieldInput(buildContext.doc, "Final renderings") ?? sharedLayoutInput;
      const finalDevice = finalLayoutInput?.value
        ? parseDevice(finalLayoutInput.value, CONST.SITECORE.DEVICES.DEFAULT)
        : { layoutId: undefined, controls: [] };

      const enrichedControls = await Promise.all(

        finalDevice.controls.map(async (control) => {
          const details = control.renderingId ? await resolveQuickInfoForRenderingId(control.renderingId, buildContext.signal) : undefined;
          return {
            ...control,
            name: details?.itemName ?? undefined,
            path: details?.itemPath ?? undefined,
            template: details?.template ?? undefined,
            link: control.renderingId ? buildFoblesUrl(control.renderingId) : undefined,
            datasourceLink: resolveDatasourceLink(control.datasource, buildContext.rootItem.path ?? undefined),
          };
        })
      );
      buildContext.result.controls = enrichedControls;
    },
  },

  {
    harvestStepKey: "referrers",
    filterKey: "referrers",
    label: "Referrers",
    build: async (buildContext: HarvestContext) => {
      buildContext.result.referrers = await collectReferrers(buildContext);
    },
  },
  {
    harvestStepKey: "parent",
    filterKey: "parent",
    label: "Parent",
    build: async (buildContext: HarvestContext) => {
      const parentPath = getParentPath(buildContext.rootItem.path ?? undefined);
      const parent: itemNodeData = {
        name: parentPath?.split("/").filter(Boolean).pop() ?? undefined,
        itemId: "",
        link: parentPath ? buildFoblesUrl(parentPath) : undefined,
        path: parentPath,
        template: undefined,
        templateLink: undefined,
      }

      buildContext.result.parent = parent;
      return Promise.resolve();
    },
  },
];

export function collectSections(doc: Document): SitecoreHarvestSection[] {
  const sections: SitecoreHarvestSection[] = [];

  doc.querySelectorAll<HTMLElement>(SITECORE.SELECTORS.SECTION_CAPTION).forEach((caption) => {
    const name = caption.textContent?.trim() ?? "";
    if (!name || CONST.SITECORE.HARVEST.EXCLUDED_SECTION_NAMES.has(name.toLowerCase())) return;

    const panelId = caption.querySelector("img[aria-controls]")?.getAttribute("aria-controls") ?? `${caption.id}_controls`;
    const panel = doc.getElementById(panelId);
    if (!panel) return;

    const fields: SitecoreHarvestField[] = [];
    panel.querySelectorAll<HTMLElement>(SITECORE.SELECTORS.EDITOR_FIELD_MARKER).forEach((marker) => {
      const label = extractFieldLabel(marker);
      if (!label || isHandledElsewhere(label)) return;

      const links = resolveFieldLinks(marker);
      if (links) {
        fields.push({ label, value: links.map((link) => link.label).join(", "), links });
        return;
      }

      const value = readRawFieldValue(marker);
      if (!value) return;
      fields.push({ label, value });
    });

    if (fields.length > 0) sections.push({ name, fields });
  });

  return sections;
}
