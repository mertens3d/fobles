// @source-path [fobles] src/content/index.ts

/// <reference types="chrome" />

import { extensionLog } from "./logger";
import { registerSitecoreHarvesterMessageHandler } from "./sitecore-harvester/sitecore-harvester-messages";
import { startToolbarRuntime } from "./toolbar-runtime";

extensionLog.info("Content script loaded. Press Ctrl+Shift+E to toggle.");
registerSitecoreHarvesterMessageHandler();
startToolbarRuntime();
