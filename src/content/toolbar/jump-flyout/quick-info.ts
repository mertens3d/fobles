import { CONST } from "../../../constants/const";
import type { QuickInfo } from "../types";


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
                quickInfo.template = getQuickInfoFromRow(row);
            }
            if (label.startsWith(CONST.SITECORE.QUICK_INFO.LABEL_PREFIX.ITEM_NAME.toLowerCase())) {
                quickInfo.itemName = getQuickInfoFromRow(row);
            }
        }
    }

    return quickInfo;
};


function getQuickInfoFromRow(row: HTMLTableRowElement) {
    const valueElement = row.cells
        .item(1)
        ?.querySelector<HTMLInputElement>(
            "input.scEditorHeaderQuickInfoInput[readonly]"
        );
    const value = valueElement?.value.trim() ?? row.cells.item(1)?.textContent?.trim();
    if (value) return value;

}