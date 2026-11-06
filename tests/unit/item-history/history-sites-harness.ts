import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import { Window } from "happy-dom";
import { act } from "react";
import { ITEM_HISTORY_CAPTURE } from "../../../src/content/item-history/item-history.const.ts";
import { ITEM_ID, MASTER } from "./history-sites-test.const.ts";
import type { HistorySitesBundle, HistoryStorageListener } from "./history-sites-test.types.ts";

const require = createRequire(import.meta.url);
const bundled = await build({
  stdin: {
    contents: `export { startItemHistoryManager } from "./src/content/item-history/item-history-manager.ts";
      export { HistoryTrigger } from "./src/content/toolbar/history/history-trigger.tsx";
      export { useHistoryKnownSites } from "./src/content/toolbar/history/use-history-known-sites.ts";
      export { discovery } from "history-discovery-probe";`,
    resolveDir: fileURLToPath(new URL("../../../", import.meta.url)),
  },
  bundle: true, write: false, platform: "node", format: "esm", jsx: "automatic",
  plugins: [{
    name: "history-sites-dependencies",
    setup(builder) {
      builder.onResolve({ filter: /^react(?:\/.*)?$/ }, (args) => ({
        path: pathToFileURL(require.resolve(args.path)).href, external: true,
      }));
      builder.onResolve({ filter: /structural-discovery\.ts$|^history-discovery-probe$/ }, () => ({
        path: "discovery", namespace: "history-test",
      }));
      builder.onResolve({ filter: /augmentor\/helper$/ }, () => ({ path: "navigation", namespace: "history-test" }));
      builder.onResolve({ filter: /use-history-tooltip\.ts$/ }, () => ({ path: "tooltip", namespace: "history-test" }));
      builder.onLoad({ filter: /./, namespace: "history-test" }, (args) => ({
        contents: args.path === "discovery" ? `
          export const discovery = { error: false, validations: [], visits: [] };
          export function scheduleStructuralDiscovery(scope, visits) {
            if (discovery.error) throw new Error("Discovery unavailable");
            discovery.visits.push({ scope, visits });
          }
          export function lookupKnownSite(scope, path) {
            discovery.validations.push({ scope, path });
            return discovery.error ? Promise.reject(new Error("Validation unavailable")) : new Promise(() => {});
          }` : args.path === "navigation" ? "export async function openFoblesUrl() {}" :
          "export function useHistoryTooltip() { return undefined; }",
      }));
    },
  }],
});

export const history = await import(
  `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`
) as HistorySitesBundle;

export function editorMarkup(): string {
  return `<input id="Ribbon_Database" value="master"><div id="Editors"><table class="scEditorQuickInfo"><tbody>
    <tr><td>Item ID:</td><td><input class="scEditorHeaderQuickInfoInput" readonly value="${ITEM_ID}"></td></tr>
    <tr><td>Item path:</td><td><input class="scEditorHeaderQuickInfoInput" readonly value="/sitecore/content/Alpha/Home"></td></tr>
    <tr><td>Item name:</td><td><span>Home</span></td></tr>
    </tbody></table></div>`;
}

export async function update(action: () => void, observe = false): Promise<void> {
  await act(async () => {
    action();
    if (observe) {
      await new Promise((resolve) => setTimeout(resolve, ITEM_HISTORY_CAPTURE.DEBOUNCE_MS + 50));
    }
    await Promise.resolve();
  });
}

export function createHistoryEnvironment() {
  const win = new Window({ url: `${MASTER.origin}/sitecore/shell/` });
  win.document.body.innerHTML = editorMarkup();
  const values: Record<string, unknown> = {};
  const listeners = new Set<HistoryStorageListener>();
  const messages: unknown[] = [];
  const pending = new Map<string, { resolve: (value: Record<string, unknown>) => void; reject: (error: Error) => void }>();
  const deferred = new Set<string>();
  const globals = { window: win, document: win.document, IS_REACT_ACT_ENVIRONMENT: true, chrome: {
    runtime: { sendMessage: (message: unknown) => {
      messages.push(message);
      return Promise.resolve({ ok: true, history: [] });
    } },
    storage: {
      local: { get: (keys: string[]) => {
        const key = keys[0];
        return deferred.has(key) ? new Promise<Record<string, unknown>>((resolve, reject) => {
          pending.set(key, { resolve, reject });
        }) : Promise.resolve({ [key]: structuredClone(values[key]) });
      } },
      sync: { get: () => Promise.resolve({}) },
      onChanged: {
        addListener: (listener: HistoryStorageListener) => listeners.add(listener),
        removeListener: (listener: HistoryStorageListener) => listeners.delete(listener),
      },
    },
  } };
  const descriptors = new Map(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, key, { configurable: true, value });
  }
  history.discovery.error = false;
  history.discovery.validations.length = 0;
  history.discovery.visits.length = 0;

  function emit(key: string, value: unknown, area = "local"): void {
    values[key] = value;
    for (const listener of listeners) {
      listener({ [key]: { newValue: value } }, area);
    }
  }

  async function close(): Promise<void> {
    for (const [key, descriptor] of descriptors) {
      if (descriptor) {
        Object.defineProperty(globalThis, key, descriptor);
      } else {
        Reflect.deleteProperty(globalThis, key);
      }
    }
    await win.happyDOM.close();
  }

  return { close, deferred, doc: win.document as unknown as Document, emit, listeners, messages, pending, values, win };
}