import { CONST } from "../../../constants/const";
import type { QuickInfo, QuickInfoTemplate } from "../types";

export const getQuickInfo = (
    doc: Document
): QuickInfo => {
    const quickInfoTables = doc.querySelectorAll<HTMLTableElement>(
        CONST.SITECORE.SELECTORS.QUICK_INFO_CELL
    );
    const quickInfo: QuickInfo = {
        itemId: undefined,
        itemPath: undefined,
        template: undefined,
        itemName: undefined,
        rawMarkup: Array.from(quickInfoTables)
            .map((table) => table.outerHTML)
            .join("\n") || undefined,
    }

    for (const table of quickInfoTables) {
        for (const row of Array.from(table.rows)) {
            const label = row.cells.item(0)?.textContent?.trim().toLowerCase() ?? "";

            if (label.startsWith(CONST.SITECORE.QUICK_INFO.LABEL_PREFIX.ITEM_ID.toLowerCase())) {
                quickInfo.itemId = getQuickInfoFromRow(row);
            }
            if (label.startsWith(CONST.SITECORE.QUICK_INFO.LABEL_PREFIX.ITEM_PATH.toLowerCase())) {
                quickInfo.itemPath = getQuickInfoFromRow(row);
            }
            if (label.startsWith(CONST.SITECORE.QUICK_INFO.LABEL_PREFIX.TEMPLATE.toLowerCase())) {
                quickInfo.template = getQuickInfoTemplateFromRow(row);
            }
            if (label.startsWith(CONST.SITECORE.QUICK_INFO.LABEL_PREFIX.ITEM_NAME.toLowerCase())) {
                quickInfo.itemName = getQuickInfoItemNameFromRow(row);
            }
        }
    }

    return quickInfo;
};

function getQuickInfoItemNameFromRow(
    row: HTMLTableRowElement,
): string | undefined {
    const itemName = row.cells
        .item(1)
        ?.querySelector<HTMLSpanElement>("span")
        ?.textContent
        ?.trim();

    return itemName || undefined;
}

function getQuickInfoTemplateFromRow(
    row: HTMLTableRowElement,
): QuickInfoTemplate | undefined {
    const cell = row.cells.item(1);

    const path = cell
        ?.querySelector<HTMLAnchorElement>("a")
        ?.textContent
        ?.trim();

    const id = cell
        ?.querySelector<HTMLInputElement>(
            "input.scEditorHeaderQuickInfoInputID[readonly]",
        )
        ?.value
        .trim();

    let template: QuickInfoTemplate | undefined;

    if (path || id) {
        template = {
            path,
            id,
        };
    }

    return template;
}

function getQuickInfoFromRow(row: HTMLTableRowElement) {
    const valueElement = row.cells
        .item(1)
        ?.querySelector<HTMLInputElement>(
            "input.scEditorHeaderQuickInfoInput[readonly]"
        );
    const value = valueElement?.value.trim() ?? row.cells.item(1)?.textContent?.trim();
    if (value) return value;

}