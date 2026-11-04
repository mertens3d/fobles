// @source-path [fobles] src/content/toolbar/index.tsx

import { createRoot, type Root } from "react-dom/client";
import type { ToolbarPlacement } from "../toolbar.types";
import { ToolbarRoot } from "./toolbar-root";
import { hasToolbarStore, setToolbarContext, setToolbarStoreVisible } from "./toolbar-store";
import type { ToolbarContext } from "./types";

export type { ToolbarContext } from "./types";

const REACT_MOUNT_NOTE = "react mount";

const mountedRoots = new WeakMap<Document, Root>();

function getOrCreateMount(doc: Document): Root {
  const existing = mountedRoots.get(doc);
  if (existing) {
    return existing;
  }
  const host = doc.createElement("div");
  // A stable, otherwise-untouched React mount point; the toolbar container itself (with its
  // real class/id) is rendered as React-owned content inside it, not this host.
  host.style.display = "contents";
  host.dataset.foblesNote = REACT_MOUNT_NOTE;
  doc.body.appendChild(host);
  const root = createRoot(host);
  mountedRoots.set(doc, root);
  return root;
}

export function injectToolbar(context: ToolbarContext): void {
  const firstMount = !hasToolbarStore(context.doc);
  setToolbarContext(context.doc, context);
  if (firstMount) {
    getOrCreateMount(context.doc).render(<ToolbarRoot doc={context.doc} />);
  }
}

export function setToolbarVisible(context: ToolbarContext, visible: boolean): void {
  context.setVisible(visible);
  injectToolbar(context);
  setToolbarStoreVisible(context.doc, visible);
}

export function setToolbarPlacement(context: ToolbarContext, placement: ToolbarPlacement): void {
  context.setPlacement(placement);
  setToolbarContext(context.doc, context);
}
