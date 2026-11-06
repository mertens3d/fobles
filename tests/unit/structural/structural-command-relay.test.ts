import assert from "node:assert/strict";
import { test } from "node:test";
import { relayStructuralCommand } from "../../../src/background/structural-command-relay.ts";
import { requestStructuralCommand } from "../../../src/shared/structural/structural-command.ts";
import { STRUCTURAL_COMMAND } from "../../../src/shared/structural/structural.const.ts";
import { SCOPE } from "./structural-fixture.ts";

void test("Options structural relay authenticates, probes canonical origin/database and never retries a mutation", async (t) => {
  const id = "fobles-test";
  const getURL = (path: string) => `chrome-extension://${id}/${path}`;
  const original = Object.getOwnPropertyDescriptor(globalThis, "chrome");
  const runtime = { id, getURL, sendMessage: (_message: unknown): Promise<unknown> => Promise.resolve(undefined) };
  Object.defineProperty(globalThis, "chrome", { configurable: true, value: { runtime } });
  t.after(() => {
    if (original) {
      Object.defineProperty(globalThis, "chrome", original);
    } else {
      Reflect.deleteProperty(globalThis, "chrome");
    }
  });
  const sender = { id, url: getURL(STRUCTURAL_COMMAND.OPTIONS_PAGE) };
  const command = { action: STRUCTURAL_COMMAND.ACTION.REDISCOVER, scope: { origin: "https://SITECORE.example:8443/path?sc_lang=da", database: " Master " } };
  const calls: { tabId: number; message: unknown }[] = [];
  const success = { ok: true, scope: SCOPE, scheduled: 2 };
  let executeError = false;
  let queryCalls = 0;
  const deps = {
    queryTabs: () => {
      queryCalls += 1;
      return Promise.resolve([
        { id: 1, url: "https://foreign.example/sitecore", active: true },
        { id: 2, url: "https://sitecore.example/sitecore", active: true },
        { id: 3, url: `${SCOPE.origin}/sitecore?sc_content=web`, active: true },
        { id: 4, url: `${SCOPE.origin}/sitecore`, active: false, lastAccessed: 200 },
        { id: 5, url: `${SCOPE.origin}/sitecore`, active: false, lastAccessed: 100 },
      ] as chrome.tabs.Tab[]);
    },
    send: (tabId: number, message: unknown): Promise<unknown> => {
      calls.push({ tabId, message });
      const request = message as { type: string };
      if (request.type === STRUCTURAL_COMMAND.PROBE_MESSAGE && tabId === 3) {
        return Promise.resolve({ ok: true, scope: { ...SCOPE, database: "web" }, scheduled: 0 });
      }
      if (request.type === STRUCTURAL_COMMAND.EXECUTE_MESSAGE && executeError) {
        return Promise.reject(new Error("content disconnected"));
      }
      return Promise.resolve(success);
    },
  };
  assert.deepEqual(await relayStructuralCommand(command, sender, deps), success);
  assert.deepEqual(calls.map((call) => call.tabId), [3, 4, 4]);
  assert.deepEqual(calls[2]?.message, { ...command, scope: SCOPE, type: STRUCTURAL_COMMAND.EXECUTE_MESSAGE });
  const probes = calls.length;
  for (const foreign of [
    { ...sender, id: "foreign-extension" },
    { ...sender, url: getURL("popup.html") },
    { ...sender, url: `${SCOPE.origin}/sitecore` },
    { ...sender, tab: { id: 42 } as chrome.tabs.Tab },
  ]) {
    await assert.rejects(relayStructuralCommand(command, foreign, deps), /trusted Options/);
  }
  assert.equal(queryCalls, 1);
  assert.equal(calls.length, probes);
  await assert.rejects(relayStructuralCommand({ ...command, action: "clear" }, sender, deps), /Invalid structural command/);
  await assert.rejects(relayStructuralCommand(command, sender, { ...deps, send: () => Promise.reject(new Error("No receiver")) }), /verified matching/);
  await assert.rejects(relayStructuralCommand(command, sender, { ...deps, send: () => Promise.resolve({ ok: true, scope: { ...SCOPE, origin: "https://foreign.example" }, scheduled: 0 }) }), /verified matching/);
  executeError = true;
  calls.length = 0;
  await assert.rejects(relayStructuralCommand(command, sender, deps), /content disconnected/);
  assert.deepEqual(calls.map((call) => call.tabId), [3, 4, 4]);
  await assert.rejects(relayStructuralCommand(command, sender, {
    ...deps,
    send: (_tabId, message) => Promise.resolve((message as { type: string }).type === STRUCTURAL_COMMAND.PROBE_MESSAGE
      ? success : { ok: false, error: "cache write failed" }),
  }), /cache write failed/);

  t.mock.method(runtime, "sendMessage", (message: unknown) => {
    assert.deepEqual(message, { type: STRUCTURAL_COMMAND.REQUEST_MESSAGE, action: command.action, scope: SCOPE });
    return Promise.resolve(success);
  });
  assert.deepEqual(await requestStructuralCommand(command), success);
  t.mock.method(runtime, "sendMessage", () => Promise.resolve(undefined));
  await assert.rejects(requestStructuralCommand(command), /unavailable/);
  t.mock.method(runtime, "sendMessage", () => Promise.resolve({ ...success, scope: { ...SCOPE, database: "web" } }));
  await assert.rejects(requestStructuralCommand(command), /response scope/);
});