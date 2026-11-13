import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import { Window } from "happy-dom";
import type { ToolbarContext } from "../../../src/content/toolbar/toolbarcontext.types.ts";
import type { GraphButtonBundle } from "./graph-button-context.types.ts";

const require = createRequire(import.meta.url);
const toolbarModule = fileURLToPath(new URL("../../../src/content/toolbar/toolbar-buttons.tsx", import.meta.url));
const unrelatedImports = new Map([
  ["../ise-tab-title", "export function getPowerShellIseScriptTitle() {}"],
  ["../shell/shell-events", "export function publishFoblesShellCommand() {}"],
  ["../shell/utility/fobles-utility-launchers", "export function openDeveloperUtility() {}"],
  ["../../shared/nav-settings", "export function setFoblesNavVisible() {}"],
  ["./toolbar-store", "export function setToolbarStoreVisible() {}"],
]);
const bundled = await build({
  stdin: {
    contents: `export { GraphButton } from "./src/content/toolbar/toolbar-buttons.tsx";
      export { ICONS, TEXT } from "./src/constants/fobles-b.const.ts";`,
    resolveDir: fileURLToPath(new URL("../../../", import.meta.url)),
  },
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
  jsx: "automatic",
  plugins: [{
    name: "graph-button-context-dependencies",
    setup(builder) {
      builder.onResolve({ filter: /^react(?:\/.*)?$/ }, (args) => ({
        path: pathToFileURL(require.resolve(args.path)).href, external: true,
      }));
      builder.onResolve({ filter: /^\./ }, (args) => {
        let result;
        if (args.importer === toolbarModule && unrelatedImports.has(args.path)) {
          result = { path: args.path, namespace: "graph-button-context" };
        }
        return result;
      });
      builder.onLoad({ filter: /./, namespace: "graph-button-context" }, (args) => ({
        contents: unrelatedImports.get(args.path),
      }));
    },
  }],
});

let moduleId = 0;

export async function loadGraphButton(): Promise<GraphButtonBundle> {
  moduleId += 1;
  return await import(
    `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}#${moduleId}`
  ) as GraphButtonBundle;
}

export function createGraphButtonEnvironment(getURL: (path: string) => string) {
  const win = new Window();
  const globals = {
    chrome: { runtime: { getURL } },
    document: win.document,
    IS_REACT_ACT_ENVIRONMENT: true,
    window: win,
  };
  const descriptors = new Map(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, key, { configurable: true, value });
  }
  const container = win.document.createElement("div");
  win.document.body.append(container);
  const errors: unknown[] = [];
  win.addEventListener("error", (event) => {
    const errorEvent = event as unknown as ErrorEvent;
    errors.push(errorEvent.error ?? errorEvent.message);
  });
  win.addEventListener("unhandledrejection", (event) => errors.push((event as unknown as PromiseRejectionEvent).reason));
  const context: ToolbarContext = {
    doc: win.document as unknown as Document,
    win: win as unknown as globalThis.Window,
    placement: { corner: "upper-left", offsetX: 0, offsetY: 0 },
    setPlacement: () => {},
    setVisible: () => {},
    onToggleFeatures: () => {},
  };

  async function close(): Promise<void> {
    try {
      await win.happyDOM.close();
    } finally {
      for (const [key, descriptor] of descriptors) {
        if (descriptor) {
          Object.defineProperty(globalThis, key, descriptor);
        } else {
          Reflect.deleteProperty(globalThis, key);
        }
      }
    }
  }

  return { close, container: container as unknown as HTMLDivElement, context, errors };
}