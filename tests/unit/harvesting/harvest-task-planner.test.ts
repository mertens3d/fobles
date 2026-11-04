// @source-path [fobles] tests/unit/harvesting/harvest-task-planner.test.ts

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createSetRawValuesTask,
  createSetStandardFieldsTask,
  isCollectorResultAlreadyPresent,
  isCollectorFilterKey,
  planCollectorTaskGroups,
  planCollectorTasks,
  requestedLocatorFromUrl,
} from "../../../src/content/foundation/harvesting/planner/harvest-task-planner.ts";
import { factoryItemGraphNodeData } from "../../../src/content/foundation/reference-data/model/sitecore-item.types.ts";
import type { HarvestRequest, SitecoreHarvestFiltersState, SitecoreHarvestResult } from "../../../src/content/foundation/harvesting/sitecore-harvester.types.ts";
import type { WorkerTaskType } from "../../../src/content/foundation/workers/tasks/worker-task.types.ts";

const ROOT_ID = "{25FB9977-CC90-4E3C-B036-CAFAAE676303}";
const REQUEST_URL = `https://sitecore.example/sitecore/shell/Applications/Content%20Editor.aspx?sc_bw=1&fo=${encodeURIComponent(ROOT_ID)}&sc_lang=en`;

function filters(overrides: Partial<SitecoreHarvestFiltersState> = {}): SitecoreHarvestFiltersState {
  return {
    parent: false,
    children: false,
    referrers: false,
    customFields: false,
    standardFields: false,
    layouts: false,
    template: false,
    ...overrides,
  };
}

function request(overrides: Partial<HarvestRequest> = {}): HarvestRequest {
  return {
    requestId: "request-1",
    url: REQUEST_URL,
    filters: filters(),
    ...overrides,
  };
}

function taskTypes(tasks: readonly { type: WorkerTaskType }[]): WorkerTaskType[] {
  return tasks.map((task) => task.type);
}

void test("maps every enabled collector filter to its independent task and adds Quick Info for a new root", () => {
  const planned = planCollectorTasks(request({ filters: filters({
    parent: true,
    children: true,
    referrers: true,
    customFields: true,
    standardFields: true,
    layouts: true,
  }) }));

  assert.deepEqual(taskTypes(planned), [
    "get-quick-info",
    "get-parent",
    "get-children",
    "get-referrers",
    "get-custom-fields",
    "get-standard-fields",
    "get-layout",
  ]);
  assert.ok(planned.every((task) => task.requestId === "request-1"));
  assert.ok(planned.every((task) => task.url === REQUEST_URL));
});

void test("template is a section filter modifier, not a standalone collector task", () => {
  assert.equal(isCollectorFilterKey("template"), false);
  assert.equal(isCollectorFilterKey("customFields"), true);
  assert.deepEqual(taskTypes(planCollectorTasks(request({ filters: filters({ template: true }) }))), ["get-quick-info"]);
  assert.deepEqual(taskTypes(planCollectorTasks(request({ filters: filters({ template: true, customFields: true }) }))), [
    "get-quick-info",
    "get-custom-fields",
  ]);
});

void test("existing results suppress only the data already collected for each independent crop", () => {
  const existing = {
    rootItem: { ...factoryItemGraphNodeData({ scItemId: "root" }), scItemId: "root" },
    parent: undefined,
    layoutSectionFields: undefined,
    customFieldSections: [],
    standardFieldSections: undefined,
    childItems: undefined,
    referrers: undefined,
  } satisfies SitecoreHarvestResult;

  assert.equal(isCollectorResultAlreadyPresent("get-custom-fields", existing), true);
  assert.equal(isCollectorResultAlreadyPresent("get-standard-fields", existing), false);
  assert.deepEqual(
    taskTypes(planCollectorTasks(request({ existingResult: existing, filters: filters({ customFields: true, standardFields: true }) }))),
    ["get-standard-fields"],
  );
  assert.deepEqual(
    taskTypes(planCollectorTasks(request({ filters: filters({ customFields: true, standardFields: true }) }))),
    ["get-quick-info", "get-custom-fields", "get-standard-fields"],
  );
});

void test("existing results skip Quick Info while still planning requested missing crops", () => {
  const existing = {
    rootItem: { ...factoryItemGraphNodeData({ scItemId: "root" }), scItemId: "root" },
    parent: undefined,
    layoutSectionFields: undefined,
    customFieldSections: undefined,
    standardFieldSections: undefined,
    childItems: undefined,
    referrers: undefined,
  } satisfies SitecoreHarvestResult;

  assert.deepEqual(
    taskTypes(planCollectorTasks(request({ existingResult: existing, filters: filters({ children: true }) }))),
    ["get-children"],
  );
});

void test("parses braced GUID and path fo values as explicit item locators", () => {
  assert.deepEqual(requestedLocatorFromUrl(REQUEST_URL), { kind: "id", value: ROOT_ID });
  assert.deepEqual(
    requestedLocatorFromUrl("https://sitecore.example/editor?fo=%2Fsitecore%2Fcontent%2FHome"),
    { kind: "path", value: "/sitecore/content/Home" },
  );
  assert.equal(requestedLocatorFromUrl("https://sitecore.example/editor"), undefined);
});

void test("splits layout work from normal work without losing Quick Info", () => {
  const plan = planCollectorTaskGroups(request({ filters: filters({ parent: true, layouts: true }) }));

  assert.deepEqual(taskTypes(plan.normalTasks), ["get-quick-info", "get-parent"]);
  assert.deepEqual(taskTypes(plan.layoutTasks), ["get-layout"]);
});

void test("editor-state tasks preserve URL context and use unique cache-busting query values", () => {
  const input = request({ url: "https://sitecore.example/editor?fo=%2Fsitecore%2Fcontent%2FHome&sc_lang=da" });
  const raw = createSetRawValuesTask(input, true);
  const standard = createSetStandardFieldsTask(input, false);
  const rawUrl = new URL(raw.url);
  const standardUrl = new URL(standard.url);

  assert.equal(raw.type, "set-raw-values");
  assert.equal(raw.value, true);
  assert.equal(standard.type, "set-standard-fields");
  assert.equal(standard.value, false);
  assert.equal(rawUrl.searchParams.get("fo"), "/sitecore/content/Home");
  assert.equal(rawUrl.searchParams.get("sc_lang"), "da");
  assert.ok(rawUrl.searchParams.get("foblesEditorState"));
  assert.notEqual(rawUrl.searchParams.get("foblesEditorState"), standardUrl.searchParams.get("foblesEditorState"));
});
