// @source-path [fobles] src/content/shared/dialog/fobles-window-host-registry.ts

import type { Root } from "react-dom/client";

type HostEntry = { host: HTMLElement; root: Root };

const hostsByDoc = new WeakMap<Document, Map<string, HostEntry>>();

// Tracks the single live (host, root) pair for a given dialog id per document, so opening the
// same dialog again properly unmounts the previous React tree instead of just ripping its DOM out
// from under a React root that's still attached to it.
export function replaceFoblesWindowHost(doc: Document, id: string, host: HTMLElement, root: Root): void {
  const hosts = hostsByDoc.get(doc) ?? new Map<string, HostEntry>();
  hostsByDoc.set(doc, hosts);
  const existing = hosts.get(id);
  existing?.root.unmount();
  existing?.host.remove();
  hosts.set(id, { host, root });
}

export function clearFoblesWindowHost(doc: Document, id: string): void {
  hostsByDoc.get(doc)?.delete(id);
}
