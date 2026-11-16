import assert from "node:assert/strict";
import { test } from "node:test";
import { fixture, guid, SCOPE } from "./structural-fixture.ts";

void test("a new service validates fresh stored settings-A roots under settings B while returning cached labels", async () => {
  const f = fixture();
  const site = f.content(20, "/sitecore/content/Site", guid(2));
  f.service.scheduleStructuralDiscovery(SCOPE, [site]);
  await f.service.whenIdle();
  assert.equal(f.readSites()[0]?.validatedAt, 1000);
  f.settings.baseTemplatePaths.site = [];
  const second = f.createService();
  f.calls.length = 0;
  assert.equal((await second.lookupKnownSite(SCOPE, `${site.path}/Home`))?.id, site.id);
  await second.whenIdle();
  assert.deepEqual(f.readSites(), []);
  assert.equal(f.calls.filter((call) => call.startsWith("driver:")).length, 1);
  assert.ok(!f.calls.some((call) => call.startsWith("parent:")));
});

void test("each new service proves stored roots once; lookups never recrawl and active-item discovery only re-proves the root", async () => {
  const f = fixture();
  const site = f.content(20, "/sitecore/content/Site", guid(2));
  f.seed({ ...site, templateId: guid(2), validatedAt: 1000 });
  for (const service of [f.service, f.createService()]) {
    f.calls.length = 0;
    await Promise.all([service.lookupKnownSite(SCOPE, site.path), service.lookupKnownSite(SCOPE, `${site.path}/Home`)]);
    await service.whenIdle();
    assert.equal(f.calls.filter((call) => call.startsWith("driver:")).length, 1);
    assert.ok(!f.calls.some((call) => call.startsWith("parent:")));
    f.calls.length = 0;
    await service.lookupKnownSite(SCOPE, site.path);
    await service.whenIdle();
    assert.deepEqual(f.calls, []);
    service.scheduleStructuralDiscovery(SCOPE, [{ ...site, id: guid(21), path: `${site.path}/Home` }]);
    await service.whenIdle();
    assert.equal(f.calls.filter((call) => call.startsWith("driver:")).length, 1);
    assert.ok(f.calls.includes(`qi:${site.id}:true`));
    assert.ok(!f.calls.some((call) => call.startsWith("parent:")));
  }
});