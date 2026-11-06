import type { ActivityEvent, ActivityFilter } from "./activity.types.ts";

export function matchesActivityFilter(activity: ActivityEvent, filter: ActivityFilter): boolean {
  return (filter.requestId === undefined || activity.requestId === filter.requestId) &&
    (filter.workClass === undefined || activity.workClass === undefined || activity.workClass === filter.workClass);
}