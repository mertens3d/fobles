import { SITECORE } from "../../sitecore";
import {
  getFoblesNavWarningVisible,
  getTurnOffFoblesAfterNavigation,
  setFoblesNavWarningVisible,
} from "../../storage";
import { FOBLES } from "./constants";
import { attachFoblesTooltip, hideFoblesTooltip } from "./shared/fobles-tooltip";
import { isGuidLike, stripGuidBraces } from "./shared/guid";

type ConfirmationState = {
  dialog: HTMLDialogElement;
  setting: HTMLInputElement;
  resolve?: (confirmed: boolean) => void;
};

const confirmationStates = new WeakMap<Document, ConfirmationState>();
let afterNavigationHandler: (() => void) | null = null;

export function setAfterFoblesNavigationHandler(
  handler: (() => void) | null,
): void {
  afterNavigationHandler = handler;
}

const turnOffFoblesAfterNavigation = async (): Promise<void> => {
  if (await getTurnOffFoblesAfterNavigation()) {
    afterNavigationHandler?.();
  }
};

const getOrCreateConfirmation = (doc: Document): ConfirmationState => {
  const existing = confirmationStates.get(doc);
  if (existing?.dialog.isConnected) return existing;

  const dialog = doc.createElement("dialog");
  dialog.className = FOBLES.CLASSES.DIALOG.BASE;

  const title = doc.createElement("h2");
  title.textContent = FOBLES.TEXT.CONFIRM.TITLE;
  const message = doc.createElement("p");
  message.textContent = FOBLES.TEXT.CONFIRM.MESSAGE;
  const settingLabel = doc.createElement("label");
  settingLabel.className = FOBLES.CLASSES.DIALOG.SETTING;
  const setting = doc.createElement("input");
  setting.type = "checkbox";
  const settingText = doc.createElement("span");
  settingText.textContent = FOBLES.TEXT.CONFIRM.SETTING;
  settingLabel.append(setting, settingText);

  const actions = doc.createElement("div");
  actions.className = FOBLES.CLASSES.DIALOG.ACTIONS;
  const cancel = doc.createElement("button");
  cancel.type = "button";
  cancel.className = FOBLES.CLASSES.DIALOG.CANCEL;
  cancel.textContent = FOBLES.TEXT.CONFIRM.CANCEL;
  const proceed = doc.createElement("button");
  proceed.type = "button";
  proceed.className = FOBLES.CLASSES.DIALOG.CONTINUE;
  proceed.textContent = FOBLES.TEXT.CONFIRM.CONTINUE;
  actions.append(cancel, proceed);
  dialog.append(title, message, settingLabel, actions);
  doc.body.appendChild(dialog);

  const state: ConfirmationState = { dialog, setting };
  const finish = (confirmed: boolean): void => {
    if (!state.resolve) return;
    const resolve = state.resolve;
    state.resolve = undefined;
    dialog.close();
    resolve(confirmed);
  };
  cancel.addEventListener("click", () => finish(false));
  proceed.addEventListener("click", () => {
    void setFoblesNavWarningVisible(setting.checked);
    finish(true);
  });
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    finish(false);
  });
  confirmationStates.set(doc, state);
  return state;
};

const confirmSameTabNavigation = async (doc: Document): Promise<boolean> => {
  const warningVisible = await getFoblesNavWarningVisible();
  if (!warningVisible) return true;

  const state = getOrCreateConfirmation(doc);
  if (state.dialog.open) {
    state.dialog.close();
    state.resolve?.(false);
  }
  state.setting.checked = warningVisible;
  return new Promise<boolean>((resolve) => {
    state.resolve = resolve;
    state.dialog.showModal();
  });
};

const opensContentEditor = (url: string, view: Window): boolean => {
  try {
    const target = new URL(url, view.location.href);
    return decodeURIComponent(target.pathname).toLowerCase() ===
      SITECORE.RELATIVE_PATHS.CONTENT_EDITOR.toLowerCase();
  } catch {
    return false;
  }
};

export function ensurePathShape(
  value: string,
  kind: "sitecore" | "content" | "media" | "template" = "sitecore",
): string {
  const decoded = value.includes("%20") ? decodeURIComponent(value) : value;
  const trimmed = decoded.trim();
  const withoutLeadingSlash = trimmed.replace(/^\/+/, "");

  if (!withoutLeadingSlash) {
    if (kind === "media") {
      return "/sitecore/media library/";
    }

    if (kind === "template") {
      return "/sitecore/";
    }

    return "/sitecore/content/";
  }

  const lowered = withoutLeadingSlash.toLowerCase();

  if (kind === "media") {
    if (
      lowered.startsWith("sitecore/media library/") ||
      lowered.startsWith("media library/")
    ) {
      return `/${withoutLeadingSlash}`;
    }

    return `/sitecore/media library/${withoutLeadingSlash}`;
  }

  if (kind === "template") {
    if (lowered.startsWith("sitecore/")) {
      return `/${withoutLeadingSlash}`;
    }

    return `/sitecore/${withoutLeadingSlash}`;
  }

  if (lowered.startsWith("sitecore/")) {
    return `/${withoutLeadingSlash}`;
  }

  if (lowered.startsWith("content/")) {
    return `/sitecore/${withoutLeadingSlash}`;
  }

  return `/sitecore/content/${withoutLeadingSlash}`;
}

export function normalizeFoblesValue(raw: string): string {
  if (!raw) return raw;

  if (isGuidLike(raw)) {
    return stripGuidBraces(raw);
  }

  const decoded = raw.includes("%20") ? decodeURIComponent(raw) : raw;
  const trimmed = decoded.trim();
  const withoutLeadingSlash = trimmed.replace(/^\/+/, "");

  if (!withoutLeadingSlash) {
    return "/sitecore/content/";
  }

  const lowered = withoutLeadingSlash.toLowerCase();

  if (lowered.startsWith("sitecore/media library/") || lowered.startsWith("media library/")) {
    return `/${withoutLeadingSlash}`;
  }

  if (lowered.startsWith("sitecore/")) {
    return `/${withoutLeadingSlash}`;
  }

  if (lowered.startsWith("content/")) {
    return `/sitecore/${withoutLeadingSlash}`;
  }

  return `/sitecore/${withoutLeadingSlash}`;
}

export function buildFoblesUrl(fo: string): string {
  const normalizedFo = normalizeFoblesValue(fo);
  const host = location.hostname;
  const protocol = window.location.protocol;
  return `${protocol}//${host}${SITECORE.RELATIVE_PATHS.CONTENT_EDITOR}?sc_bw=1&fo=${encodeURI(normalizedFo)}`;
}

export function createFoblesButton(
  doc: Document,
  label: string,
  url: string | (() => string),
  options?: {
    attrName?: string;
    attrValue?: string;
    classNames?: string[];
    buttonType?: "button" | "submit" | "reset";
    style?: Record<string, string>;
  },
): HTMLButtonElement {
  const button = doc.createElement("button");
  button.type = options?.buttonType ?? "button";
  button.setAttribute(FOBLES.ATTRIBUTES.BUTTON, "1");

  if (options?.attrName && options.attrValue !== undefined) {
    button.setAttribute(options.attrName, options.attrValue);
  }

  button.textContent = label;
  attachFoblesTooltip(button);

  if (options?.classNames?.length) {
    button.classList.add(...options.classNames);
  }

  if (options?.style) {
    Object.entries(options.style).forEach(([property, value]) => {
      button.style.setProperty(property, value);
    });
  }

  button.onclick = (event) => {
    const resolvedUrl = typeof url === "function" ? url() : url;
    void openFoblesUrl(resolvedUrl, event);
  };

  return button;
}

export async function openFoblesUrl(url: string, event?: MouseEvent): Promise<void> {
  const shouldOpenNewTab = !!event && (event.ctrlKey || event.metaKey || event.button === 1);
  const source = event?.currentTarget as Node | null | undefined;
  const doc = source?.ownerDocument ?? document;
  const view = doc.defaultView ?? window;
  const topLevelView = view.top ?? view;

  hideFoblesTooltip(doc);

  if (shouldOpenNewTab) {
    view.open(url, "_blank", "noopener,noreferrer");
    await turnOffFoblesAfterNavigation();
    return;
  }

  if (
    (!opensContentEditor(url, view) || await confirmSameTabNavigation(doc))
  ) {
    await turnOffFoblesAfterNavigation();
    try {
      topLevelView.location.assign(url);
    } catch {
      view.location.assign(url);
    }
  }
}
