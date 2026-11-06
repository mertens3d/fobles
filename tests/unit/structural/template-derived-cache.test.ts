import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import * as cache from "../../../src/content/foundation/cache/sitecore-data/sitecore-data-cache.ts";
import { structuralTemplateCacheKey } from "../../../src/content/foundation/cache/sitecore-data/structural-cache-key.ts";
import { factoryItemGraphNodeData } from "../../../src/content/foundation/reference-data/model/sitecore-item.types.ts";
import { createStructuralRuntimeDriver } from "../../../src/content/foundation/reference-data/processing/item-kind/structural-runtime-driver.ts";
import { createTemplateStructuralService } from "../../../src/content/foundation/reference-data/processing/item-kind/template-structural-service.ts";
import { fixture, guid, SCOPE } from "./structural-fixture.ts";
import { runtimeFixture } from "./structural-runtime-fixture.ts";

beforeEach(() => cache.clear());

async function seedRoots(f: ReturnType<typeof runtimeFixture>): Promise<void> {
  let index = 0;
  for (const kind of ["page", "site", "tenant"] as const) {
    index += 1;
    const path = f.options.settings.baseTemplatePaths[kind][0];
    const item = { kind: "path" as const, value: path };
    await cache.putFact({ ...f.options.identity, item }, "quickInfo", { result: {
      status: "found", requested: item,
      value: factoryItemGraphNodeData({ scItemId: guid(index), scItemName: kind, scItemPath: path }),
    } });
    await cache.putFact(structuralTemplateCacheKey(SCOPE, guid(index)), "templateBases", { directBaseIds: [] });
  }
}

void test("derived kind round-trips through new runtime/service instances on the template key, independent of language and item path", async (t) => {
  const f = runtimeFixture();
  t.mock.method(Date, "now", f.now);
  await seedRoots(f);
  const key = structuralTemplateCacheKey(SCOPE, guid(10));
  await cache.putFact(key, "templateBases", { directBaseIds: [guid(2)] });
  const item = { id: guid(21), name: "Home", path: "/sitecore/content/Site/Home", templateId: guid(10) };
  const first = await createStructuralRuntimeDriver(SCOPE, f.options);
  assert.deepEqual(await createTemplateStructuralService().classify(item, first, f.options.settings, f.now()), {
    kind: "site", complete: true, stale: false,
  });
  await first.finish();
  const stored = await cache.getFact(key, "templateDerived");
  assert.equal(stored?.value.kind, "site");
  assert.equal(stored?.value.complete, true);
  assert.ok(stored?.value.fingerprint);
  assert.deepEqual(new Set(stored?.value.inheritedIds), new Set([guid(10), guid(2)]));
  const second = await createStructuralRuntimeDriver(SCOPE, f.options);
  const writes = t.mock.method(second, "writeDerived");
  const model = createTemplateStructuralService();
  assert.equal((await model.classify({ ...item, id: guid(22) }, second, f.options.settings, f.now())).kind, "site");
  assert.equal((await model.classify({ ...item, path: "/sitecore/templates/Custom" }, second, f.options.settings, f.now())).kind, "template");
  assert.equal((await model.classify({ ...item, path: "/sitecore/layout/Custom" }, second, f.options.settings, f.now())).kind, "unknown");
  await second.finish();
  assert.equal(writes.mock.callCount(), 0);
  assert.deepEqual(await cache.getFact(key, "templateDerived"), stored);
  assert.equal(await cache.getItem({ ...f.options.identity, item: { kind: "id", value: item.id } }), undefined);
  assert.equal(await cache.getFact(structuralTemplateCacheKey({ ...SCOPE, database: "web" }, guid(10)), "templateDerived"), undefined);
  const danish = await createStructuralRuntimeDriver(SCOPE, { ...f.options, identity: { ...f.options.identity, language: "da" } });
  assert.deepEqual(await danish.readDerived(guid(10)), stored);
  assert.deepEqual((await danish.bases(guid(10), false))?.value, [guid(2)]);
  await danish.finish();
  assert.deepEqual(f.tasks, []);
});

void test("new services invalidate persisted kinds for direct, transitive, and settings changes without discarding direct bases", async () => {
  const f = fixture();
  const item = f.content(20, "/sitecore/content/Site", guid(10));
  f.bases.set(guid(10), [guid(11)]);
  f.bases.set(guid(11), [guid(2)]);
  const classify = () => createTemplateStructuralService().classify(item, f.driver, f.settings, 1000);
  assert.equal((await classify()).kind, "site");
  const initial = f.derived.get(guid(10))!;
  f.bases.set(guid(11), [guid(1)]);
  assert.equal((await classify()).kind, "page");
  assert.notEqual(f.derived.get(guid(10))?.value.fingerprint, initial.value.fingerprint);
  f.bases.set(guid(10), [guid(3)]);
  assert.equal((await classify()).kind, "tenant");
  f.settings.baseTemplatePaths.tenant = [];
  assert.equal((await classify()).kind, "unknown");
  assert.deepEqual(f.bases.get(guid(10)), [guid(3)]);
  f.bases.set(guid(10), undefined);
  assert.equal((await classify()).complete, false);
  assert.equal(f.derived.get(guid(10))?.value.complete, true);
});

void test("persisted fingerprints detect changed cached transitive bases and settings in a new runtime service", async (t) => {
  const f = runtimeFixture();
  t.mock.method(Date, "now", f.now);
  await seedRoots(f);
  const key = structuralTemplateCacheKey(SCOPE, guid(10));
  const dependency = structuralTemplateCacheKey(SCOPE, guid(11));
  await cache.putFact(key, "templateBases", { directBaseIds: [guid(11)] });
  await cache.putFact(dependency, "templateBases", { directBaseIds: [guid(2)] });
  const item = { id: guid(21), name: "Home", path: "/sitecore/content/Site/Home", templateId: guid(10) };
  async function classify() {
    const driver = await createStructuralRuntimeDriver(SCOPE, f.options);
    const result = await createTemplateStructuralService().classify(item, driver, f.options.settings, f.now());
    await driver.finish();
    return result;
  }
  assert.equal((await classify()).kind, "site");
  const original = await cache.getFact(key, "templateDerived");
  await cache.putFact(dependency, "templateBases", { directBaseIds: [guid(3)] });
  assert.equal((await classify()).kind, "tenant");
  assert.notEqual((await cache.getFact(key, "templateDerived"))?.value.fingerprint, original?.value.fingerprint);
  f.options.settings.baseTemplatePaths.tenant = [];
  assert.equal((await classify()).kind, "unknown");
  assert.equal((await cache.getFact(key, "templateDerived"))?.value.kind, "unknown");
  assert.deepEqual((await cache.getFact(key, "templateBases"))?.value.directBaseIds, [guid(11)]);
  assert.deepEqual((await cache.getFact(dependency, "templateBases"))?.value.directBaseIds, [guid(3)]);
  assert.deepEqual(f.tasks, []);
});

void test("SWR returns stale derived kind without recertification and converges after direct-base refresh", async (t) => {
  let now = 1000;
  t.mock.method(Date, "now", () => now);
  const key = structuralTemplateCacheKey(SCOPE, guid(10));
  await cache.putFact(key, "templateBases", { directBaseIds: [guid(2)] });
  const f = runtimeFixture();
  await seedRoots(f);
  const item = { id: guid(21), name: "Home", path: "/sitecore/content/Site/Home", templateId: guid(10) };
  const first = await createStructuralRuntimeDriver(SCOPE, f.options);
  await createTemplateStructuralService().classify(item, first, f.options.settings, now);
  await first.finish();
  const original = await cache.getFact(key, "templateDerived");
  now += 101;
  f.age();
  await seedRoots(f);
  f.setBases([guid(3)]);
  const staleDriver = await createStructuralRuntimeDriver(SCOPE, f.options);
  assert.deepEqual(await createTemplateStructuralService().classify(item, staleDriver, f.options.settings, now), {
    kind: "site", complete: true, stale: true,
  });
  assert.deepEqual(await cache.getFact(key, "templateDerived"), original);
  await staleDriver.finish();
  const refreshed = await createStructuralRuntimeDriver(SCOPE, f.options);
  assert.deepEqual(await createTemplateStructuralService().classify(item, refreshed, f.options.settings, now), {
    kind: "tenant", complete: true, stale: false,
  });
  await refreshed.finish();
  assert.equal((await cache.getFact(key, "templateDerived"))?.value.kind, "tenant");
  assert.equal(f.tasks.filter((task) => task.type === "get-template-bases").length, 1);
});