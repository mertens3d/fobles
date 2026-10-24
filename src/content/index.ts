/// <reference types="chrome" />

import { extensionLog } from "./logger";
import { receiveActivityMessage } from "./shared/activity/activity-events";
import { registerWorkerTabHandler } from "./sitecore-worker/transport/worker-tab-handler";
import { executeWorkerTask } from "./sitecore-harvester/worker-task-executor";
import { startToolbarRuntime } from "./toolbar-runtime";

extensionLog.info("Content script loaded. Press Ctrl+Shift+E to toggle.");
chrome.runtime.onMessage.addListener((message: unknown) => { receiveActivityMessage(message); });
registerWorkerTabHandler(executeWorkerTask);
startToolbarRuntime();
