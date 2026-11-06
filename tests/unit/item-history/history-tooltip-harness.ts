import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import { Window } from "happy-dom";
import { act } from "react";
import type { HistoryTooltipBundle } from "./history-tooltip-test.types.ts";

const require = createRequire(import.meta.url);
const bundled = await build({
  stdin: {
    contents: `
      import { useState } from "react";
      import { HistoryTrigger } from "./src/content/toolbar/history/history-trigger.tsx";
      import { useFlyoutVisibility } from "./src/content/toolbar/shared-flyout/use-flyout-visibility.ts";
      export { probe } from "history-tooltip-probe";
      function HistoryFeature({ doc }) {
        const flyout = useFlyoutVisibility(doc.defaultView);
        return <HistoryTrigger doc={doc} historyFlyout={flyout} onOpen={flyout.show}
          onToggle={() => flyout.pinned ? flyout.hide() : flyout.setPinned(true)} />;
      }
      export function Harness({ doc, mounted }) {
        const [clicks, setClicks] = useState(0);
        return <div data-toolbar="">
          <button data-sibling="" onClick={() => setClicks(clicks + 1)}>Sibling {clicks}</button>
          {mounted && <HistoryFeature doc={doc} />}
        </div>;
      }`,
    loader: "tsx",
    resolveDir: fileURLToPath(new URL("../../../", import.meta.url)),
  },
  bundle: true, write: false, platform: "browser", format: "esm", jsx: "automatic",
  plugins: [{
    name: "history-tooltip-services",
    setup(builder) {
      builder.onResolve({ filter: /^react(?:\/.*)?$/ }, (args) => ({
        path: pathToFileURL(require.resolve(args.path)).href, external: true,
      }));
      builder.onResolve({ filter: /^history-tooltip-probe$/ }, () => ({ path: "probe", namespace: "history-tooltip" }));
      builder.onResolve({ filter: /item-history-repository\.ts$/ }, () => ({ path: "history", namespace: "history-tooltip" }));
      builder.onResolve({ filter: /known-sites-repository\.ts$/ }, () => ({ path: "sites", namespace: "history-tooltip" }));
      builder.onResolve({ filter: /structural-discovery\.ts$/ }, () => ({ path: "discovery", namespace: "history-tooltip" }));
      builder.onResolve({ filter: /(?:^|\/)logger\.ts$/ }, () => ({ path: "logger", namespace: "history-tooltip" }));
      builder.onResolve({ filter: /augmentor\/helper$/ }, () => ({ path: "navigation", namespace: "history-tooltip" }));
      builder.onLoad({ filter: /./, namespace: "history-tooltip" }, (args) => ({ contents: {
        probe: `export const probe = { items: [], logs: [], subscribers: new Set(),
          publish(items) { this.items = items; for (const listener of this.subscribers) listener(items); } };`,
        history: `import { probe } from "history-tooltip-probe";
          export async function getHistory() { return probe.items; }
          export function subscribeHistory(scope, listener) {
            probe.subscribers.add(listener); return () => probe.subscribers.delete(listener);
          }`,
        sites: `export async function readKnownSites() { return []; }
          export function subscribeKnownSites() { return () => {}; }`,
        discovery: "export async function lookupKnownSite() {}",
        logger: `import { probe } from "history-tooltip-probe";
          export const extensionLog = { error: (...args) => probe.logs.push(args) };`,
        navigation: "export async function openFoblesUrl() {}",
      }[args.path] }));
    },
  }],
});

export const tooltipHistory = await import(
  `data:text/javascript;base64,${Buffer.from(`${bundled.outputFiles[0].text}\n//# sourceURL=history-tooltip-harness.js`).toString("base64")}`
) as HistoryTooltipBundle;

export async function updateTooltip(action: () => void, delay = 0): Promise<void> {
  await act(async () => {
    action();
    if (delay) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  });
}

export function createTooltipEnvironment() {
  const win = new Window({ url: "https://history.test/sitecore/shell/" });
  win.document.body.innerHTML = '<input id="Ribbon_Database" value="master"><div id="Editors"></div>';
  const globals = {
    window: win,
    document: win.document,
    navigator: win.navigator,
    Element: win.Element,
    HTMLElement: win.HTMLElement,
    Node: win.Node,
    getComputedStyle: win.getComputedStyle.bind(win),
    requestAnimationFrame: win.requestAnimationFrame.bind(win),
    cancelAnimationFrame: win.cancelAnimationFrame.bind(win),
    IS_REACT_ACT_ENVIRONMENT: true,
  };
  const descriptors = new Map(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, key, { configurable: true, value });
  }
  const errors: unknown[] = [];
  win.addEventListener("error", (event) => {
    const errorEvent = event as unknown as ErrorEvent;
    errors.push(errorEvent.error ?? errorEvent.message);
  });
  win.addEventListener("unhandledrejection", (event) => errors.push((event as unknown as PromiseRejectionEvent).reason));
  const container = win.document.createElement("div");
  win.document.body.append(container);
  tooltipHistory.probe.items = [{
    id: "11111111-1111-4111-8111-111111111111", name: "Home", path: "/sitecore/content/Home",
    category: "Content", lastVisitedAt: 123456789,
  }];
  tooltipHistory.probe.logs.length = 0;

  async function close(): Promise<void> {
    await win.happyDOM.close();
    for (const [key, descriptor] of descriptors) {
      if (descriptor) {
        Object.defineProperty(globalThis, key, descriptor);
      } else {
        Reflect.deleteProperty(globalThis, key);
      }
    }
  }

  return { close, container: container as unknown as HTMLDivElement, doc: win.document as unknown as Document, errors, win };
}