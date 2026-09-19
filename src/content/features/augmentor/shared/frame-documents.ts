import { isMenuOwnedFrame } from "../../../guard";
import { FOBLES } from "../constants";

export type FrameDocumentOptions = {
  skipMenuOwned?: boolean;
};

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

// Every frame this extension walks (Content Editor, tree, ribbon) resolves its document through
// this one accessor, so cross-origin/inaccessible frames are swallowed in exactly one place.
export const getChildFrameDocuments = (
  root: ParentNode,
  options: FrameDocumentOptions = {},
): Document[] =>
  Array.from(root.querySelectorAll(FOBLES.SELECTORS.FRAMES))
    .filter((frame) => !(options.skipMenuOwned && isMenuOwnedFrame(frame as HTMLIFrameElement | HTMLFrameElement)))
    .map((frame) => getFrameDocument(frame))
    .filter((frameDoc): frameDoc is Document => frameDoc !== null);

export const forEachFrameDocument = (
  root: ParentNode,
  callback: (frameDoc: Document) => void,
  options: FrameDocumentOptions = {},
): void => {
  getChildFrameDocuments(root, options).forEach(callback);
};

export const walkFrameDocuments = (
  doc: Document,
  callback: (currentDoc: Document) => void,
  options: FrameDocumentOptions = {},
): void => {
  callback(doc);
  forEachFrameDocument(doc, (frameDoc) => walkFrameDocuments(frameDoc, callback, options), options);
};
