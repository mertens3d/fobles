import type { selectorHints } from "../../../constants/_base/const.types";
import { CONST } from "../../../constants/const";
import { extensionLog } from "../../logger";

export async function clickScRibbonTab(
    container: ParentNode,
    selectorHints: selectorHints,
): Promise<boolean> {
    extensionLog.debug("[Macro: clickScRibbonTab] - Start");
    let success = false;
    const ribbonPanel = getRibbonPanel(container);

    if (ribbonPanel) {
        const candidateElement = getElementFromHints(ribbonPanel, selectorHints);
        if (candidateElement instanceof HTMLElement) {
            candidateElement.click();
            success = await waitForActive(candidateElement);
        } else {
            console.error(`[${clickScRibbonTab.name}] - Candidate element not found from hints`);
        }
    }
    extensionLog.debug(`[${clickScRibbonTab.name}] - Finished with success: ${success}`);
    return success;
}

function getContainerInfo(container: ParentNode): string {
    let containerInfo = container.nodeName;

    if (container instanceof Document) {
        containerInfo = container.URL;
    } else if (container instanceof Element) {
        containerInfo = `${container.tagName.toLowerCase()}#${container.id}`;
    }

    return containerInfo;
}

function getRibbonPanel(container: ParentNode): ParentNode | null {
    const ribbonPanel = container.querySelector(CONST.SITECORE.SELECTORS.RIBBON_PANEL) as ParentNode | null;
    if (!ribbonPanel) {
        const containerInfo = getContainerInfo(container);
        console.error(`[${getRibbonPanel.name}] - Ribbon panel not found on ${containerInfo} with selector ${CONST.SITECORE.SELECTORS.RIBBON_PANEL} `);
    }

    return ribbonPanel;
}

export function getElementFromHints(
    doc: ParentNode,
    selectorHints: selectorHints,
): ParentNode | null {
    let foundElement: ParentNode | null = null;
    for (const selectorHint of selectorHints) {
        const candidateElement = doc.querySelector(selectorHint);
        if (candidateElement) {
            foundElement = candidateElement;
            break;
        }
    }
    if (!foundElement) {
        console.error(`[${getElementFromHints.name}] - Element not found from hints`);
    }
    return foundElement;
}

async function waitForActive(
    element: HTMLElement,
    timeout = 2000,
): Promise<boolean> {
    return await new Promise<boolean>((resolve, reject) => {
        extensionLog.debug(`[${waitForActive.name}] - Waiting for element to become active`);
        const start = Date.now();

        const interval = window.setInterval(() => {
            const isActive = [...element.classList].some((className) =>
                className.toLowerCase().includes("active"),
            );

            if (isActive) {
                window.clearInterval(interval);
                extensionLog.debug(`[${waitForActive.name}] - Element became active`);
                resolve(true);
            } else if (Date.now() - start >= timeout) {
                window.clearInterval(interval);
                extensionLog.debug(`[${waitForActive.name}] - Element did not become active within timeout`);
               resolve(false);
            }
        }, 25);
    });
}