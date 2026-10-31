// @source-path [fobles] src/content/toolbar/toolbar-store.ts

import { useSyncExternalStore } from "react";
import type { ToolbarContext } from "./types";

type ToolbarState = { context: ToolbarContext; visible: boolean };
type StoreEntry = { state: ToolbarState; listeners: Set<() => void> };

const stores = new WeakMap<Document, StoreEntry>();

function notify(entry: StoreEntry): void {
  entry.listeners.forEach((listener) => listener());
}

export function hasToolbarStore(doc: Document): boolean {
  return stores.has(doc);
}

export function setToolbarContext(doc: Document, context: ToolbarContext): void {
  const existing = stores.get(doc);
  if (!existing) {
    stores.set(doc, { state: { context, visible: true }, listeners: new Set() });
    return;
  }
  existing.state = { ...existing.state, context };
  notify(existing);
}

export function setToolbarStoreVisible(doc: Document, visible: boolean): void {
  const entry = stores.get(doc);
  if (!entry) return;
  entry.state = { ...entry.state, visible };
  notify(entry);
}

export function useToolbarState(doc: Document): ToolbarState {
  return useSyncExternalStore(
    (listener) => {
      const entry = stores.get(doc);
      if (!entry) return () => undefined;
      entry.listeners.add(listener);
      return () => {
        entry.listeners.delete(listener);
      };
    },
    () => {
      const entry = stores.get(doc);
      if (!entry) throw new Error("Toolbar store not initialized for this document");
      return entry.state;
    },
  );
}
