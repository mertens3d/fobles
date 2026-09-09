import {
  ATTRIBUTE,
  CLASS,
  SELECTORS,
  SYMBOLS,
  TEXT,
  TOOLBAR_POSITIONS,
  type ToolbarPosition,
} from "./constants";
import {
  isFieldEditorDialogPath,
  isContentEditorPath,
  isPowerShellIsePath,
  isSelectRenderingDialog,
} from "./menu-path";
import {
  isQuickMenuVisible,
  openQuickMenuOnHover,
  scheduleCloseQuickMenuOnHover,
  setQuickMenuVisible,
} from "../features/quick-menu";
import {
  isProxyButtonsVisible,
  openProxyButtonsOnHover,
  scheduleCloseProxyButtonsOnHover,
  setProxyButtonsVisible,
} from "../features/proxy-buttons";

export type ToolbarContext = {
  doc: Document;
  win: Window;
  position: ToolbarPosition;
  setPosition: (position: ToolbarPosition) => void;
  setVisible: (visible: boolean) => void;
  onToggleFeatures: () => void;
};

const observedDocuments = new WeakSet<Document>();

function toggleQuickMenu(context: ToolbarContext): void {
  const nextState = !isQuickMenuVisible(context.doc);
  setQuickMenuVisible(context.doc, nextState);
}

function createQuickMenuButton(context: ToolbarContext): HTMLButtonElement {
  const button = context.doc.createElement("button");
  button.type = "button";
  button.className = CLASS.FOBLE_NAV_BUTTON;
  button.setAttribute(
    ATTRIBUTE.DATA.KEY.FOBLE_NAV_OWNER,
    ATTRIBUTE.DATA.VALUE.PERSISTENT,
  );
  button.textContent = TEXT.QUICK_MENU;
  button.title = TEXT.QUICK_MENU_TITLE;
  button.addEventListener("click", () => toggleQuickMenu(context));
  return button;
}

function toggleProxyButtons(context: ToolbarContext): void {
  setProxyButtonsVisible(context.doc, !isProxyButtonsVisible(context.doc));
}

function createProxyButtonsButton(context: ToolbarContext): HTMLButtonElement {
  const button = context.doc.createElement("button");
  button.type = "button";
  button.className = CLASS.FOBLE_NAV_BUTTON;
  button.setAttribute(
    ATTRIBUTE.DATA.KEY.FOBLE_NAV_OWNER,
    ATTRIBUTE.DATA.VALUE.PERSISTENT,
  );
  button.textContent = TEXT.VIEW;
  button.title = TEXT.VIEW_TITLE;
  button.addEventListener("click", () => toggleProxyButtons(context));
  return button;
}

function createMenuTrigger(
  context: ToolbarContext,
  button: HTMLButtonElement,
  triggerClass: string,
): HTMLDivElement {
  const trigger = context.doc.createElement("div");
  trigger.className = triggerClass;
  trigger.appendChild(button);
  return trigger;
}

function createFeatureButton(context: ToolbarContext): HTMLButtonElement {
  const button = context.doc.createElement("button");
  button.type = "button";
  button.className = CLASS.TOOLBAR_FEATURE_BUTTON;
  button.textContent = SYMBOLS.LIGHTNING;
  button.title = TEXT.TOGGLE_FEATURES;
  button.setAttribute(
    ATTRIBUTE.DATA.KEY.FOBLE_NAV_OWNER,
    ATTRIBUTE.DATA.VALUE.PERSISTENT,
  );
  button.addEventListener("click", context.onToggleFeatures);
  return button;
}

function createToolbarCloseButton(
  context: ToolbarContext,
): HTMLButtonElement {
  const button = context.doc.createElement("button");
  button.type = "button";
  button.className = CLASS.TOOLBAR_CLOSE_BUTTON;
  button.textContent = SYMBOLS.CLOSE;
  button.title = TEXT.HIDE_NAV;
  button.setAttribute("aria-label", TEXT.HIDE_NAV);
  button.addEventListener("click", () => context.setVisible(false));
  return button;
}

function createToolbarPositionButton(
  context: ToolbarContext,
): HTMLButtonElement {
  const button = context.doc.createElement("button");
  button.type = "button";
  button.className = CLASS.TOOLBAR_POSITION_BUTTON;
  button.textContent = SYMBOLS.ROTATE_CLOCKWISE;
  button.title = TEXT.MOVE_NAV;
  button.setAttribute("aria-label", TEXT.MOVE_NAV);
  button.addEventListener("click", () => {
    const currentIndex = TOOLBAR_POSITIONS.indexOf(context.position);
    const nextPosition =
      TOOLBAR_POSITIONS[(currentIndex + 1) % TOOLBAR_POSITIONS.length];
    context.setPosition(nextPosition);
  });
  return button;
}

function getPowerShellIseScriptTitle(doc: Document): string | null {
  const scriptName = doc
    .querySelector(SELECTORS.SITECORE_SCRIPT_NAME)
    ?.textContent
    ?.trim();
  return scriptName?.split(/[\\/]/).filter(Boolean).pop() ?? null;
}

export function createSetIseTabTitleButton(
  context: ToolbarContext,
): HTMLButtonElement {
  const button = context.doc.createElement("button");
  button.type = "button";
  button.className = `${CLASS.FOBLE_NAV_BUTTON} ${CLASS.TOOLBAR_SET_ISE_TITLE_BUTTON}`;
  button.textContent = TEXT.SET_ISE_TAB_TITLE;
  button.title = TEXT.SET_ISE_TAB_TITLE_TITLE;
  button.setAttribute(
    ATTRIBUTE.DATA.KEY.FOBLE_NAV_OWNER,
    ATTRIBUTE.DATA.VALUE.PERSISTENT,
  );
  button.addEventListener("click", () => {
    const title = getPowerShellIseScriptTitle(context.doc);
    if (!title) {
      context.win.alert(TEXT.SET_ISE_TAB_TITLE_ERROR);
      return;
    }

    context.doc.title = title;
  });
  return button;
}

function updateToolbarAnchor(context: ToolbarContext): void {
  const container = context.doc.querySelector<HTMLElement>(
    SELECTORS.TOOLBAR_CONTAINER,
  );
  if (!container) return;

  container.style.removeProperty("--foble-toolbar-background");
  const globalHeader = context.doc.querySelector<HTMLElement>(".sc-globalHeader");
  if (globalHeader) {
    const backgroundColor = context.win.getComputedStyle(globalHeader).backgroundColor;
    if (
      backgroundColor &&
      backgroundColor !== "transparent" &&
      backgroundColor !== "rgba(0, 0, 0, 0)"
    ) {
      container.style.setProperty("--foble-toolbar-background", backgroundColor);
    }
  }

  container.style.removeProperty("--foble-toolbar-left");
  container.style.removeProperty("--foble-toolbar-right");
  container.style.removeProperty("--foble-toolbar-top");
  if (!isContentEditorPath(context.win.location.pathname)) return;

  if (context.position === "upper-left") {
    const logo = context.doc.querySelector<HTMLElement>("#globalLogo");
    if (!logo) return;

    const left = Math.max(logo.getBoundingClientRect().right + 16, 15);
    container.style.setProperty("--foble-toolbar-left", `${left}px`);
    return;
  }

  if (context.position === "editor-header") {
    const profileCardsImage = context.doc.querySelector<HTMLElement>(
      SELECTORS.SITECORE_PROFILE_CARDS_IMAGE,
    );
    if (profileCardsImage) {
      const imageBounds = profileCardsImage.getBoundingClientRect();
      const left = Math.max(imageBounds.right + 16, 15);
      const top = Math.max(imageBounds.top - 6, 3);
      container.style.setProperty("--foble-toolbar-left", `${left}px`);
      container.style.setProperty("--foble-toolbar-top", `${top}px`);
      container.style.setProperty("--foble-toolbar-right", "auto");
      return;
    }
  }

  if (
    context.position !== "upper-right" &&
    context.position !== "editor-header"
  ) return;

  const logout = context.doc.querySelector<HTMLElement>(
    ".sc-globalHeader-loginInfo .logout",
  );
  if (!logout) return;

  const right = Math.max(
    context.win.innerWidth - logout.getBoundingClientRect().left + 16,
    15,
  );
  container.style.setProperty("--foble-toolbar-right", `${right}px`);
}

function observeToolbarAnchor(context: ToolbarContext): void {
  if (observedDocuments.has(context.doc)) return;

  context.win.addEventListener("resize", () => updateToolbarAnchor(context));
  const header = context.doc.querySelector(".sc-globalHeader");
  if (!header) return;

  const observer = new MutationObserver(() => updateToolbarAnchor(context));
  observer.observe(header, { childList: true, subtree: true });
  observedDocuments.add(context.doc);
}

export function injectToolbar(context: ToolbarContext): void {
  const host = context.doc.body;
  if (!host) return;

  let container = context.doc.querySelector(
    SELECTORS.TOOLBAR_CONTAINER,
  ) as HTMLDivElement | null;
  if (!container) {
    container = context.doc.createElement("div");
    container.className = "fobles-toolbar-container";
    container.dataset.position = context.position;
  }

  const isCompactToolbar =
    isSelectRenderingDialog(context.win.location) ||
    isFieldEditorDialogPath(context.win.location.pathname);

  if (!container.querySelector(`.${CLASS.TOOLBAR_FEATURE_BUTTON.split(" ").join(".")}`)) {
    container.appendChild(createFeatureButton(context));
  }

  if (isCompactToolbar) {
    container.querySelector(SELECTORS.QUICK_MENU_TRIGGER)?.remove();
    container.querySelector(SELECTORS.PROXY_BUTTONS_TRIGGER)?.remove();
    container.querySelector(SELECTORS.TOOLBAR_SET_ISE_TITLE_BUTTON)?.remove();
    container.querySelector(SELECTORS.TOOLBAR_CLOSE_BUTTON)?.remove();

    if (!container.querySelector(SELECTORS.TOOLBAR_POSITION_BUTTON)) {
      container.appendChild(createToolbarPositionButton(context));
    }

    if (container.parentElement !== host) host.appendChild(container);
    container.dataset.position = context.position;
    updateToolbarAnchor(context);
    return;
  }

  if (!container.querySelector(SELECTORS.QUICK_MENU_TRIGGER)) {
    const toggle = createQuickMenuButton(context);
    const trigger = createMenuTrigger(context, toggle, CLASS.QUICK_MENU_TRIGGER);
    trigger.addEventListener("mouseenter", () => openQuickMenuOnHover(context.doc));
    trigger.addEventListener("mouseleave", () => scheduleCloseQuickMenuOnHover(context.doc));
    container.appendChild(trigger);
  }

  if (!container.querySelector(SELECTORS.PROXY_BUTTONS_TRIGGER)) {
    const proxyButtons = createProxyButtonsButton(context);
    const trigger = createMenuTrigger(context, proxyButtons, CLASS.PROXY_BUTTONS_TRIGGER);
    trigger.addEventListener("mouseenter", () => openProxyButtonsOnHover(context.doc));
    trigger.addEventListener("mouseleave", () => scheduleCloseProxyButtonsOnHover(context.doc));
    container.appendChild(trigger);
  }

  const setIseTitleButton = container.querySelector(
    SELECTORS.TOOLBAR_SET_ISE_TITLE_BUTTON,
  );
  if (isPowerShellIsePath(context.win.location.pathname)) {
    if (!setIseTitleButton) container.appendChild(createSetIseTabTitleButton(context));
  } else {
    setIseTitleButton?.remove();
  }

  if (!container.querySelector(SELECTORS.TOOLBAR_CLOSE_BUTTON)) {
    container.appendChild(createToolbarCloseButton(context));
  }
  if (!container.querySelector(SELECTORS.TOOLBAR_POSITION_BUTTON)) {
    container.appendChild(createToolbarPositionButton(context));
  }

  if (container.parentElement !== host) host.appendChild(container);
  container.dataset.position = context.position;
  updateToolbarAnchor(context);
  observeToolbarAnchor(context);
  setQuickMenuVisible(context.doc, false);
  setProxyButtonsVisible(context.doc, false);
}

export function setToolbarVisible(
  context: ToolbarContext,
  visible: boolean,
): void {
  context.setVisible(visible);
  if (visible) {
    injectToolbar(context);
    return;
  }

  setQuickMenuVisible(context.doc, false);
  setProxyButtonsVisible(context.doc, false);
  context.doc.querySelector(SELECTORS.TOOLBAR_CONTAINER)?.remove();
}

export function setToolbarPosition(
  context: ToolbarContext,
  position: ToolbarPosition,
): void {
  context.setPosition(position);
  const container = context.doc.querySelector<HTMLElement>(
    SELECTORS.TOOLBAR_CONTAINER,
  );
  if (container) {
    container.dataset.position = position;
    updateToolbarAnchor({ ...context, position });
  }
}
