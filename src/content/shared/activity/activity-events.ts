import { ACTIVITY } from "./activity.const";
import { matchesActivityFilter } from "./activity-filter";
import type { ActivityEvent, ActivityFilter, ActivityListener, ActivityMessage } from "./activity.types";

export type { ActivityEvent, ActivityFilter, ActivityMessage, ActivityState } from "./activity.types";

export const ACTIVITY_MESSAGE_TYPE = ACTIVITY.MESSAGE_TYPE;

const listeners = new Set<ActivityListener>();

export function emitActivity(event: Omit<ActivityEvent, "timestamp">): void {
  const activity = { ...event, timestamp: Date.now() };
  listeners.forEach((listener) => listener(activity));
}

export function publishActivityToHost(hostTabId: number | undefined, event: Omit<ActivityEvent, "timestamp">): void {
  if (hostTabId === undefined) {
    return;
  }
  const message: ActivityMessage = { type: ACTIVITY_MESSAGE_TYPE, activity: { ...event, timestamp: Date.now() } };
  void chrome.tabs.sendMessage(hostTabId, message).catch(() => undefined);
}

export function receiveActivityMessage(message: unknown): boolean {
  if (!message || typeof message !== "object") {
    return false;
  }
  const candidate = message as Partial<ActivityMessage>;
  const activity = candidate.activity;
  if (candidate.type !== ACTIVITY_MESSAGE_TYPE || !activity) {
    return false;
  }
  listeners.forEach((listener) => listener(activity));
  return true;
}

export function subscribeActivity(listener: ActivityListener, filter: ActivityFilter = {}): () => void {
  const filteredListener: ActivityListener = (activity) => {
    if (matchesActivityFilter(activity, filter)) {
      listener(activity);
    }
  };
  listeners.add(filteredListener);
  return () => listeners.delete(filteredListener);
}
