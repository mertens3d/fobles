/// <reference types="chrome" />

import { extensionLog } from "./logger";
import { startToolbarRuntime } from "./content/toolbar-runtime";

extensionLog.info("Content script loaded. Press Ctrl+Shift+E to toggle.");
startToolbarRuntime();
