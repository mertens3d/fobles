// @source-path [fobles] src/content/macros/ribbon-toggle-macro.ts

import { CONST } from "../../constants/const";
import { extensionLog } from "../logger";
import { clickScRibbonTab } from "./macro-helpers/ribbon-helper";

export async function clickRibbonHomeTab(container: ParentNode): Promise<boolean> {
  const success = await clickScRibbonTab(container, CONST.SITECORE.SELECTORS.RIBBON.HOME_TAB);
  extensionLog.debug(`[clickRibbonHomeTab] - Clicked Home tab with success: ${success}`);
  return success;
}

export async function clickRibbonViewTab(container: ParentNode): Promise<boolean> {
  const success = await clickScRibbonTab(container, CONST.SITECORE.SELECTORS.RIBBON.VIEW_TAB);
  return success;
}

export async function setScRawValuesState(container: ParentNode, desiredState: boolean): Promise<void> {
  const selectViewTabSuccess = await clickRibbonViewTab(container);
  let checkBoxSuccess = false;
  if (selectViewTabSuccess) {
    const checkbox = container.querySelector(CONST.SITECORE.SELECTORS.RAW_VALUES_CHECKBOX);

    if (checkbox instanceof HTMLInputElement && checkbox.checked !== desiredState) {
      checkbox.click();
    }
    checkBoxSuccess = (checkbox && checkbox instanceof HTMLInputElement && checkbox.checked) === desiredState;
  }

  extensionLog.debug(`[setScRawValuesState] - Set raw values state to: ${desiredState}`);
  return;
}

export type BooleanTripleState = true | false | undefined;
export async function getScRawValuesState(container: ParentNode): Promise<BooleanTripleState> {
  const selectViewTabSuccess = await clickRibbonViewTab(container);
  let checkBoxSuccess: BooleanTripleState = undefined;
  if (selectViewTabSuccess) {
    const checkbox = container.querySelector(CONST.SITECORE.SELECTORS.RAW_VALUES_CHECKBOX);
    if (checkbox && (checkbox instanceof HTMLInputElement)) {
      checkBoxSuccess = checkbox.checked;
    }
  }
  extensionLog.debug(`[getScRawValuesState] - Retrieved raw values state: ${checkBoxSuccess}`);
  return checkBoxSuccess;
}

export async function getScStandardFieldsState(container: ParentNode): Promise<BooleanTripleState> {
  const selectViewTabSuccess = await clickRibbonViewTab(container);
  let checkBoxSuccess: BooleanTripleState = undefined;
  if (selectViewTabSuccess) {
    const checkbox = container.querySelector(CONST.SITECORE.SELECTORS.STANDARD_FIELDS_CHECKBOX);
    if (checkbox && checkbox instanceof HTMLInputElement) {
      checkBoxSuccess = checkbox.checked;
    } else {
      checkBoxSuccess = undefined;
    }
  }

  extensionLog.debug(`[getScStandardFieldsState] - Retrieved standard fields state: ${checkBoxSuccess}`);
  return checkBoxSuccess;
}

export async function setScStandardFieldsState(container: ParentNode, desiredState: boolean): Promise<void> {
  const selectViewTabSuccess = await clickRibbonViewTab(container);
  if (selectViewTabSuccess) {
    const checkbox = container.querySelector(CONST.SITECORE.SELECTORS.STANDARD_FIELDS_CHECKBOX);
    if (checkbox instanceof HTMLInputElement && checkbox.checked !== desiredState) {
      checkbox.click();
    }
  }
  extensionLog.debug(`[setScStandardFieldsState] - Set standard fields state to: ${desiredState}`);
}