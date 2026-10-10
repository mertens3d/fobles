import { CONST } from "../../../constants/const";
import { SITECORE } from "../../../constants/sitecore";
import { buildFoblesUrl } from "../../features/augmentor/helper";
import { findFieldInput, getParentPath, resolveDatasourceLink, resolveQuickInfoForRenderingId } from "../../features/jump-flyout/reference-graph";
import { collectTreeChildren, collectReferrers } from "./build-graph";
import { REFERENCE_GRAPH } from "../../../constants/graph.const";
import type { BuildContext, BuildStep } from "./graph.types";
import { parseDevice } from "./layout-parsing";
import { extractFieldLabel, isHandledElsewhere, readRawFieldValue } from "./reference-graph";
import { resolveFieldLinks } from "./reference-graph-field-links";
import type {   ReferenceGraphField, ReferenceGraphSection, itemNodeData } from "./reference-graph.types";

export const BUILD_STEPS: readonly BuildStep[] = [
  {
    buildStepKey: "children",
    filterKey: "children",
    label: "Children",
    build: async (buildContext: BuildContext) => {
      buildContext.result.childItems = await collectTreeChildren(buildContext.doc, buildContext.itemId);
    },
  },
  {
    buildStepKey: "sections",
    filterKey: "sections",
    label: "Sections",
    build: (buildContext: BuildContext) => {
      buildContext.result.sections = collectSections(buildContext.doc);
      return Promise.resolve();
    },
  },
  {
    buildStepKey: "layout",
    filterKey: "layout",
    label: "Layout",
    build: async (buildContext: BuildContext) => {

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
    buildStepKey: "controls",
    filterKey: "controls",
    label: "Controls",
    build: async (buildContext: BuildContext) => {
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
    buildStepKey: "referrers",
    filterKey: "referrers",
    label: "Referrers",
    build: async (buildContext: BuildContext) => {
      buildContext.result.referrers = await collectReferrers(buildContext);
    },
  },
  {
    buildStepKey: "parent",
    filterKey: "parent",
    label: "Parent",
    build: async (buildContext: BuildContext) => {
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

export function collectSections(doc: Document): ReferenceGraphSection[] {
  const sections: ReferenceGraphSection[] = [];

  doc.querySelectorAll<HTMLElement>(SITECORE.SELECTORS.SECTION_CAPTION).forEach((caption) => {
    const name = caption.textContent?.trim() ?? "";
    if (!name || REFERENCE_GRAPH.EXCLUSIONS.EXCLUDED_SECTION_NAMES.has(name.toLowerCase())) return;

    const panelId = caption.querySelector("img[aria-controls]")?.getAttribute("aria-controls") ?? `${caption.id}_controls`;
    const panel = doc.getElementById(panelId);
    if (!panel) return;

    const fields: ReferenceGraphField[] = [];
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
