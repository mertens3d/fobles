// @source-path [fobles] src/content/shell/utility/fobles-utility-store.ts

import { useSyncExternalStore } from "react";
import type { UtilityStore, MountedFoblesUtility } from "./UtilityStore";

const stores = new WeakMap<Document, UtilityStore>();

function getStore(doc: Document): UtilityStore {
  const existing = stores.get(doc);
  if (existing) {
    return existing;
  }
  const created: UtilityStore = { utilities: [], listeners: new Set() };
  stores.set(doc, created);
  return created;
}

function notify(store: UtilityStore): void {
  store.listeners.forEach((listener) => listener());
}

export function mountFoblesUtility(doc: Document, utility: MountedFoblesUtility): void {
  const store = getStore(doc);
  store.utilities = [...store.utilities.filter((candidate) => candidate.id !== utility.id), utility];
  notify(store);
}

export function unmountFoblesUtility(doc: Document, id: string): void {
  const store = getStore(doc);
  const utilities = store.utilities.filter((utility) => utility.id !== id);
  if (utilities.length !== store.utilities.length) {
    store.utilities = utilities;
    notify(store);
  }
}

export function useFoblesUtilities(doc: Document): readonly MountedFoblesUtility[] {
  const store = getStore(doc);
  return useSyncExternalStore(
    (listener) => {
      store.listeners.add(listener);
      return () => store.listeners.delete(listener);
    },
    () => store.utilities,
  );
}
