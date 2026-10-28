// @source-path [fobles] src/content/foundation/reference-data/model/reference-model-fact-patcher.ts
import type { SitecoreDataFactName, SitecoreDataFactValueByName } from "../../cache/sitecore-data/sitecore-data-cache.types";
import { buildFoblesUrl } from "../../sitecore/fobles-url";
import type { SitecoreItemLocator } from "../../workers/tasks/worker-task.types";
import type { PreparedReferenceModel } from "../acquisition/prepare-reference-model";
import { createReferenceModel } from "./reference-model-builder";
import { buildReferenceModelNodeLookup } from "./reference-model-node-lookup";
import type { ItemGraphNodeData, RootItem } from "./sitecore-item.types";
import type { ReferenceModelItemNode, ReferenceModelNode } from "./reference-model.types";
import type { SitecoreHarvestFiltersState, SitecoreHarvestResult } from "../../harvesting/sitecore-harvester.types";
const harvestedFactsByPrepared = new WeakMap<PreparedReferenceModel, Map<string, SitecoreHarvestResult>>();
function normalize(value: string): string { return value.replace(/[{}]/g, "").trim().toLowerCase(); }
function locatorKey(locator: SitecoreItemLocator): string { return `${locator.kind}:${normalize(locator.value)}`; }
function itemMatches(item: ItemGraphNodeData, locator: SitecoreItemLocator): boolean {
    const candidate = locator.kind === "id" ? item.scItemId : item.scItemPath;
    return candidate !== undefined && normalize(candidate) === normalize(locator.value);
}
function collectMatchingItems(node: ReferenceModelNode, locator: SitecoreItemLocator, result: ReferenceModelItemNode[]): void {
    if (node.nodeType === "item" && itemMatches(node.scItem, locator))
        result.push(node);
    node.children.forEach((child) => collectMatchingItems(child, locator, result));
}
function rootItemFromQuickInfo(value: SitecoreDataFactValueByName["quickInfo"]): RootItem | undefined {
    return value.result.status === "found" && value.result.value?.scItemId ? { ...value.result.value, scItemId: value.result.value.scItemId } : undefined;
}
function emptyHarvest(item: RootItem): SitecoreHarvestResult {
    return { rootItem: item, parent: undefined, childItems: undefined, referrers: undefined, customFieldSections: undefined, standardFieldSections: undefined, layoutSectionFields: undefined };
}
function applyFact(result: SitecoreHarvestResult, factName: SitecoreDataFactName, value: SitecoreDataFactValueByName[SitecoreDataFactName]): void {
    switch (factName) {
        case "quickInfo": break;
        case "parent":
            result.parent = (value as SitecoreDataFactValueByName["parent"]).parent;
            break;
        case "children":
            result.childItems = (value as SitecoreDataFactValueByName["children"]).childItems;
            break;
        case "referrers":
            result.referrers = (value as SitecoreDataFactValueByName["referrers"]).referrers;
            break;
        case "customSections":
            result.customFieldSections = (value as SitecoreDataFactValueByName["customSections"]).sections;
            break;
        case "standardSections":
            result.standardFieldSections = (value as SitecoreDataFactValueByName["standardSections"]).sections;
            break;
        case "layout":
            result.layoutSectionFields = (value as SitecoreDataFactValueByName["layout"]).layoutSectionFields;
            break;
    }
}
function mergeQuickInfo(target: ItemGraphNodeData, source: ItemGraphNodeData): void {
    target.scItemId = source.scItemId;
    target.scItemName = source.scItemName;
    target.scItemPath = source.scItemPath;
    target.scTemplate = source.scTemplate;
    target.scItemIcon = source.scItemIcon;
    target.rawMarkup = source.rawMarkup;
    const reference = source.scItemId || source.scItemPath;
    target.link = reference ? buildFoblesUrl(reference) : source.link;
}
function rebuildLookup(prepared: PreparedReferenceModel): void {
    prepared.nodesById.clear();
    buildReferenceModelNodeLookup(prepared.referenceModel).forEach((node, id) => prepared.nodesById.set(id, node));
}
export function patchReferenceModelFact<K extends SitecoreDataFactName>(prepared: PreparedReferenceModel, locator: SitecoreItemLocator, factName: K, value: SitecoreDataFactValueByName[K], filters: SitecoreHarvestFiltersState): readonly string[] {
    const matches: ReferenceModelItemNode[] = [];
    collectMatchingItems(prepared.referenceModel, locator, matches);
    if (factName === "quickInfo") {
        const item = rootItemFromQuickInfo(value as SitecoreDataFactValueByName["quickInfo"]);
        if (!item)
            return [];
        matches.forEach((node) => mergeQuickInfo(node.scItem, item));
        if (itemMatches(prepared.harvestedData.rootItem, locator))
            mergeQuickInfo(prepared.harvestedData.rootItem, item);
    }
    else {
        for (const node of matches) {
            if (!node.scItem.scItemId)
                continue;
            let result: SitecoreHarvestResult;
            if (itemMatches(prepared.harvestedData.rootItem, locator)) {
                result = prepared.harvestedData;
            }
            else {
                let byReference = harvestedFactsByPrepared.get(prepared);
                if (!byReference) {
                    byReference = new Map();
                    harvestedFactsByPrepared.set(prepared, byReference);
                }
                const key = locatorKey(locator);
                result = byReference.get(key) ?? emptyHarvest({ ...node.scItem, scItemId: node.scItem.scItemId });
                byReference.set(key, result);
            }
            applyFact(result, factName, value);
            node.children = createReferenceModel(result, filters).children;
        }
    }
    rebuildLookup(prepared);
    return matches.map((node) => node.treeNodeId);
}
