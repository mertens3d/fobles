// @source-path [fobles] src/content/index.ts

/// <reference types="chrome" />

import { extensionLog } from "./logger";
import { registerWorkerTabHandler } from "./sitecore-worker/transport/worker-tab-handler";
import { executeWorkerTask } from "./sitecore-harvester/worker-task-executor";
import { startToolbarRuntime } from "./toolbar-runtime";

extensionLog.info("Content script loaded. Press Ctrl+Shift+E to toggle.");
registerWorkerTabHandler(executeWorkerTask);
startToolbarRuntime();
