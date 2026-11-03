import fs from "node:fs";
import path from "node:path";
import type { BrowserContext } from "@playwright/test";

function getWindowPositionPath(workerSlot: number): string {
  return path.resolve(
    "./playwright/test-artifacts",
    `browser-window-position-${workerSlot}.json`,
  );
}

type WindowPosition = {
  left: number;
  top: number;
};

function isWindowPosition(value: unknown): value is WindowPosition {
  return (
    typeof value === "object" &&
    value !== null &&
    "left" in value &&
    typeof value.left === "number" &&
    Number.isFinite(value.left) &&
    "top" in value &&
    typeof value.top === "number" &&
    Number.isFinite(value.top)
  );
}

export async function restoreWindowPosition(
  context: BrowserContext,
  workerSlot: number,
): Promise<void> {
  const windowPositionPath = getWindowPositionPath(workerSlot);
  if (!fs.existsSync(windowPositionPath)) return;

  const saved: unknown = JSON.parse(
    fs.readFileSync(windowPositionPath, "utf8"),
  );

  if (!isWindowPosition(saved)) {
    throw new Error("Invalid saved browser window position.");
  }

  const page = context.pages()[0] ?? await context.newPage();
  const session = await context.newCDPSession(page);

  try {
    const { windowId } = await session.send("Browser.getWindowForTarget");

    await session.send("Browser.setWindowBounds", {
      windowId,
      bounds: { windowState: "normal" },
    });

    await session.send("Browser.setWindowBounds", {
      windowId,
      bounds: {
        left: saved.left,
        top: saved.top,
      },
    });
  } finally {
    await session.detach();
  }
}

export async function saveWindowPosition(
  context: BrowserContext,
  workerSlot: number,
): Promise<void> {
  const page = context.pages().find((page) => !page.isClosed());
  if (!page) return;

  const session = await context.newCDPSession(page);

  try {
    const { bounds } = await session.send("Browser.getWindowForTarget");

    if (!isWindowPosition(bounds)) return;

    const position: WindowPosition = {
      left: bounds.left,
      top: bounds.top,
    };

    const windowPositionPath = getWindowPositionPath(workerSlot);
    fs.mkdirSync(path.dirname(windowPositionPath), { recursive: true });
    fs.writeFileSync(
      windowPositionPath,
      JSON.stringify(position, null, 2),
      "utf8",
    );
  } finally {
    await session.detach();
  }
}