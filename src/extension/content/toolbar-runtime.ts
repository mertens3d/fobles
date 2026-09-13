import {
  DEFAULT_TOOLBAR_PLACEMENT,
  MESSAGE,
  SELECTORS,
  SITECORE,
  STORAGE,
  TOOLBAR_CORNERS,
  type ToolbarPlacement,
} from "../constants";
import { extensionLog, setExtensionDebugEnabled } from "../logger";
import {
  getDebugSettings,
  getFobleNavPlacement,
  getFobleNavVisible,
  getSelectRenderingFobleNavPlacement,
  setFobleNavPlacement,
  setSelectRenderingFobleNavPlacement,
} from "../storage";
import { getFoblesState, setFoblesState as setPersistedFoblesState } from "../state";
import type { MessageRequest } from "../content.types";
import {
  isKickUsersPath,
  isMenuPathAllowed,
  isSelectRenderingDialog,
} from "../menu-path";
import { resumeKickAllUsers } from "../../features/quick-menu";
import {
  injectToolbar,
  setToolbarPlacement,
  setToolbarVisible,
  type ToolbarContext,
} from "../toolbar";
import { applyPowerShellIseTabIdentity } from "./ise-tab-title";
import { toggleLightningBolt } from "./feature-toggle";

let foblesUiActive = false;
let fobleNavPlacement: ToolbarPlacement = DEFAULT_TOOLBAR_PLACEMENT;
let fobleNavVisible = true;
let pageEligible = false;
let toggleMessagesListening = false;

function getToolbarContext(): ToolbarContext {
  return {
    doc: document,
    win: window,
    placement: fobleNavPlacement,
    setPlacement: (placement) => {
      fobleNavPlacement = placement;
      if (isSelectRenderingDialog(window.location)) {
        void setSelectRenderingFobleNavPlacement(window.location.origin, placement);
      } else {
        void setFobleNavPlacement(window.location.origin, placement);
      }
    },
    setVisible: (visible) => {
      fobleNavVisible = visible;
    },
    onToggleFeatures: toggleLightningBolt,
  };
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

function notifyCurrentPageReady(): void {
  if (window.top !== window || !chrome.runtime?.sendMessage) {
    return;
  }

  void chrome.runtime.sendMessage({ action: MESSAGE.ACTION.PAGE_READY });
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
    const placementsByOrigin = positionChange?.newValue as
      | Record<string, ToolbarPlacement>
      | undefined;
    const placement = placementsByOrigin?.[window.location.origin];
    if (
      placement &&
      TOOLBAR_CORNERS.includes(placement.corner) &&
      typeof placement.offsetX === "number" &&
      typeof placement.offsetY === "number"
    ) {
      setToolbarPlacement(getToolbarContext(), placement);
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
  const getCurrentPageToolbarPlacement = isSelectRenderingDialog(window.location)
    ? getSelectRenderingFobleNavPlacement
    : getFobleNavPlacement;
  [fobleNavVisible, fobleNavPlacement] = await Promise.all([
    getFobleNavVisible(),
    getCurrentPageToolbarPlacement(window.location.origin),
  ]);
  const shouldInitialize = getFoblesState();

  extensionLog.debug("Fobles menu initialization decision", {
    shouldInitialize,
    kickUsersPath,
    toolbarVisible: fobleNavVisible,
    currentToolbarPlacement: fobleNavPlacement,
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
    featureButton: Boolean(document.querySelector(".foble-nav-feature-button")),
    menuTrigger: Boolean(document.querySelector(SELECTORS.QUICK_MENU_TRIGGER)),
    foblesUiActive,
  });
}

export function startToolbarRuntime(): void {
  listenForStorageChanges();
  void reconcileCurrentPage();
}
