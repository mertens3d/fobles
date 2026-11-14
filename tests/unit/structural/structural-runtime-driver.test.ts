import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import * as cache from "../../../src/content/foundation/cache/sitecore-data/sitecore-data-cache.ts";
import { structuralTemplateCacheKey } from "../../../src/content/foundation/cache/sitecore-data/structural-cache-key.ts";
import { createStructuralRuntimeDriver } from "../../../src/content/foundation/reference-data/processing/item-kind/structural-runtime-driver.ts";
import { WORK_SCHEDULING } from "../../../src/content/foundation/workers/work-scheduling.const.ts";
import { guid, SCOPE } from "./structural-fixture.ts";
import { runtimeFixture } from "./structural-runtime-fixture.ts";
import { getRuntimeSettings } from "../../../src/content/runtime-settings/runtime-settings.ts";
import { extensionLog } from "../../../src/content/logger.ts";
import { SITECORE } from "../../../src/constants/sitecore.const.ts";
import { factoryItemGraphNodeData } from "../../../src/content/foundation/reference-data/model/sitecore-item.ts";

beforeEach(() => cache.clear());

void test("runtime age tuning is read live and ignores legacy structural age", async (t) => {
  const f = runtimeFixture();
  t.mock.method(Date, "now", f.now);
  Object.assign(f.options.settings, { maxAgeMs: 1 });
  const key = structuralTemplateCacheKey(SCOPE, guid(10));
  await cache.putFact(key, "templateBases", { inheritedTemplateIds: [guid(2)] });
  f.age();
  getRuntimeSettings().structuralCache.maxUnvalidatedAgeHours = 1000;
  const driver = await createStructuralRuntimeDriver(SCOPE, f.options);
  assert.deepEqual((await driver.bases(guid(10), false))?.value, [guid(2)]);
  assert.equal(f.tasks.length, 0);
  getRuntimeSettings().structuralCache.maxUnvalidatedAgeHours = 50;
  await driver.bases(guid(10), false);
  await driver.finish();
  assert.equal(f.tasks.filter((task) => task.type === "get-template-bases").length, 0);
});

void test("runtime tasks use background WorkSession priority, real URL constants, and complete the pool lease", async () => {
  const f = runtimeFixture();
  const driver = await createStructuralRuntimeDriver(SCOPE, f.options);
  const resolved = await driver.quickInfo({ kind: "id", value: f.item.scItemId! }, false);
  assert.equal(resolved?.value?.templateId, f.template.scItemId);
  assert.equal((await driver.parent(f.item.scItemId!))?.value, guid(20));
  assert.deepEqual((await driver.bases(guid(10), false))?.value, [guid(2)]);
  await driver.finish();
  assert.deepEqual(f.classes, [WORK_SCHEDULING.BACKGROUND]);
  assert.equal(f.completed(), 1);
  assert.equal(f.cancelled(), 1);
  assert.ok(f.tasks.every((task) => new URL(task.url).searchParams.get(SITECORE.SEARCH_PARAMS.CONTENT_DATABASE) === "master"));
  assert.ok(f.tasks.every((task) => new URL(task.url).searchParams.has(SITECORE.SEARCH_PARAMS.FOCUSED_ITEM)));
  assert.ok(f.tasks.every((task) => task.type !== "set-raw-values" && task.type !== "set-standard-fields"));
});

void test("Quick Info and parent cache hits perform no worker tasks; template facts reuse across language", async () => {
  const f = runtimeFixture();
  const first = await createStructuralRuntimeDriver(SCOPE, f.options);
  await first.quickInfo({ kind: "id", value: f.item.scItemId! }, false);
  await first.parent(f.item.scItemId!);
  await first.bases(guid(10), false);
  await first.finish();
  const taskCount = f.tasks.length;
  const second = await createStructuralRuntimeDriver(SCOPE, f.options);
  await second.quickInfo({ kind: "id", value: f.item.scItemId! }, false);
  assert.equal((await second.parent(f.item.scItemId!))?.value, guid(20));
  await second.finish();
  const danish = await createStructuralRuntimeDriver(SCOPE, { ...f.options, identity: { ...f.options.identity, language: "da" } });
  assert.deepEqual((await danish.bases(guid(10), false))?.value, [guid(2)]);
  await danish.finish();
  assert.equal(f.tasks.length, taskCount);
});

void test("stale template facts return old data immediately and refresh atomically without changing unrelated facts", async (t) => {
  const f = runtimeFixture();
  t.mock.method(Date, "now", f.now);
  const key = structuralTemplateCacheKey(SCOPE, guid(10));
  await cache.putFact(key, "templateBases", { inheritedTemplateIds: [guid(2)] });
  await cache.putFact(key, "customSections", { sections: [] });
  f.age();
  f.setBases([guid(3)]);
  const driver = await createStructuralRuntimeDriver(SCOPE, f.options);
  const stale = await driver.bases(guid(10), false);
  assert.deepEqual(stale?.value, [guid(2)]);
  await driver.finish();
  assert.deepEqual((await cache.getCachedFact(key, "templateBases"))?.value.inheritedTemplateIds, [guid(3)]);
  assert.deepEqual((await cache.getCachedFact(key, "customSections"))?.value, { sections: [] });
  assert.equal(f.tasks.filter((task) => task.type === "get-template-bases").length, 1);
});

void test("inheritance reads deduplicate and preserve empty versus unavailable", async () => {
  const f = runtimeFixture();
  f.setBases([]);
  const driver = await createStructuralRuntimeDriver(SCOPE, f.options);
  const results = await Promise.all([driver.bases(guid(10), false), driver.bases(guid(10), false)]);
  assert.deepEqual(results.map((result) => result?.value), [[], []]);
  assert.equal(f.tasks.filter((task) => task.type === "get-template-bases").length, 1);
  await driver.finish();
  assert.equal(f.fallbackCalls(), 0);
  f.setBases(undefined);
  const unavailable = await createStructuralRuntimeDriver(SCOPE, f.options);
  assert.equal(await unavailable.bases(guid(11), false), undefined);
  await unavailable.finish();
  assert.equal(f.fallbackCalls(), 0);
  assert.equal(await cache.getCachedFact(structuralTemplateCacheKey(SCOPE, guid(11)), "templateBases"), undefined);
  await assert.rejects(cache.putFact(structuralTemplateCacheKey(SCOPE, guid(11)), "templateBases", { inheritedTemplateIds: undefined }));
});

void test("untrusted path cache hits cannot satisfy configured roots; live fallback parent targets are not persisted", async () => {
  const f = runtimeFixture();
  const wrongPath = `${SITECORE.ITEM_KIND.PATH_ROOTS.TEMPLATES}/Missing`;
  const key = { ...f.options.identity, item: { kind: "path" as const, value: wrongPath } };
  await cache.putFact(key, "quickInfo", { result: { requested: key.item, status: "found", value: f.template } });
  const driver = await createStructuralRuntimeDriver(SCOPE, f.options);
  assert.equal(await driver.quickInfo(key.item, false), undefined);
  f.missing();
  assert.equal(await driver.parent(f.item.scItemId!), undefined);
  await driver.finish();
  assert.ok(!f.tasks.some((task) => task.type === "get-parent"));
  assert.equal(await cache.getCachedFact({ ...f.options.identity, item: { kind: "id", value: f.item.scItemId! } }, "parent"), undefined);
});

void test("runtime refuses foreign origins and databases before opening a WorkSession", async () => {
  const f = runtimeFixture();
  await assert.rejects(createStructuralRuntimeDriver({ ...SCOPE, origin: "https://foreign.example" }, f.options));
  await assert.rejects(createStructuralRuntimeDriver({ ...SCOPE, database: "web" }, f.options));
  assert.deepEqual(f.classes, []);
});

void test("Quick Info cache age is verification age, not last accessed time", async (t) => {
  let now = 1000;
  t.mock.method(Date, "now", () => now);
  const f = runtimeFixture();
  const key = { ...f.options.identity, item: { kind: "id" as const, value: f.item.scItemId! } };
  await cache.putFact(key, "quickInfo", { result: { requested: key.item, status: "found", value: f.item } });
  now = 2000;
  assert.equal((await cache.getCachedFact(key, "quickInfo"))?.cachedAt, 1000);
  now = 3000;
  assert.equal((await cache.getCachedFact(key, "quickInfo"))?.cachedAt, 1000);
});

void test("collector-shaped live and cached parent paths resolve through verified Quick Info without repeat tasks", async () => {
  const f = runtimeFixture();
  f.setParent(factoryItemGraphNodeData({ scItemId: "", scItemPath: f.parent.scItemPath }));
  const driver = await createStructuralRuntimeDriver(SCOPE, f.options);
  assert.equal((await driver.parent(f.item.scItemId!))?.value, f.parent.scItemId);
  await driver.finish();
  const count = f.tasks.length;
  const cached = await createStructuralRuntimeDriver(SCOPE, f.options);
  assert.equal((await cached.parent(f.item.scItemId!))?.value, f.parent.scItemId);
  await cached.finish();
  assert.equal(f.tasks.length, count);
  assert.equal(f.tasks.filter((task) => task.type === "get-parent").length, 1);
  assert.equal(f.tasks.filter((task) => task.type === "get-quick-info" && task.requested.kind === "path").length, 1);
  const alias = await cache.getCachedFact({ ...f.options.identity, item: { kind: "id", value: f.parent.scItemId! } }, "quickInfo");
  assert.equal(alias?.value.result.value?.scItemPath, f.parent.scItemPath);
});

void test("cached collector-shaped parent paths work without a cached parent GUID", async () => {
  const f = runtimeFixture();
  const key = { ...f.options.identity, item: { kind: "id" as const, value: f.item.scItemId! } };
  await cache.putFact(key, "quickInfo", { result: { status: "found", requested: key.item, value: f.item } });
  await cache.putFact(key, "parent", { parent: factoryItemGraphNodeData({ scItemPath: f.parent.scItemPath }) });
  const driver = await createStructuralRuntimeDriver(SCOPE, f.options);
  assert.equal((await driver.parent(f.item.scItemId!))?.value, f.parent.scItemId);
  await driver.finish();
  assert.deepEqual(f.tasks.map((task) => task.type), ["get-quick-info"]);
});

void test("unavailable and mismatched path Quick Info never invent parent identities", async () => {
  for (const unavailable of [true, false]) {
    await cache.clear();
    const f = runtimeFixture();
    const path = `${f.parent.scItemPath}/Missing`;
    f.setParent(factoryItemGraphNodeData({ scItemId: "", scItemPath: path }));
    if (unavailable) {
      f.unavailablePaths.add(path);
    }
    const driver = await createStructuralRuntimeDriver(SCOPE, f.options);
    assert.equal((await driver.parent(f.item.scItemId!))?.value, undefined);
    await driver.finish();
    assert.equal(await cache.getCachedFact({ ...f.options.identity, item: { kind: "path", value: path } }, "quickInfo"), undefined);
  }
});

void test("fresh parent reads bypass stale edges and resolve the new collector path", async (t) => {
  const f = runtimeFixture();
  t.mock.method(Date, "now", f.now);
  const key = { ...f.options.identity, item: { kind: "id" as const, value: f.item.scItemId! } };
  await cache.putFact(key, "quickInfo", { result: { status: "found", requested: key.item, value: f.item } });
  await cache.putFact(key, "parent", { parent: factoryItemGraphNodeData({ scItemId: guid(99) }) });
  f.age();
  f.setParent(factoryItemGraphNodeData({ scItemPath: f.parent.scItemPath }));
  const driver = await createStructuralRuntimeDriver(SCOPE, f.options);
  assert.equal((await driver.parent(f.item.scItemId!))?.value, guid(99));
  assert.equal((await driver.parent(f.item.scItemId!, true))?.value, f.parent.scItemId);
  await driver.finish();
  assert.equal((await cache.getCachedFact(key, "parent"))?.value.parent?.scItemPath, f.parent.scItemPath);
});

void test("finish is idempotent and releases the session even when completion fails", async () => {
  const f = runtimeFixture();
  let releases = 0;
  const driver = await createStructuralRuntimeDriver(SCOPE, {
    ...f.options,
    createSession: (workClass) => ({
      ...f.options.createSession(workClass),
      complete: () => Promise.reject(new Error("completion failed")),
      cancel: () => {
        releases += 1;
        return Promise.resolve();
      },
    }),
  });
  await driver.quickInfo({ kind: "id", value: f.item.scItemId! }, false);
  await assert.rejects(driver.finish(), /completion failed/);
  await assert.rejects(driver.finish(), /completion failed/);
  assert.equal(releases, 1);
});

void test("failed refreshes are reported only after session completion and release", async () => {
  const f = runtimeFixture();
  const driver = await createStructuralRuntimeDriver(SCOPE, {
    ...f.options,
    createSession: (workClass) => ({
      ...f.options.createSession(workClass),
      runTask: () => Promise.reject(new Error("transport failed")),
    }),
  });
  assert.equal(await driver.bases(guid(10), true), undefined);
  await assert.rejects(driver.finish(), /Structural background reads failed/);
  assert.equal(f.completed(), 1);
  assert.equal(f.cancelled(), 1);
});

void test("finish drains dependent stale parent refreshes before completing and releasing the session", async (t) => {
  const f = runtimeFixture();
  t.mock.method(Date, "now", f.now);
  const key = { ...f.options.identity, item: { kind: "id" as const, value: f.item.scItemId! } };
  await cache.putFact(key, "quickInfo", { result: { status: "found", requested: key.item, value: f.item } });
  await cache.putFact(key, "parent", { parent: factoryItemGraphNodeData({ scItemId: guid(99) }) });
  f.age();
  let unblock = (): void => {};
  const gate = new Promise<void>((resolve) => {
    unblock = resolve;
  });
  const driver = await createStructuralRuntimeDriver(SCOPE, {
    ...f.options,
    createSession: (workClass) => {
      const session = f.options.createSession(workClass);
      return {
        ...session,
        runTask: async (task) => {
          if (task.type === "get-quick-info") {
            await gate;
          }
          return session.runTask(task);
        },
      };
    },
  });
  assert.equal((await driver.parent(f.item.scItemId!))?.value, guid(99));
  const finished = driver.finish();
  assert.equal(f.completed(), 0);
  assert.equal(f.cancelled(), 0);
  unblock();
  await finished;
  await driver.finish();
  assert.equal(f.tasks.filter((task) => task.type === "get-parent").length, 1);
  assert.equal(f.completed(), 1);
  assert.equal(f.cancelled(), 1);
  assert.equal((await cache.getCachedFact(key, "parent"))?.value.parent?.scItemId, f.parent.scItemId);
});

void test("automatic discovery leaves unavailable template bases unresolved without any editor-state fallback", async (t) => {
  const f = runtimeFixture();
  f.setBases(undefined);
  const { templateBasesFallback, ...options } = f.options;
  const driver = await createStructuralRuntimeDriver(SCOPE, options);
  assert.equal(await driver.bases(guid(10), false), undefined);
  assert.equal(await driver.bases(guid(10), true), undefined);
  await driver.quickInfo({ kind: "id", value: f.item.scItemId! }, false);
  await driver.parent(f.item.scItemId!);
  await driver.finish();
  assert.equal(typeof templateBasesFallback, "function");
  assert.equal(f.fallbackCalls(), 0);
  assert.ok(f.tasks.every((task) => task.type !== "set-raw-values" && task.type !== "set-standard-fields"));
  assert.equal(await cache.getCachedFact(structuralTemplateCacheKey(SCOPE, guid(10)), "templateBases"), undefined);
});

void test("harvested full-section bases reuse their verification age without opening a worker", async () => {
  const f = runtimeFixture();
  const key = structuralTemplateCacheKey(SCOPE, guid(10));
  const verifiedAt = f.now() - 10;
  await cache.putFact({ ...f.options.identity, item: key.item }, "customSections", {
    sections: [{ name: "Data", fields: [{
      label: SITECORE.ITEM_KIND.FIELD_LABELS.BASE_TEMPLATE, value: `{${guid(2)}}|${guid(3)}`,
      links: [], rawMarkup: undefined,
    }] }],
  }, { lastVerifiedAt: verifiedAt });
  const driver = await createStructuralRuntimeDriver(SCOPE, f.options);
  const cached = await driver.bases(guid(10), false);
  assert.deepEqual(cached?.value, [guid(2)]);
  assert.ok((cached?.cachedAt ?? 0) >= verifiedAt);
  await driver.finish();
  assert.deepEqual(f.tasks, []);
  assert.equal((await cache.getCachedFact(key, "templateBases"))?.lastVerifiedAt, verifiedAt);
});