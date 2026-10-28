// @source-path [fobles] src/content/foundation/reference-data/processing/reference-model-fact-patcher.ts
import type { SitecoreDataFactMap, SitecoreDataFactName } from "../../cache/sitecore-data/sitecore-data-cache.types";
import type { PreparedReferenceModel } from "../acquisition/prepare-reference-model";
import type { ItemGraphNodeData } from "../model/sitecore-item.types";
import type { ReferenceModelNode } from "../model/reference-model.types";
function normalizeReference(value: string | undefined): string | undefined { return value?.replace(/[{}]/g, "").trim().toLowerCase(); }
function matches(item: ItemGraphNodeData, reference: string): boolean {
    const normalized = normalizeReference(reference);
    return normalizeReference(item.scItemId) === normalized || item.scItemPath?.trim().toLowerCase() === reference.trim().toLowerCase();
}
function patchQuickInfo(item: ItemGraphNodeData, value: SitecoreDataFactMap["quickInfo"]): void {
    if (value.result.status !== "found" || !value.result.value)
        return;
    const live = value.result.value;
    item.scItemId = live.scItemId;
    item.scItemName = live.scItemName;
    item.scItemPath = live.scItemPath;
    item.scTemplate = live.scTemplate;
    item.scItemIcon = live.scItemIcon;
    item.rawMarkup = live.rawMarkup;
    item.link = live.link;
}
function patchItem<K extends SitecoreDataFactName>(item: ItemGraphNodeData, factName: K, value: SitecoreDataFactMap[K]): void {
    if (factName === "quickInfo")
        patchQuickInfo(item, value as SitecoreDataFactMap["quickInfo"]);
    else
        Object.assign(item.facts ??= {}, { [factName]: value });
}
function visit(node: ReferenceModelNode, reference: string, patch: (item: ItemGraphNodeData) => void): void {
    if (node.nodeType === "item" && matches(node.scItem, reference))
        patch(node.scItem);
    node.children.forEach((child) => visit(child, reference, patch));
}
export function patchReferenceModelFact<K extends SitecoreDataFactName>(prepared: PreparedReferenceModel, reference: string, factName: K, value: SitecoreDataFactMap[K]): string[] {
    const changedTreeNodeIds: string[] = [];
    visit(prepared.referenceModel, reference, (item) => patchItem(item, factName, value));
    prepared.nodesById.forEach((node, treeNodeId) => {
        if (node.nodeType === "item" && matches(node.scItem, reference)) {
            patchItem(node.scItem, factName, value);
            changedTreeNodeIds.push(treeNodeId);
        }
    });
    if (matches(prepared.harvestedData.rootItem, reference)) {
        patchItem(prepared.harvestedData.rootItem, factName, value);
        if (factName === "parent")
            prepared.harvestedData.parent = (value as SitecoreDataFactMap["parent"]).parent;
        if (factName === "children")
            prepared.harvestedData.childItems = (value as SitecoreDataFactMap["children"]).childItems;
        if (factName === "referrers")
            prepared.harvestedData.referrers = (value as SitecoreDataFactMap["referrers"]).referrers;
        if (factName === "customSections")
            prepared.harvestedData.customFieldSections = (value as SitecoreDataFactMap["customSections"]).sections;
        if (factName === "standardSections")
            prepared.harvestedData.standardFieldSections = (value as SitecoreDataFactMap["standardSections"]).sections;
        if (factName === "layout")
            prepared.harvestedData.layoutSectionFields = (value as SitecoreDataFactMap["layout"]).layoutSectionFields;
    }
    return changedTreeNodeIds;
}
