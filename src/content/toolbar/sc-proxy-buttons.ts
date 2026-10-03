import { ATTRIBUTE, CLASS, SELECTORS } from "../constants";
import { extensionLog } from "../logger";
import { findRibbonCheckbox, postSitecoreEvent } from "../features/augmentor/proxy-buttons-ribbon";
import { setJumpFlyoutVisible } from "./jump-flyout";

// These live in the main toolbar (not the editor header) since the editor header
// gets redrawn every time a tree item is picked.
const SC_PROXY_BUTTONS = [
  {
    checkboxId: "Check_BC29C1D329FB74DA585083FEC2AF3A81D",
    eventName: "StandardFields_Click",
    id: "sitecore-fobles-standard-fields-toggle",
    label: "Standard Fields",
  },
  {
    checkboxId: "Check_BBDED3F008D144C82A983B54F0424BBC1",
    eventName: "RawValues_Click",
    id: "sitecore-fobles-raw-values-toggle",
    label: "Raw Values",
  },
] as const;

const createProxyButton = (
  doc: Document,
  option: (typeof SC_PROXY_BUTTONS)[number],
): HTMLLabelElement => {
  const wrapper = doc.createElement("label");
  wrapper.className = `${CLASS.PROXY_BUTTON} ${CLASS.FOBLES_NAV_BUTTON} ${CLASS.FOBLES_NAV_BUTTON_COMPACT}`;
  wrapper.title = option.label;

  const checkbox = doc.createElement("input");
  checkbox.type = "checkbox";
  checkbox.id = option.id;
  checkbox.className = CLASS.PROXY_BUTTON_INPUT;
  checkbox.checked = Boolean(findRibbonCheckbox(doc, option.checkboxId)?.checked);
  checkbox.setAttribute(
    ATTRIBUTE.DATA.KEY.FOBLES_NAV_OWNER,
    ATTRIBUTE.DATA.VALUE.PERSISTENT,
  );

  checkbox.addEventListener("click", () => {
    const ribbonCheckbox = findRibbonCheckbox(doc, option.checkboxId);
    extensionLog.debug("Proxy button click", {
      checkboxFound: !!ribbonCheckbox,
      checkboxId: option.checkboxId,
      checked: checkbox.checked,
      option: option.label,
    });
    if (ribbonCheckbox) {
      ribbonCheckbox.click();
      // Don't trust the browser's optimistic native toggle: reflect whatever Sitecore's
      // real checkbox actually ended up at, in case its own click handling diverges.
      checkbox.checked = ribbonCheckbox.checked;
    } else {
      const posted = postSitecoreEvent(doc, option.eventName);
      extensionLog.debug("Proxy button fallback", {
        eventName: option.eventName,
        option: option.label,
        posted,
      });
    }
  });

  const text = doc.createElement("span");
  text.className = CLASS.PROXY_BUTTON_LABEL;
  text.textContent = option.label;

  wrapper.append(checkbox, text);
  return wrapper;
};

const createProxyButtonAction = (
  doc: Document,
  option: (typeof SC_PROXY_BUTTONS)[number],
): HTMLDivElement => {
  const action = doc.createElement("div");
  action.className = CLASS.PROXY_BUTTONS_ACTION;
  action.appendChild(createProxyButton(doc, option));
  return action;
};

const createProxyButtonsPanel = (doc: Document): HTMLDivElement => {
  const panel = doc.createElement("div");
  panel.className = CLASS.PROXY_BUTTONS;
  panel.setAttribute(ATTRIBUTE.DATA.KEY.PROXY_BUTTONS, "1");

  const actions = doc.createElement("div");
  actions.className = CLASS.PROXY_BUTTONS_ACTIONS;
  SC_PROXY_BUTTONS.forEach((option) =>
    actions.appendChild(createProxyButtonAction(doc, option)),
  );
  panel.appendChild(actions);
  return panel;
};

const refreshProxyButtonsState = (doc: Document, panel: Element): void => {
  SC_PROXY_BUTTONS.forEach((option) => {
    const checkbox = panel.querySelector<HTMLInputElement>(`#${option.id}`);
    const ribbonCheckbox = findRibbonCheckbox(doc, option.checkboxId);
    if (checkbox && ribbonCheckbox) checkbox.checked = ribbonCheckbox.checked;
  });
};

const getOrCreateProxyButtonsFlyout = (doc: Document): HTMLDivElement | null => {
  const trigger = doc.querySelector(SELECTORS.PROXY_BUTTONS_TRIGGER);
  if (!trigger) return null;

  const existing = trigger.querySelector<HTMLDivElement>(SELECTORS.PROXY_BUTTONS);
  if (existing) return existing;

  const proxyFlyout = createProxyButtonsPanel(doc);
  // The panel renders outside the trigger's own hit box, so bridge the gap with a
  // close delay instead of relying on the trigger's mouseleave alone.
  proxyFlyout.addEventListener("mouseenter", cancelProxyButtonsClose);
  proxyFlyout.addEventListener("mouseleave", () => scheduleProxyFlyoutClose(doc));
  trigger.appendChild(proxyFlyout);
  doc.addEventListener("pointerdown", (event) => {
    if (!trigger.contains(event.target as Node)) {
      setProxyFlyoutVisible(doc, false);
    }
  });
  return proxyFlyout;
};

export function isProxyButtonsVisible(doc: Document): boolean {
  return doc.querySelector(SELECTORS.PROXY_BUTTONS)?.getAttribute(ATTRIBUTE.DATA.KEY.VISIBLE) === "true";
}

export function setProxyFlyoutVisible(doc: Document, visible: boolean): void {
  const panel = getOrCreateProxyButtonsFlyout(doc);
  panel?.setAttribute(ATTRIBUTE.DATA.KEY.VISIBLE, visible ? "true" : "false");
  if (!visible) proxyButtonsPinned = false;

  if (visible) {
    if (panel) refreshProxyButtonsState(doc, panel);
    setJumpFlyoutVisible(doc, false);
  }
}

let proxyButtonsPinned = false;

export function isProxyButtonsPinned(): boolean {
  return proxyButtonsPinned;
}

export function setProxyButtonsPinned(doc: Document, pinned: boolean): void {
  proxyButtonsPinned = pinned;
  if (pinned) setProxyFlyoutVisible(doc, true);
}

let proxyButtonsCloseTimer: number | null = null;

function cancelProxyButtonsClose(): void {
  if (proxyButtonsCloseTimer === null) return;
  window.clearTimeout(proxyButtonsCloseTimer);
  proxyButtonsCloseTimer = null;
}

function scheduleProxyFlyoutClose(doc: Document): void {
  if (proxyButtonsPinned) return;
  cancelProxyButtonsClose();
  proxyButtonsCloseTimer = window.setTimeout(() => {
    proxyButtonsCloseTimer = null;
    setProxyFlyoutVisible(doc, false);
  }, 250);
}

export function openProxyButtonsOnHover(doc: Document): void {
  cancelProxyButtonsClose();
  setProxyFlyoutVisible(doc, true);
}

export function scheduleCloseProxyButtonsOnHover(doc: Document): void {
  scheduleProxyFlyoutClose(doc);
}
