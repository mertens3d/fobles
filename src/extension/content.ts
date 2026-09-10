import {
  MESSAGE,
  SELECTORS,
  SITECORE,
  STORAGE,
  TOOLBAR_POSITIONS,
  type ToolbarPosition,
} from "./constants";
import { extensionLog, setExtensionDebugEnabled } from "./logger";
import {
  getDebugSettings,
  getFobleNavPosition,
  getFobleNavVisible,
  getSelectRenderingFobleNavPosition,
  setFobleNavPosition,
  setFobleNavVisible,
  setSelectRenderingFobleNavPosition,
} from "./storage";
import { getFoblesState, setFoblesState as setPersistedFoblesState } from "./state";
import type { MessageRequest } from "./content.types";
import {
  isContentEditorPath,
  isFieldEditorDialogPath,
  isKickUsersPath,
  isMenuPathAllowed,
  isPowerShellIsePath,
  isSelectRenderingDialog,
} from "./menu-path";
import { clearTreeButtons, toggleTreeButtons as toggleTreeButtonsFeature } from "../features/fobles/treeNodeFobles/index";
import {
  clearFobles,
  setFobleDismissHandler,
  triggerFobles,
} from "../features/fobles";
import { setAfterFobleNavigationHandler } from "../features/fobles/helper";
import { resumeKickAllUsers } from "../features/quick-menu";
import {
  injectToolbar,
  setToolbarPosition,
  setToolbarVisible,
  type ToolbarContext,
} from "./toolbar";

let foblesUiActive = false;
let lightningBoltActive = false;
let foblesActive = false;
let treeButtonsActive = false;
let fobleNavPosition: ToolbarPosition = "upper-left";
let fobleNavVisible = true;
let pageEligible = false;
let toggleMessagesListening = false;

function getToolbarContext(): ToolbarContext {
  return {
    doc: document,
    win: window,
    position: fobleNavPosition,
    setPosition: (position) => {
      fobleNavPosition = position;
      if (isSelectRenderingDialog(window.location)) {
        void setSelectRenderingFobleNavPosition(position);
      } else {
        void setFobleNavPosition(position);
      }
    },
    setVisible: (visible) => {
      fobleNavVisible = visible;
    },
    onToggleFeatures: toggleLightningBolt,
  };
}

function setFoblesState(nextState: boolean): void {
  foblesActive = nextState;
  if (nextState) {
    triggerFobles(document);
  } else {
    clearFobles(document);
  }
}

function setTreeButtonState(nextState: boolean): void {
  treeButtonsActive = nextState;

  if (nextState) {
    toggleTreeButtonsFeature();
    return;
  }

  clearTreeButtons(document);
}

function turnOffFobles(): void {
  lightningBoltActive = false;
  setTreeButtonState(false);
  setFoblesState(false);
}

setAfterFobleNavigationHandler(turnOffFobles);
setFobleDismissHandler(() => {
  if (lightningBoltActive) turnOffFobles();
});

function toggleLightningBolt(): void {
  const nextState = !lightningBoltActive;
  lightningBoltActive = nextState;

  if (nextState) {
    setTreeButtonState(true);
    setFoblesState(true);
  } else {
    setTreeButtonState(false);
    setFoblesState(false);
  }
}

function getPowerShellIseScriptTitle(): string | null {
  const scriptName = document
    .querySelector(SELECTORS.SITECORE_SCRIPT_NAME)
    ?.textContent
    ?.trim();
  return scriptName?.split(/[\\/]/).filter(Boolean).pop() ?? null;
}

function applyPowerShellIseTabIdentity(): void {
  if (!isPowerShellIsePath(window.location.pathname) || window.top !== window) {
    return;
  }

  const scriptTitle = getPowerShellIseScriptTitle();
  if (scriptTitle) document.title = scriptTitle;
}

function notifyCurrentPageReady(): void {
  if (window.top !== window || !chrome.runtime?.sendMessage) {
    return;
  }

  void chrome.runtime.sendMessage({ action: MESSAGE.ACTION.PAGE_READY });
}

function activateFoblesUi(): void {
  if (foblesUiActive) {
    return;
  }

  extensionLog.info("Activating Fobles UI");
  setPersistedFoblesState(true);
  injectToolbar(getToolbarContext());
  foblesUiActive = true;
}

function deactivateFoblesUi(): void {
  if (!foblesUiActive) {
    return;
  }

  extensionLog.info("Deactivating Fobles UI");
  setPersistedFoblesState(false);
  injectToolbar(getToolbarContext());
  foblesUiActive = false;
}

function listenForToggleMessages(): void {
  if (toggleMessagesListening) return;
  toggleMessagesListening = true;

  chrome.runtime?.onMessage?.addListener(
    (request: MessageRequest, _sender: unknown, _sendResponse: unknown) => {
      if (request.action === MESSAGE.ACTION.TOGGLE_FOBLES) {
        if (foblesUiActive) {
          deactivateFoblesUi();
          foblesUiActive = false;
          extensionLog.info("Removed");
        } else {
          activateFoblesUi();
          foblesUiActive = true;
          extensionLog.info("Added");
        }
      }
    },
  );
}

function listenForStorageChanges(): void {
  chrome.storage?.onChanged?.addListener((changes, areaName) => {
    if (areaName !== "sync") return;

    if (
      changes[STORAGE.KEY.DEBUG_LOGGING] ||
      changes[STORAGE.KEY.SHOW_RELOAD_EXTENSION_BUTTON]
    ) {
      void reconcileCurrentPage();
    }

    if (!pageEligible) return;

    const change = changes[STORAGE.KEY.FOBLE_NAV_VISIBLE];
    if (typeof change?.newValue === "boolean") {
      setToolbarVisible(getToolbarContext(), change.newValue);
    }

    const positionKey = isSelectRenderingDialog(window.location)
      ? STORAGE.KEY.SELECT_RENDERING_FOBLE_NAV_POSITION
      : STORAGE.KEY.FOBLE_NAV_POSITION;
    const positionChange = changes[positionKey];
    if (
      typeof positionChange?.newValue === "string" &&
      TOOLBAR_POSITIONS.includes(positionChange.newValue as ToolbarPosition)
    ) {
      setToolbarPosition(
        getToolbarContext(),
        positionChange.newValue as ToolbarPosition,
      );
    }
  });
}

async function reconcileCurrentPage(): Promise<void> {
  const debug = await getDebugSettings();
  setExtensionDebugEnabled(debug.debugLogging);
  const pathAllowed = isMenuPathAllowed(window.location);
  pageEligible = pathAllowed;
  const currentUrl = new URL(window.location.href);
  const normalizedPath = (() => {
    try {
      return decodeURIComponent(window.location.pathname).toLowerCase();
    } catch {
      return window.location.pathname.toLowerCase();
    }
  })();
  const matchingMenuPath = SITECORE.MENU_PATHS.find((configuredPath) =>
    normalizedPath.includes(configuredPath.toLowerCase()),
  ) ?? null;
  const kickUsersPath = isKickUsersPath(window.location.pathname);

  extensionLog.debug("Fobles menu eligibility decision", {
    href: currentUrl.href,
    host: currentUrl.host,
    pathname: window.location.pathname,
    normalizedPath,
    matchingMenuPath,
    xmlControl: currentUrl.searchParams.get(SITECORE.XML_CONTROL_QUERY_PARAMETER),
    allowedXmlControls: SITECORE.ALLOWED_XML_CONTROLS,
    pathAllowed,
    pageEligible,
    kickUsersPath,
    debugLogging: debug.debugLogging,
    existingToolbar: Boolean(document.querySelector(SELECTORS.TOOLBAR_CONTAINER)),
    existingMenuTrigger: Boolean(document.querySelector(SELECTORS.QUICK_MENU_TRIGGER)),
  });

  if (!pageEligible) {
    extensionLog.debug("Fobles menu not shown: page is not eligible", {
      href: currentUrl.href,
      matchingMenuPath,
      allowedXmlControls: SITECORE.ALLOWED_XML_CONTROLS,
      xmlControl: currentUrl.searchParams.get(SITECORE.XML_CONTROL_QUERY_PARAMETER),
    });
    document.querySelector(SELECTORS.TOOLBAR_CONTAINER)?.remove();
    return;
  }

  applyPowerShellIseTabIdentity();
  notifyCurrentPageReady();

  listenForToggleMessages();
  const getCurrentPageToolbarPosition = isSelectRenderingDialog(window.location)
    ? getSelectRenderingFobleNavPosition
    : getFobleNavPosition;
  [fobleNavVisible, fobleNavPosition] = await Promise.all([
    getFobleNavVisible(),
    getCurrentPageToolbarPosition(),
  ]);
  const shouldInitialize = getFoblesState();

  extensionLog.debug("Fobles menu initialization decision", {
    shouldInitialize,
    kickUsersPath,
    toolbarVisible: fobleNavVisible,
    currentToolbarPosition: fobleNavPosition,
    existingToolbar: Boolean(document.querySelector(SELECTORS.TOOLBAR_CONTAINER)),
  });

  if (shouldInitialize || kickUsersPath) {
    activateFoblesUi();
  } else {
    extensionLog.debug("Fobles UI not activated: persisted state is OFF");
    setPersistedFoblesState(false);
    foblesUiActive = false;
  }

  resumeKickAllUsers(document);

  setToolbarVisible(getToolbarContext(), fobleNavVisible);
  extensionLog.debug("Fobles menu injection result", {
    toolbar: Boolean(document.querySelector(SELECTORS.TOOLBAR_CONTAINER)),
    featureButton: Boolean(document.querySelector(".foble-nav-lbolt-button")),
    menuTrigger: Boolean(document.querySelector(SELECTORS.QUICK_MENU_TRIGGER)),
    foblesUiActive,
  });
}

extensionLog.info("Content script loaded. Press Ctrl+Shift+E to toggle.");
listenForStorageChanges();
void reconcileCurrentPage();
