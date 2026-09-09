import { SITECORE, STORAGE } from "../../extension/constants";
import { extensionLog } from "../../extension/logger";

const KICK_ALL_USERS_WAIT_MS = 1_000;
const KICK_ALL_USERS_MAX_BUTTON_RETRIES = 5;

const getKickUsersUrl = (doc: Document): string => {
  const origin = doc.defaultView?.location.origin ?? window.location.origin;
  return `${origin}${SITECORE.KICK_USERS_PATH}`;
};

const findKickButton = (doc: Document): HTMLButtonElement | null =>
  Array.from(doc.querySelectorAll<HTMLButtonElement>("button")).find(
    (button) => button.textContent?.trim().toLowerCase() === "kick off user",
  ) ?? null;

const waitForKickUserRows = (doc: Document): Promise<HTMLTableRowElement[]> =>
  new Promise((resolve) => {
    const readRows = (): HTMLTableRowElement[] =>
      Array.from(
        doc.querySelectorAll<HTMLTableRowElement>(
          ".sc-listcontrol-body tbody tr",
        ),
      );
    const startedAt = Date.now();
    const poll = (): void => {
      const rows = readRows();
      if (rows.length > 0 || Date.now() - startedAt >= 15_000) {
        resolve(rows);
        return;
      }
      window.setTimeout(poll, 250);
    };
    poll();
  });

const processKickAllUsers = async (doc: Document): Promise<void> => {
  if (localStorage.getItem(STORAGE.KEY.KICK_ALL_USERS) !== "1") return;

  const rows = await waitForKickUserRows(doc);
  extensionLog.info("Kick All Users observed rows", { rowCount: rows.length });
  if (rows.length === 0) {
    extensionLog.warn("Kick All Users found no user rows; keeping workflow active");
    window.setTimeout(() => {
      void processKickAllUsers(doc);
    }, KICK_ALL_USERS_WAIT_MS);
    return;
  }

  if (rows.length === 1) {
    localStorage.removeItem(STORAGE.KEY.KICK_ALL_USERS);
    localStorage.removeItem(`${STORAGE.KEY.KICK_ALL_USERS}_button_retries`);
    extensionLog.info("Kick All Users complete", { remainingRows: rows.length });
    return;
  }

  const row = rows[0];
  extensionLog.info("Kick All Users row object before selection", row);
  extensionLog.info("Kick All Users selecting row", {
    user: row.cells.item(0)?.textContent?.trim() ?? "unknown user",
    className: row.className,
    attributes: Array.from(row.attributes).map((attribute) => ({
      name: attribute.name,
      value: attribute.value,
    })),
    outerHtml: row.outerHTML.slice(0, 1_000),
  });

  const userCell = row.cells.item(0);
  if (!userCell) {
    extensionLog.warn("Kick All Users row has no user-name cell");
    return;
  }
  extensionLog.info("Kick All Users user cell object before selection", userCell);
  userCell.click();
  await new Promise((resolve) =>
    window.setTimeout(resolve, KICK_ALL_USERS_WAIT_MS),
  );
  extensionLog.info("Kick All Users user cell object after selection", userCell);
  extensionLog.info("Kick All Users row object after selection", row);
  extensionLog.info("Kick All Users selected row state", {
    user: row.cells.item(0)?.textContent?.trim() ?? "unknown user",
    className: row.className,
    attributes: Array.from(row.attributes).map((attribute) => ({
      name: attribute.name,
      value: attribute.value,
    })),
    outerHtml: row.outerHTML.slice(0, 1_000),
  });

  const kickButton = findKickButton(doc);
  if (!kickButton) {
    const retryKey = `${STORAGE.KEY.KICK_ALL_USERS}_button_retries`;
    const retries = Number(localStorage.getItem(retryKey) ?? "0") + 1;
    localStorage.setItem(retryKey, String(retries));
    extensionLog.warn("Kick All Users could not find Kick off user button", {
      retries,
      maxRetries: KICK_ALL_USERS_MAX_BUTTON_RETRIES,
    });
    if (retries >= KICK_ALL_USERS_MAX_BUTTON_RETRIES) {
      localStorage.removeItem(STORAGE.KEY.KICK_ALL_USERS);
      localStorage.removeItem(retryKey);
      extensionLog.error("Kick All Users stopped after repeated missing buttons");
      return;
    }
    window.setTimeout(() => {
      void processKickAllUsers(doc);
    }, KICK_ALL_USERS_WAIT_MS);
    return;
  }

  extensionLog.info("Kick All Users button state", {
    disabledProperty: kickButton.disabled,
    disabledAttribute: kickButton.getAttribute("disabled"),
    className: kickButton.className,
    dataScClick: kickButton.getAttribute("data-sc-click"),
    outerHtml: kickButton.outerHTML.slice(0, 500),
  });
  extensionLog.info("Kick All Users button object before confirmation", kickButton);

  if (kickButton.disabled) {
    const retryKey = `${STORAGE.KEY.KICK_ALL_USERS}_button_retries`;
    const retries = Number(localStorage.getItem(retryKey) ?? "0") + 1;
    localStorage.setItem(retryKey, String(retries));
    extensionLog.warn("Kick All Users button is disabled; waiting", {
      retries,
      maxRetries: KICK_ALL_USERS_MAX_BUTTON_RETRIES,
    });
    if (retries >= KICK_ALL_USERS_MAX_BUTTON_RETRIES) {
      localStorage.removeItem(STORAGE.KEY.KICK_ALL_USERS);
      localStorage.removeItem(retryKey);
      extensionLog.error("Kick All Users stopped after repeated disabled buttons");
      return;
    }
    window.setTimeout(() => {
      void processKickAllUsers(doc);
    }, KICK_ALL_USERS_WAIT_MS);
    return;
  }

  const retryKey = `${STORAGE.KEY.KICK_ALL_USERS}_button_retries`;
  localStorage.removeItem(retryKey);
  const userName = row.cells.item(0)?.textContent?.trim() ?? "unknown user";
  extensionLog.info("Kick All Users about to ask for confirmation", {
    user: userName,
    remainingRows: rows.length,
  });
  if (!window.confirm(`Kick off Sitecore user "${userName}"?`)) {
    localStorage.removeItem(STORAGE.KEY.KICK_ALL_USERS);
    extensionLog.info("Kick All Users cancelled", { user: userName });
    return;
  }

  extensionLog.info("Kick All Users clicking button", {
    user: userName,
    disabledProperty: kickButton.disabled,
    disabledAttribute: kickButton.getAttribute("disabled"),
    outerHtml: kickButton.outerHTML.slice(0, 500),
  });
  extensionLog.info("Kick All Users kicking row", {
    user: userName,
    remainingRows: rows.length,
  });
  kickButton.click();
  window.setTimeout(() => {
    if (localStorage.getItem(STORAGE.KEY.KICK_ALL_USERS) === "1") {
      window.location.assign(getKickUsersUrl(doc));
    }
  }, KICK_ALL_USERS_WAIT_MS * 2);
};

export const kickAllUsers = (doc: Document): void => {
  localStorage.setItem(STORAGE.KEY.KICK_ALL_USERS, "1");
  const kickUsersUrl = getKickUsersUrl(doc);
  extensionLog.info("Kick All Users opening worker tab", { url: kickUsersUrl });
  window.open(kickUsersUrl, "_blank", "noopener,noreferrer");
};

export function resumeKickAllUsers(doc: Document): void {
  const path = new URL(
    doc.defaultView?.location.href ?? window.location.href,
  ).pathname;
  if (path.toLowerCase() === SITECORE.KICK_USERS_PATH.toLowerCase()) {
    void processKickAllUsers(doc);
  }
}
