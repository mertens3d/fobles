/// <reference types="chrome" />

import { extensionLog } from "./logger";
import { startToolbarRuntime } from "./toolbar-runtime";

extensionLog.info("Content script loaded. Press Ctrl+Shift+E to toggle.");
startToolbarRuntime();
