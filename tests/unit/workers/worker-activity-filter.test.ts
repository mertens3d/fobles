import assert from "node:assert/strict";
import { test } from "node:test";
import { matchesActivityFilter } from "../../../src/content/shared/activity/activity-filter.ts";
import { WORK_SCHEDULING } from "../../../src/content/foundation/workers/work-scheduling.const.ts";
import type { ActivityEvent } from "../../../src/content/shared/activity/activity.types.ts";

const activity: ActivityEvent = {
  activityId: "same-task-id", kind: "get-children", label: "Reading Children", source: "worker",
  state: "started", timestamp: 0, requestId: "foreground-request", workClass: WORK_SCHEDULING.FOREGROUND,
};

void test("foreground activity filter excludes background and isolates explicit request identity", () => {
  const filter = { requestId: "foreground-request", workClass: WORK_SCHEDULING.FOREGROUND };
  assert.equal(matchesActivityFilter(activity, filter), true);
  assert.equal(matchesActivityFilter({ ...activity, workClass: WORK_SCHEDULING.BACKGROUND }, filter), false);
  assert.equal(matchesActivityFilter({ ...activity, requestId: "other-request" }, filter), false);
  assert.equal(matchesActivityFilter({ ...activity, requestId: undefined }, filter), false);
  assert.equal(matchesActivityFilter({ ...activity, workClass: undefined }, filter), true);
  assert.equal(matchesActivityFilter({ ...activity, workClass: WORK_SCHEDULING.BACKGROUND }, {}), true);
});