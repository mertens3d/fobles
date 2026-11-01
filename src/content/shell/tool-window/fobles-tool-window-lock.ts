// @source-path [fobles] src/content/shell/tool-window/fobles-tool-window-lock.ts
const CHANNEL_NAME = "fobles-tool-window-lock";
const CLAIM_WAIT_MS = 120;
type LockMessage = { type: "claim" | "owned" | "take-over" | "release"; ownerToken: string; origin: string };
let ownedToken: string | undefined;
let activeChannel: BroadcastChannel | undefined;
let lostHandler: (() => void) | undefined;

export async function acquireFoblesToolWindowLock(ownerToken: string): Promise<boolean> {
  const channel = requireChannel();
  let ownerFound = false;
  const listener = (event: MessageEvent<LockMessage>): void => { if (event.data.type === "owned" && event.data.origin === location.origin && event.data.ownerToken !== ownerToken) ownerFound = true; };
  channel.addEventListener("message", listener);
  channel.postMessage({ type: "claim", ownerToken, origin: location.origin } satisfies LockMessage);
  await new Promise<void>((resolve) => window.setTimeout(resolve, CLAIM_WAIT_MS));
  channel.removeEventListener("message", listener);
  if (ownerFound) return false;
  ownedToken = ownerToken;
  return true;
}

export async function takeOverFoblesToolWindowLock(ownerToken: string): Promise<boolean> {
  requireChannel().postMessage({ type: "take-over", ownerToken, origin: location.origin } satisfies LockMessage);
  ownedToken = ownerToken;
  return true;
}

export async function releaseFoblesToolWindowLock(ownerToken: string): Promise<void> {
  if (ownedToken !== ownerToken) return;
  ownedToken = undefined;
  requireChannel().postMessage({ type: "release", ownerToken, origin: location.origin } satisfies LockMessage);
}

export function subscribeFoblesToolWindowLockLost(ownerToken: string, onLost: () => void): () => void {
  lostHandler = onLost;
  return () => { if (ownedToken === ownerToken) lostHandler = undefined; };
}

function requireChannel(): BroadcastChannel {
  if (activeChannel) return activeChannel;
  activeChannel = new BroadcastChannel(CHANNEL_NAME);
  activeChannel.addEventListener("message", (event: MessageEvent<LockMessage>) => {
    const message = event.data;
    if (message.origin !== location.origin) return;
    if (message.type === "claim" && ownedToken && message.ownerToken !== ownedToken) activeChannel?.postMessage({ type: "owned", ownerToken: ownedToken, origin: location.origin } satisfies LockMessage);
    if (message.type === "take-over" && ownedToken && message.ownerToken !== ownedToken) { ownedToken = undefined; lostHandler?.(); }
  });
  return activeChannel;
}
