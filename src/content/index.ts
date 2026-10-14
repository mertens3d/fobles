// @source-path [fobles] src/content/index.ts

/// <reference types="chrome" />

import { extensionLog } from "./logger";
import { registerWorkerTabHandler } from "./sitecore-harvester/background-tab/worker-tab-handler";
import { startToolbarRuntime } from "./toolbar-runtime";

extensionLog.info("Content script loaded. Press Ctrl+Shift+E to toggle.");
registerWorkerTabHandler();
startToolbarRuntime();
