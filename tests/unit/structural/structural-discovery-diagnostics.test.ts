import assert from "node:assert/strict";
import { test } from "node:test";
import { extensionLog } from "../../../src/content/logger.ts";
import { STRUCTURAL } from "../../../src/shared/structural/structural.const.ts";
import { fixture, guid, SCOPE } from "./structural-fixture.ts";
import { SITECORE } from "../../../src/constants/sitecore.const.ts";

void test("queued validation failures include environment and Site identity and preserve error reporting", async (t) => {
  const warn = t.mock.method(extensionLog, "warn", () => {});
  t.mock.method(extensionLog, "debug", () => {});
  const f = fixture();
  const site = { ...f.content(20, "/sitecore/content/Site", guid(2)), templateId: guid(2), validatedAt: 0 };
  const error = new Error("Site validation read failed");
  f.seed(site);
  t.mock.method(f.driver, "quickInfo", () => Promise.reject(error));
  await f.service.lookupKnownSite(SCOPE, site.path);
  await f.service.whenIdle();
  const diagnostic = warn.mock.calls.find((call) => call.arguments[0] === "Structural discovery: validation failed");
  assert.ok(diagnostic);
  assert.deepEqual(diagnostic.arguments[1], { scope: SCOPE, target: site, error });
  assert.deepEqual(f.errors, [error]);
  assert.equal(f.readSites().length, 1);
});

void test("discovery logs scoped cache misses, found Sites, validation results and cache matches", async (t) => {
  const debug = t.mock.method(extensionLog, "debug", () => {});
  const f = fixture();
  const site = f.content(20, "/sitecore/content/Site", guid(2));
  f.service.scheduleStructuralDiscovery(SCOPE, [site]);
  await f.service.whenIdle();
  f.service.scheduleStructuralDiscovery(SCOPE, [site]);
  await f.service.whenIdle();
  for (const message of ["start", "unmatched path", "Site found", "cache path match"]) {
    const diagnostic = debug.mock.calls.find((call) => call.arguments[0] === `Structural discovery: ${message}`);
    assert.ok(diagnostic, message);
    assert.deepEqual((diagnostic.arguments[1] as { scope: unknown }).scope, SCOPE);
  }
  assert.equal(f.calls.filter((call) => call.startsWith("driver:")).length, 1);
  f.age();
  await f.service.lookupKnownSite(SCOPE, site.path);
  await f.service.whenIdle();
  assert.ok(debug.mock.calls.some((call) => call.arguments[0] === "Structural discovery: validation result"));
});

void test("unavailable validation reports an unresolved result and retains the Known Site", async (t) => {
  const debug = t.mock.method(extensionLog, "debug", () => {});
  t.mock.method(extensionLog, "warn", () => {});
  const f = fixture();
  const site = f.content(20, "/sitecore/content/Site", guid(2));
  f.seed({ ...site, templateId: guid(2), validatedAt: 0 });
  f.unavailable();
  await f.service.lookupKnownSite(SCOPE, site.path);
  await f.service.whenIdle();
  assert.equal(f.readSites().length, 1);
  const diagnostic = debug.mock.calls.find((call) => call.arguments[0] === "Structural discovery: validation result");
  assert.ok(diagnostic);
  assert.equal((diagnostic.arguments[1] as { reason: string }).reason, "quick-info-unavailable");
});

void test("walk diagnostics distinguish missing Quick Info, parent, Content root, cycles and limits", async (t) => {
  const debug = t.mock.method(extensionLog, "debug", () => {});
  const warn = t.mock.method(extensionLog, "warn", () => {});
  for (const reason of ["missing-item", "missing-parent", "content-root", "parent-cycle", "ancestor-limit"]) {
    const f = fixture();
    const page = f.content(100, "/sitecore/content/Home", guid(1));
    if (reason === "missing-item") {
      f.items.delete(page.id);
    } else if (reason === "content-root") {
      const root = f.content(101, SITECORE.ITEM_KIND.PATH_ROOTS.CONTENT, guid(1));
      f.parents.set(page.id, root.id);
    } else if (reason === "parent-cycle") {
      f.parents.set(page.id, page.id);
    } else if (reason === "ancestor-limit") {
      let previous = page;
      for (let index = 1; index <= STRUCTURAL.MAX_ANCESTORS; index += 1) {
        const next = f.content(100 + index, `/sitecore/content/Ancestor ${index}`, guid(1));
        f.parents.set(previous.id, next.id);
        previous = next;
      }
    }
    f.service.scheduleStructuralDiscovery(SCOPE, [page]);
    await f.service.whenIdle();
    const diagnostic = [...debug.mock.calls].reverse().find((call) => call.arguments[0] === "Structural discovery: ancestor walk stopped");
    assert.ok(diagnostic);
    assert.equal((diagnostic.arguments[1] as { reason: string }).reason, reason);
    assert.deepEqual(f.errors, []);
  }
  const missingQuickInfo = warn.mock.calls.find((call) => call.arguments[0] === "Structural discovery: Quick Info unavailable");
  assert.ok(missingQuickInfo);
  assert.deepEqual((missingQuickInfo.arguments[1] as { scope: unknown }).scope, SCOPE);
  assert.ok(warn.mock.calls.some((call) => call.arguments[0] === "Structural discovery: parent unavailable"));
});