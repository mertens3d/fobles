// @source-path [fobles] tests/e2e/helpers/framesHelper.ts

import type { Frame, Page } from "@playwright/test";
import { CONST } from "../CONST";

const getFrameDocument = (frame: Element): Document | null => {
  const frameElement = frame as HTMLIFrameElement | HTMLFrameElement;
  let frameDoc: Document | null;
  try {
    frameDoc = frameElement.contentDocument ?? frameElement.contentWindow?.document ?? null;
  } catch {
    frameDoc = null;
  }
  return frameDoc;
};

const getChildFrameDocuments = (
  root: ParentNode,
): Document[] =>
  Array.from(root.querySelectorAll(CONST.DOM.SELECTORS.FRAMES))
    .map((frame) => getFrameDocument(frame))
    .filter((frameDoc): frameDoc is Document => frameDoc !== null);

const forEachFrameDocument = (
  root: ParentNode,
  callback: (frameDoc: Document) => void,
): void => {
  getChildFrameDocuments(root).forEach(callback);
};

export const walkFrameDocuments = async (
  page: Page,
  callback: (frame: Frame) => Promise<void>,
): Promise<void> => {
  for (const frame of page.frames()) {
    await callback(frame);
  }
};