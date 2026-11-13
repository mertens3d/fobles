import assert from "node:assert/strict";
import { test } from "node:test";
import { Window } from "happy-dom";
import { SITECORE } from "../../../src/constants/sitecore.const.ts";
import { createStructuralCommandHandler } from "../../../src/content/shell/structural-command-handler.ts";
import { resolveStructuralCommandScope } from "../../../src/content/shell/structural-command-scope.ts";
import { maintainStructuralScope } from "../../../src/content/shell/structural-maintenance.ts";
import { applyKnownSitesChange, knownSitesStorageKey, normalizeKnownSitesChange } from "../../../src/shared/known-sites/known-sites-model.ts";
import { STRUCTURAL_COMMAND } from "../../../src/shared/structural/structural.const.ts";
import type { StructuralCommandResponse } from "../../../src/shared/structural/structural-command.types.ts";
import { fixture, guid, SCOPE } from "./structural-fixture.ts";

void test("content command requires background sender and rechecks scope between probe and execution", async (t) => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "chrome");
  const id = "fobles-test";
  const getURL = (path: string) => `chrome-extension://${id}/${path}`;
  Object.defineProperty(globalThis, "chrome", { configurable: true, value: { runtime: { id, getURL } } });
  t.after(() => {
    if (original) {
      Object.defineProperty(globalThis, "chrome", original);
    } else {
      Reflect.deleteProperty(globalThis, "chrome");
    }
  });
  let current = SCOPE;
  let executions = 0;
  const listener = createStructuralCommandHandler({ currentScope: () => current, execute: () => {
    executions += 1;
    return Promise.resolve(3);
  } });
  const request = { type: STRUCTURAL_COMMAND.PROBE_MESSAGE as string, action: STRUCTURAL_COMMAND.ACTION.REDISCOVER, scope: SCOPE };
  function send(message = request, sender: chrome.runtime.MessageSender = { id }): Promise<StructuralCommandResponse> {
    return new Promise((resolve) => assert.equal(listener(message, sender, resolve), true));
  }
  assert.deepEqual(await send(), { ok: true, scope: SCOPE, scheduled: 0 });
  assert.equal(executions, 0);
  request.type = STRUCTURAL_COMMAND.EXECUTE_MESSAGE;
  current = { ...SCOPE, database: "web" };
  assert.equal((await send()).ok, false);
  current = { ...SCOPE, origin: "https://foreign.example" };
  assert.equal((await send()).ok, false);
  current = SCOPE;
  for (const sender of [{ id: "foreign" }, { id, tab: { id: 4 } as chrome.tabs.Tab }, { id, url: getURL("options.html") }]) {
    assert.equal((await send(request, sender)).ok, false);
  }
  assert.equal(executions, 0);
  assert.deepEqual(await send(request, { id, url: getURL(STRUCTURAL_COMMAND.BACKGROUND_SCRIPT) }), { ok: true, scope: SCOPE, scheduled: 3 });
  const failing = createStructuralCommandHandler({ currentScope: () => SCOPE, execute: () => Promise.reject(new Error("IndexedDB unavailable")) });
  const response = await new Promise<StructuralCommandResponse>((resolve) => failing(request, { id }, resolve));
  assert.deepEqual(response, { ok: false, error: "IndexedDB unavailable" });
  assert.equal(listener({ type: "unrelated" }, { id }, () => assert.fail()), false);
});

void test("Content Editor commands require explicit database evidence rather than the normal master default", () => {
  const url = new URL(SITECORE.RELATIVE_PATHS_ENCODED.CONTENT_EDITOR_MODERN, SCOPE.origin);
  const win = new Window({ url: url.href });
  const doc = win.document as unknown as Document;
  const browser = win as unknown as globalThis.Window;
  assert.throws(() => resolveStructuralCommandScope(doc, browser), /scope/);
  const input = win.document.createElement("input");
  input.id = "Test_Database";
  input.setAttribute("value", " Web ");
  win.document.body.append(input);
  assert.deepEqual(resolveStructuralCommandScope(doc, browser), { ...SCOPE, database: "web" });
  win.location.href = `${url.href}?${SITECORE.SEARCH_PARAMS.DATABASE_KEYS[0]}=Master`;
  assert.deepEqual(resolveStructuralCommandScope(doc, browser), SCOPE);
  win.location.href = `${SCOPE.origin}/unrelated?${SITECORE.SEARCH_PARAMS.DATABASE_KEYS[0]}=Master`;
  assert.throws(() => resolveStructuralCommandScope(doc, browser), /Content Editor/);
});

void test("maintenance invalidates validation without removing rows and schedules known roots/current history only on rediscover", async () => {
  const f = fixture();
  const site = f.content(20, "/sitecore/content/Site", guid(10));
  const home = f.content(21, "/sitecore/content/Site/Home", guid(11));
  f.bases.set(guid(10), [guid(2)]);
  f.bases.set(guid(11), [guid(1)]);
  f.parents.set(home.id, site.id);
  const row = { ...site, templateId: guid(10), validatedAt: 1000 };
  f.seed(row);
  const web = { ...SCOPE, database: "web" };
  f.seed(row, web);
  const beforeWeb = structuredClone(f.readSites(web));
  const history = [home];
  const beforeHistory = structuredClone(history);
  const calls: string[] = [];
  let failCache = false;
  let failSites = false;
  let changed = false;
  const deps = {
    assertScope: () => {
      if (changed) {
        throw new Error("scope changed");
      }
    },
    invalidateScope: f.service.invalidateScope,
    invalidateCache: () => {
      calls.push("cache");
      return failCache ? Promise.reject(new Error("cache failure")) : Promise.resolve();
    },
    invalidateSites: () => {
      calls.push("sites");
      if (failSites) {
        return Promise.reject(new Error("storage failure"));
      }
      const rows = applyKnownSitesChange(f.readSites(), normalizeKnownSitesChange({ action: "invalidate-validation" }), Date.now());
      f.seed(rows[0]);
      return Promise.resolve(rows);
    },
    readSites: () => Promise.resolve(f.readSites()),
    readHistory: () => {
      calls.push("history");
      return Promise.resolve(history);
    },
    rediscover: f.service.rediscoverScope,
  };
  assert.equal(await maintainStructuralScope(STRUCTURAL_COMMAND.ACTION.INVALIDATE, SCOPE, deps), 0);
  assert.deepEqual(calls, ["cache", "sites"]);
  assert.deepEqual(f.readSites(), [{ ...row, validatedAt: 0 }]);
  assert.equal(f.calls.length, 0);
  assert.equal(await maintainStructuralScope(STRUCTURAL_COMMAND.ACTION.REDISCOVER, SCOPE, deps), 2);
  await f.service.whenIdle();
  assert.equal(f.readSites()[0]?.validatedAt, 1000);
  assert.ok(f.calls.includes(`qi:${site.id}:true`));
  assert.ok(f.calls.includes(`qi:${home.id}:true`));
  assert.deepEqual(f.readSites(web), beforeWeb);
  assert.deepEqual(history, beforeHistory);
  assert.notEqual(knownSitesStorageKey(web), knownSitesStorageKey(SCOPE));
  failCache = true;
  calls.length = 0;
  await assert.rejects(maintainStructuralScope(STRUCTURAL_COMMAND.ACTION.REDISCOVER, SCOPE, deps), /cache failure/);
  assert.deepEqual(calls, ["history", "cache"]);
  failCache = false;
  failSites = true;
  await assert.rejects(maintainStructuralScope(STRUCTURAL_COMMAND.ACTION.REDISCOVER, SCOPE, deps), /storage failure/);
  failSites = false;
  assert.equal(await maintainStructuralScope(STRUCTURAL_COMMAND.ACTION.INVALIDATE, SCOPE, deps), 0);
  calls.length = 0;
  await assert.rejects(maintainStructuralScope(STRUCTURAL_COMMAND.ACTION.REDISCOVER, SCOPE, {
    ...deps,
    invalidateScope: async (_scope, invalidate) => {
      changed = true;
      await invalidate();
    },
  }), /scope changed/);
  assert.deepEqual(calls, []);
  changed = true;
  calls.length = 0;
  await assert.rejects(maintainStructuralScope(STRUCTURAL_COMMAND.ACTION.REDISCOVER, SCOPE, deps), /scope changed/);
  assert.deepEqual(calls, []);
});

void test("rediscovery snapshots queued discovery writes only after the driver drains and before invalidation", async (t) => {
  const f = fixture();
  const site = f.content(20, "/sitecore/content/LateSite", guid(2));
  let release = (): void => {};
  let entered = (): void => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const draining = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const finish = f.driver.finish;
  t.mock.method(f.driver, "finish", async () => {
    entered();
    await gate;
    await finish();
  });
  const reads: string[] = [];
  f.service.scheduleStructuralDiscovery(SCOPE, [site]);
  const maintenance = maintainStructuralScope(STRUCTURAL_COMMAND.ACTION.REDISCOVER, SCOPE, {
    assertScope: () => {},
    invalidateScope: f.service.invalidateScope,
    readSites: () => {
      reads.push("sites");
      return Promise.resolve(f.readSites());
    },
    readHistory: () => {
      reads.push("history");
      return Promise.resolve([]);
    },
    invalidateCache: () => {
      reads.push("cache");
      return Promise.resolve();
    },
    invalidateSites: () => {
      reads.push("invalidate-sites");
      return Promise.resolve();
    },
    rediscover: (scope, sites, visits) => {
      reads.push("schedule");
      assert.deepEqual(sites.map((row) => row.id), [site.id]);
      return f.service.rediscoverScope(scope, sites, visits);
    },
  });
  await draining;
  assert.deepEqual(reads, []);
  release();
  assert.equal(await maintenance, 1);
  await f.service.whenIdle();
  assert.deepEqual(reads, ["sites", "history", "cache", "invalidate-sites", "schedule"]);
  assert.ok(f.calls.includes(`qi:${site.id}:true`));
  assert.deepEqual(f.errors, []);
});