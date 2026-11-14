import assert from "node:assert/strict";
import { test } from "node:test";
import { knownSitesStorageKey } from "../../../src/shared/known-sites/known-sites-model.ts";
import { createTemplateStructuralService } from "../../../src/content/foundation/reference-data/processing/item-kind/template-structural-service.ts";
import { fixture, guid, SCOPE } from "./structural-fixture.ts";
import { extensionLog } from "../../../src/content/logger.ts";
import { SITECORE } from "../../../src/constants/sitecore.const.ts";

void test("indirect Site/Page/Tenant inheritance and changed dependencies reuse template structural facts", async () => {
  const f = fixture();
  const template = guid(10);
  const intermediate = guid(11);
  f.bases.set(template, [intermediate]);
  f.bases.set(intermediate, [guid(2)]);
  const model = createTemplateStructuralService();
  const first = f.content(20, "/sitecore/content/A", template);
  const second = f.content(21, "/sitecore/content/B", template);
  assert.equal((await model.classify(first, f.driver, f.settings, 1000)).kind, "site");
  assert.equal((await model.classify(second, f.driver, f.settings, 1000)).kind, "site");
  f.bases.set(intermediate, [guid(1)]);
  assert.equal((await model.classify(second, f.driver, f.settings, 1000)).kind, "page");
  f.bases.set(intermediate, [guid(3)]);
  assert.equal((await model.classify(first, f.driver, f.settings, 1000)).kind, "tenant");
  assert.ok(f.calls.filter((call) => call.startsWith("bases:")).every((call) => !call.includes(first.id) && !call.includes(second.id)));
});

void test("inheritance cycles terminate and unavailable differs from a settled empty base list", async () => {
  const f = fixture();
  f.bases.set(guid(10), [guid(11)]);
  f.bases.set(guid(11), [guid(10), guid(2)]);
  const model = createTemplateStructuralService();
  const item = f.content(20, "/sitecore/content/A", guid(10));
  assert.deepEqual(await model.classify(item, f.driver, f.settings, 1000), { kind: "site", complete: true, stale: false });
  f.bases.set(guid(11), undefined);
  assert.equal((await model.classify(item, f.driver, f.settings, 1000)).complete, false);
  f.bases.set(guid(11), []);
  assert.deepEqual(await model.classify(item, f.driver, f.settings, 1000), { kind: "unknown", complete: true, stale: false });
});

void test("configured path roots resolve live; changed paths invalidate derived classifications without guessed GUIDs", async () => {
  const f = fixture();
  f.bases.set(guid(10), [guid(2)]);
  const model = createTemplateStructuralService();
  const item = f.content(20, "/sitecore/content/A", guid(10));
  assert.equal((await model.classify(item, f.driver, f.settings, 1000)).kind, "site");
  const path = `${SITECORE.ITEM_KIND.PATH_ROOTS.TEMPLATES}/Custom/Site`;
  f.settings.baseTemplatePaths.site = [path];
  f.items.set(path, { id: guid(30), name: "Custom Site", path });
  f.bases.set(guid(30), []);
  assert.equal((await model.classify(item, f.driver, f.settings, 1000)).kind, "unknown");
  f.bases.set(guid(10), [guid(30)]);
  assert.equal((await model.classify(item, f.driver, f.settings, 1000)).kind, "site");
});

void test("duplicate visits schedule nonblocking once, walking parent facts to the nearest Site", async () => {
  const f = fixture();
  const site = f.content(20, "/sitecore/content/Tenant/Site", guid(2));
  const page = f.content(21, `${site.path}/Home`, guid(1));
  f.parents.set(page.id, site.id);
  f.service.scheduleStructuralDiscovery(SCOPE, [page, page]);
  f.service.scheduleStructuralDiscovery({ ...SCOPE, origin: `${SCOPE.origin}/shell`, database: "MASTER" }, [page]);
  assert.deepEqual(f.readSites(), []);
  await f.service.whenIdle();
  assert.equal(f.calls.filter((call) => call.startsWith("driver:")).length, 1);
  assert.deepEqual(f.readSites().map((entry) => entry.id), [site.id]);
  assert.deepEqual(f.errors, []);
});

void test("Known Sites lookup validates unproven roots once without crawling and preserves boundary matching", async () => {
  const f = fixture();
  const site = f.content(20, "/sitecore/content/Site", guid(2));
  f.seed({ ...site, templateId: guid(2), validatedAt: 1000 });
  assert.equal((await f.service.lookupKnownSite(SCOPE, `${site.path}/Home`))?.id, site.id);
  assert.equal(await f.service.lookupKnownSite(SCOPE, `${site.path}Other/Home`), undefined);
  await f.service.whenIdle();
  assert.equal(f.calls.filter((call) => call.startsWith("driver:")).length, 1);
  assert.ok(!f.calls.some((call) => call.startsWith("parent:")));
  f.calls.length = 0;
  await f.service.lookupKnownSite(SCOPE, `${site.path}/Home`);
  await f.service.whenIdle();
  assert.deepEqual(f.calls, []);
});

void test("stale Known Site validates by ID and replaces moved path, name and template metadata", async () => {
  const f = fixture();
  const site = f.content(20, "/sitecore/content/Old", guid(2));
  f.seed({ ...site, templateId: guid(2), validatedAt: 1000 });
  const moved = { ...site, name: "Renamed", path: "/sitecore/content/New", templateId: guid(10) };
  f.items.set(site.id, moved);
  f.bases.set(guid(10), [guid(2)]);
  f.age();
  const stale = await f.service.lookupKnownSite(SCOPE, `${site.path}/Home`);
  assert.equal(stale?.path, site.path);
  await f.service.whenIdle();
  assert.deepEqual(f.readSites(), [{ ...moved, validatedAt: 1101 }]);
  assert.ok(f.calls.includes(`qi:${site.id}:true`));
});

void test("stale Site that ceases to inherit Site is removed and its Site ancestor rediscovered", async () => {
  const f = fixture();
  const parent = f.content(22, "/sitecore/content/Parent", guid(2));
  const site = f.content(20, `${parent.path}/Old`, guid(2));
  f.seed({ ...site, templateId: guid(2), validatedAt: 1000 });
  f.items.set(site.id, { ...site, templateId: guid(1) });
  f.parents.set(site.id, parent.id);
  f.age();
  f.service.scheduleStructuralDiscovery(SCOPE, [site]);
  await f.service.whenIdle();
  assert.deepEqual(f.readSites().map((entry) => entry.id), [parent.id]);
});

void test("deleted roots remove the Known Site, while unavailable validation retains stale metadata", async () => {
  for (const unavailable of [false, true]) {
    const f = fixture();
    const site = f.content(20, "/sitecore/content/Site", guid(2));
    f.seed({ ...site, templateId: guid(2), validatedAt: 1000 });
    if (unavailable) {
      f.unavailable();
    } else {
      f.items.set(site.id, null);
    }
    f.age();
    await f.service.lookupKnownSite(SCOPE, site.path);
    await f.service.whenIdle();
    assert.equal(f.readSites().length, unavailable ? 1 : 0);
  }
});

void test("parent cycles and the content root stop the walk without persisting memberships", async () => {
  const f = fixture();
  const page = f.content(20, "/sitecore/content/A", guid(1));
  f.parents.set(page.id, page.id);
  f.service.scheduleStructuralDiscovery(SCOPE, [page]);
  await f.service.whenIdle();
  assert.equal(f.calls.filter((call) => call === `parent:${page.id}`).length, 1);
  const root = f.content(21, SITECORE.ITEM_KIND.PATH_ROOTS.CONTENT, guid(2));
  f.parents.set(page.id, root.id);
  f.calls.length = 0;
  f.service.scheduleStructuralDiscovery(SCOPE, [page]);
  await f.service.whenIdle();
  assert.deepEqual(f.readSites(), []);
  assert.ok(!f.calls.includes(`parent:${root.id}`));
});

void test("origin, port and database isolation and canonical scope deduplication", async () => {
  const f = fixture();
  const site = f.content(20, "/sitecore/content/Site", guid(2));
  const scopes = [SCOPE, { ...SCOPE, database: "web" }, { ...SCOPE, origin: "https://sitecore.example" }];
  for (const scope of scopes) {
    f.service.scheduleStructuralDiscovery(scope, [site]);
  }
  await f.service.whenIdle();
  assert.equal(new Set(scopes.map(knownSitesStorageKey)).size, 3);
  assert.ok(scopes.every((scope) => f.readSites(scope).length === 1));
});

void test("stale Known Site lookup deduplicates ID validation and never crawls even when the root stops being Site", async () => {
  const f = fixture();
  const site = f.content(20, "/sitecore/content/Site", guid(2));
  f.seed({ ...site, templateId: guid(2), validatedAt: 1000 });
  f.items.set(site.id, { ...site, templateId: guid(1) });
  f.parents.set(site.id, guid(22));
  f.age();
  await Promise.all([f.service.lookupKnownSite(SCOPE, site.path), f.service.lookupKnownSite(SCOPE, `${site.path}/Home`)]);
  await f.service.whenIdle();
  assert.deepEqual(f.readSites(), []);
  assert.equal(f.calls.filter((call) => call.startsWith("driver:")).length, 1);
  assert.ok(!f.calls.some((call) => call.startsWith("parent:")));
});

void test("named ancestor limit bounds structural discovery", async () => {
  const f = fixture();
  const pages = Array.from({ length: 101 }, (_, index) => f.content(index + 100, `/sitecore/content/Page ${index}`, guid(1)));
  for (let index = 0; index < pages.length - 1; index += 1) {
    f.parents.set(pages[index].id, pages[index + 1].id);
  }
  f.service.scheduleStructuralDiscovery(SCOPE, [pages[0]]);
  await f.service.whenIdle();
  assert.equal(f.calls.filter((call) => call.startsWith("parent:")).length, 100);
  assert.ok(!f.calls.includes(`qi:${pages[100].id}:false`));
  assert.deepEqual(f.readSites(), []);
});

void test("normal discovery of a proven fresh Known Site match opens no driver and never crawls", async () => {
  const f = fixture();
  const site = f.content(20, "/sitecore/content/Site", guid(2));
  const page = f.content(21, `${site.path}/Home`, guid(1));
  f.seed({ ...site, templateId: guid(2), validatedAt: 1000 });
  await f.service.lookupKnownSite(SCOPE, site.path);
  await f.service.whenIdle();
  f.calls.length = 0;
  f.service.scheduleStructuralDiscovery(SCOPE, [page]);
  await f.service.whenIdle();
  assert.deepEqual(f.calls, []);
});

void test("settings fingerprints revalidate fresh Known Sites without ancestor walks", async () => {
  const f = fixture();
  const site = f.content(20, "/sitecore/content/Site", guid(2));
  f.seed({ ...site, templateId: guid(2), validatedAt: 1000 });
  await f.service.lookupKnownSite(SCOPE, site.path);
  await f.service.whenIdle();
  f.calls.length = 0;
  f.settings.baseTemplatePaths.site = [];
  await Promise.all([f.service.lookupKnownSite(SCOPE, site.path), f.service.lookupKnownSite(SCOPE, `${site.path}/Home`)]);
  await f.service.whenIdle();
  assert.deepEqual(f.readSites(), []);
  assert.equal(f.calls.filter((call) => call.startsWith("driver:")).length, 1);
  assert.ok(!f.calls.some((call) => call.startsWith("parent:")));
});

void test("settings invalidation also validates fresh roots in scopes not previously looked up", async () => {
  const f = fixture();
  const site = f.content(20, "/sitecore/content/Site", guid(2));
  f.seed({ ...site, templateId: guid(2), validatedAt: 1000 });
  f.settings.baseTemplatePaths.site = [];
  f.service.invalidateSettings();
  assert.equal((await f.service.lookupKnownSite(SCOPE, site.path))?.id, site.id);
  await f.service.whenIdle();
  assert.deepEqual(f.readSites(), []);
});

void test("unavailable settings revalidation retains metadata and retries without certifying the changed settings", async () => {
  const f = fixture();
  const site = f.content(20, "/sitecore/content/Site", guid(2));
  f.seed({ ...site, templateId: guid(2), validatedAt: 1000 });
  await f.service.lookupKnownSite(SCOPE, site.path);
  await f.service.whenIdle();
  f.calls.length = 0;
  f.settings.baseTemplatePaths.site = [];
  f.unavailable();
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await f.service.lookupKnownSite(SCOPE, site.path);
    await f.service.whenIdle();
    assert.equal(f.readSites().length, 1);
  }
  assert.equal(f.calls.filter((call) => call.startsWith("driver:")).length, 2);
});

void test("stale parent edges alone enqueue one fresh convergence pass after session drainage", async (t) => {
  const f = fixture();
  const site = f.content(20, "/sitecore/content/Site", guid(2));
  const page = f.content(21, `${site.path}/Home`, guid(1));
  const reads: boolean[] = [];
  t.mock.method(f.driver, "parent", (id: string, fresh = false) => {
    reads.push(fresh);
    if (fresh) {
      assert.ok(f.calls.includes("finish"));
    }
    return Promise.resolve({ value: fresh ? site.id : undefined, cachedAt: fresh ? 1000 : 800 });
  });
  f.service.scheduleStructuralDiscovery(SCOPE, [page]);
  await f.service.whenIdle();
  assert.deepEqual(reads, [false]);
  assert.deepEqual(f.readSites(), []);
  assert.equal(f.calls.filter((call) => call === "finish").length, 1);
  assert.deepEqual(f.errors, []);
});

void test("unavailable fresh parent reads terminate the convergence pass and release both drivers", async (t) => {
  const f = fixture();
  const page = f.content(21, "/sitecore/content/Site/Home", guid(1));
  t.mock.method(f.driver, "parent", (id: string, fresh = false) => Promise.resolve(fresh ? undefined : { value: undefined, cachedAt: 800 }));
  f.service.scheduleStructuralDiscovery(SCOPE, [page]);
  await f.service.whenIdle();
  assert.equal(f.calls.filter((call) => call === "finish").length, 1);
  assert.deepEqual(f.readSites(), []);
  assert.deepEqual(f.errors, []);
});

void test("stale negative Quick Info converges to a live Site instead of dropping the follow-up", async (t) => {
  const f = fixture();
  const site = f.content(20, "/sitecore/content/Site", guid(2));
  const original = f.driver.quickInfo;
  t.mock.method(f.driver, "quickInfo", (locator: Parameters<typeof original>[0], fresh: boolean) =>
    locator.value === site.id && !fresh ? Promise.resolve({ value: null, cachedAt: 800 }) : original(locator, fresh));
  f.service.scheduleStructuralDiscovery(SCOPE, [site]);
  await f.service.whenIdle();
  assert.deepEqual(f.readSites(), []);
  assert.equal(f.calls.filter((call) => call === "finish").length, 1);
});

void test("unavailable discovery explains missing roots, bases, templates and parents in scoped diagnostics", async (t) => {
  const debug = t.mock.method(extensionLog, "debug", () => {});
  const warn = t.mock.method(extensionLog, "warn", () => {});
  const f = fixture();
  const page = f.content(21, "/sitecore/content/Site/Home", guid(10));
  f.bases.set(guid(10), undefined);
  f.items.set(f.settings.baseTemplatePaths.site[0], null);
  f.service.scheduleStructuralDiscovery(SCOPE, [page, page]);
  await f.service.whenIdle();
  assert.deepEqual(f.readSites(), []);
  for (const message of ["enqueue", "start", "result", "ancestor walk stopped"]) {
    assert.ok(debug.mock.calls.some((call) => call.arguments[0] === `Structural discovery: ${message}`));
  }
  for (const message of ["configured base root unmatched", "template inheritance missing", "parent unavailable"]) {
    const call = warn.mock.calls.find((entry) => entry.arguments[0] === `Structural discovery: ${message}`);
    assert.ok(call);
    assert.deepEqual((call.arguments[1] as { scope: unknown }).scope, SCOPE);
  }
  const missingTemplate = { ...page, templateId: undefined };
  f.items.set(page.id, missingTemplate);
  f.service.scheduleStructuralDiscovery(SCOPE, [missingTemplate]);
  await f.service.whenIdle();
  assert.ok(warn.mock.calls.some((call) =>
    call.arguments[0] === "Structural discovery: ancestor classification incomplete" &&
    (call.arguments[1] as { reason: string }).reason === "missing-template"));
});

void test("stale Known Site discovery validates the root only and never walks a matched page", async () => {
  const f = fixture();
  const site = f.content(20, "/sitecore/content/Site", guid(2));
  const page = f.content(21, `${site.path}/Home`, guid(1));
  f.seed({ ...site, templateId: guid(2), validatedAt: 1000 });
  f.age();
  f.service.scheduleStructuralDiscovery(SCOPE, [page]);
  await f.service.whenIdle();
  assert.ok(!f.calls.some((call) => call.startsWith("parent:")));
  assert.ok(!f.calls.some((call) => call.startsWith(`qi:${page.id}:`)));
  assert.deepEqual(f.readSites().map((entry) => entry.id), [site.id]);
});