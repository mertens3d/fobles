import { expect, type Page } from "../../fixtures/playwright";
import { openContentEditor } from "../../fixtures/sitecore";
import {
  getScRawValuesState,
  getScStandardFieldsState,
  setScRawValuesState,
  setScStandardFieldsState,
} from "../../macros/sitecore-macros";
import { FOBLES_YML } from "../strategies/support/yml-fobles.CONST";

const REFERENCE_GRAPH_ITEM = FOBLES_YML.CONTENT.STRATEGY_DROPLINK;

export type EditorState = {
  rawValues: boolean;
  standardFields: boolean;
};

export async function setEditorState(page: Page, state: EditorState): Promise<void> {
  await setScRawValuesState(page, state.rawValues);
  await expect.poll(async () => await getScRawValuesState(page)).toBe(state.rawValues);

  await setScStandardFieldsState(page, state.standardFields);
  await expect.poll(async () => await getScStandardFieldsState(page)).toBe(state.standardFields);
}

export async function readEditorState(page: Page): Promise<EditorState> {
  return {
    rawValues: await getScRawValuesState(page),
    standardFields: await getScStandardFieldsState(page),
  };
}

export async function reloadAndReadEditorState(page: Page): Promise<EditorState> {
  await page.reload({ waitUntil: "domcontentloaded" });
  return await readEditorState(page);
}

export async function setupReferenceGraphState(page: Page, state: EditorState): Promise<void> {
  
  await openContentEditor(page, `{${REFERENCE_GRAPH_ITEM.id.toUpperCase()}}`);
  await setEditorState(page, state);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect.poll(async () => await readEditorState(page)).toEqual(state);

  console.log(
    `[fobles] Reference Graph fixture: Strategy droplink {${REFERENCE_GRAPH_ITEM.id.toUpperCase()}}`,
  );
}