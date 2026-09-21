import {
  type AllowedPage,
  DEFAULT_TOOLBAR_PLACEMENT,
  SELECTORS,
  TOOLBAR_CORNERS,
} from "./constants";
import { MESSAGE, STORAGE } from "../shared/constants";
import type { ToolbarPlacement } from "./toolbar.types";
import { extensionLog, setExtensionDebugEnabled } from "./logger";
import { getDebugSettings } from "../shared/debug-settings";
import { getPlacementForPage, setPlacementForPage } from "./toolbar-placement";
import { getFoblesNavVisible } from "../shared/nav-settings";
import { getFoblesState, setFoblesState as setPersistedFoblesState } from "./state";
import type { MessageRequest } from "./content.types";
import {
  findAllowedPage,
  isKickUsersPath,
} from "./guard";
import { resumeKickAllUsers } from "./features/quick-menu";
import {
  injectToolbar,
  setToolbarPlacement,
  setToolbarVisible,
  type ToolbarContext,
} from "./toolbar";
import { applyPowerShellIseTabIdentity } from "./ise-tab-title";
import { toggleLightningBolt } from "./feature-toggle";

let foblesUiActive = false;
let foblesNavPlacement: ToolbarPlacement = DEFAULT_TOOLBAR_PLACEMENT;
let foblesNavVisible = true;
let pageEligible = false;
let currentAllowedPage: AllowedPage | null = null;
let toggleMessagesListening = false;

function getToolbarContext(): ToolbarContext {
  return {
    doc: document,
    win: window,
    placement: foblesNavPlacement,
    setPlacement: (placement) => {
      foblesNavPlacement = placement;
      if (currentAllowedPage) void setPlacementForPage(currentAllowedPage.id, placement);
    },
    setVisible: (visible) => {
      foblesNavVisible = visible;
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

    const change = changes[STORAGE.KEY.FOBLES_NAV_VISIBLE];
    if (typeof change?.newValue === "boolean") {
      setToolbarVisible(getToolbarContext(), change.newValue);
    }

    if (!currentAllowedPage) return;
    const positionKey = `${STORAGE.KEY.FOBLES_NAV_POSITION}_${currentAllowedPage.id}`;
    const positionChange = changes[positionKey];
    const placement = positionChange?.newValue as ToolbarPlacement | undefined;
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

  const allowedPage = findAllowedPage(window.location);
  currentAllowedPage = allowedPage;
  pageEligible = allowedPage !== null;
  const currentUrl = new URL(window.location.href);
  const kickUsersPath = isKickUsersPath(window.location.pathname);

  extensionLog.debug("Fobles menu eligibility decision", {
    href: currentUrl.href,
    host: currentUrl.host,
    pathname: window.location.pathname,
    matchedPage: allowedPage,
    pageEligible,
    kickUsersPath,
    debugLogging: debug.debugLogging,
    existingToolbar: Boolean(document.querySelector(SELECTORS.TOOLBAR_CONTAINER)),
    existingMenuTrigger: Boolean(document.querySelector(SELECTORS.QUICK_MENU_TRIGGER)),
  });

  if (!allowedPage) {
    extensionLog.debug("Fobles menu not shown: page is not eligible", {
      href: currentUrl.href,
    });
    document.querySelector(SELECTORS.TOOLBAR_CONTAINER)?.remove();
    return;
  }

  applyPowerShellIseTabIdentity();
  notifyCurrentPageReady();

  listenForToggleMessages();
  [foblesNavVisible, foblesNavPlacement] = await Promise.all([
    getFoblesNavVisible(),
    getPlacementForPage(allowedPage.id, allowedPage.defaultPlacement),
  ]);
  const shouldInitialize = getFoblesState();

  extensionLog.debug("Fobles menu initialization decision", {
    shouldInitialize,
    kickUsersPath,
    toolbarVisible: foblesNavVisible,
    currentToolbarPlacement: foblesNavPlacement,
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

  setToolbarVisible(getToolbarContext(), foblesNavVisible);
  extensionLog.debug("Fobles menu injection result", {
    toolbar: Boolean(document.querySelector(SELECTORS.TOOLBAR_CONTAINER)),
    lboltButton: Boolean(document.querySelector(SELECTORS.TOOLBAR_LBOLT_BUTTON)),
    menuTrigger: Boolean(document.querySelector(SELECTORS.QUICK_MENU_TRIGGER)),
    foblesUiActive,
  });
}

export function startToolbarRuntime(): void {
  listenForStorageChanges();
  void reconcileCurrentPage();
}
