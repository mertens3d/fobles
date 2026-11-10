// @source-path [fobles] tests/unit/item-history/item-history-repository.test.ts

import assert from "node:assert/strict";
import { test } from "node:test";
import { FOBLES_ITEM_HISTORY_CHANGE } from "../../../src/shared/item-history/item-history.const.ts";
import { historyStorageKey } from "../../../src/shared/item-history/item-history-model.ts";
import { getHistory } from "../../../src/shared/item-history/item-history-repository.ts";
import type {
  HistoryChange,
  HistoryChangeResponse,
  HistoryScope,
  HistoryVisit,
} from "../../../src/shared/item-history/item-history.types.ts";
import type { StorageListener, MessageListener } from "./StorageListener.types.ts";

const EXTENSION_ID = "fobles-test-extension";
const MASTER: HistoryScope = { origin: "https://sitecore.example", database: "master" };
const WEB: HistoryScope = { ...MASTER, database: "web" };
const SENDER: chrome.runtime.MessageSender = {
  id: EXTENSION_ID,
  origin: MASTER.origin,
  url: `${MASTER.origin}/sitecore/shell/`,
};

function visit(index: number): HistoryVisit {
  return {
    id: `00000000-0000-0000-0000-${index.toString(16).padStart(12, "0")}`,
    name: `Item ${index}`,
    path: `/sitecore/content/Item ${index}`,
  };
}

function message(change: HistoryChange, scope = MASTER): unknown {
  return { type: FOBLES_ITEM_HISTORY_CHANGE, scope, change };
}

void test("item history repository background writer", { timeout: 5000 }, async (t) => {
  const values: Record<string, unknown> = {};
  const storageListeners = new Set<StorageListener>();
  let listener: MessageListener | undefined;
  let failure: "get" | "set" | undefined;
  let setCalls = 0;
  const originalChrome = Object.getOwnPropertyDescriptor(globalThis, "chrome");

  function get(keys: string[] | string | Record<string, unknown> | null = null): Promise<Record<string, unknown>> {
    let result: Promise<Record<string, unknown>>;
    if (failure === "get") {
      failure = undefined;
      result = Promise.reject(new Error("Storage get failed"));
    } else {
      const defaults = typeof keys === "object" && keys !== null && !Array.isArray(keys) ? keys : {};
      const requested = keys === null ? Object.keys(values) : typeof keys === "string" ? [keys] : Object.keys(defaults);
      const selected = Array.isArray(keys) ? keys : requested;
      const entries = selected.filter((key) => key in values || key in defaults)
        .map((key) => [key, key in values ? values[key] : defaults[key]]);
      result = Promise.resolve(structuredClone(Object.fromEntries(entries)) as Record<string, unknown>);
    }
    return result;
  }

  function set(next: Record<string, unknown>): Promise<void> {
    setCalls += 1;
    let result: Promise<void>;
    if (failure === "set") {
      failure = undefined;
      result = Promise.reject(new Error("Storage set failed"));
    } else {
      const changes: Record<string, chrome.storage.StorageChange> = {};
      for (const [key, value] of Object.entries(next)) {
        changes[key] = { oldValue: structuredClone(values[key]), newValue: structuredClone(value) };
        values[key] = structuredClone(value);
      }
      for (const storageListener of storageListeners) {
        storageListener(changes, "local");
      }
      result = Promise.resolve();
    }
    return result;
  }

  Object.defineProperty(globalThis, "chrome", {
    configurable: true,
    value: {
      runtime: {
        id: EXTENSION_ID,
        onMessage: {
          addListener(callback: MessageListener): void {
            listener = callback;
          },
        },
      },
      storage: {
        local: { get, set },
        onChanged: {
          addListener(callback: StorageListener): void {
            storageListeners.add(callback);
          },
          removeListener(callback: StorageListener): void {
            storageListeners.delete(callback);
          },
        },
      },
    },
  });
  t.after(() => {
    if (originalChrome) {
      Object.defineProperty(globalThis, "chrome", originalChrome);
    } else {
      Reflect.deleteProperty(globalThis, "chrome");
    }
  });
  t.beforeEach(() => {
    for (const key of Object.keys(values)) {
      delete values[key];
    }
    failure = undefined;
    setCalls = 0;
  });

  await import("../../../src/background/item-history-registration.ts");
  assert.ok(listener);

  function send(request: unknown, sender = SENDER, keepChannelOpen = true): Promise<HistoryChangeResponse> {
    assert.ok(listener);
    const receive = listener;
    const response = new Promise<HistoryChangeResponse>((resolve) => {
      const channelOpen = receive(request, sender, resolve);
      assert.equal(channelOpen, keepChannelOpen);
    });
    return response;
  }

  await t.test("two concurrent visits preserve both in persisted history", async () => {
    const first = send(message({ action: "visit", visit: visit(1) }));
    const second = send(message({ action: "visit", visit: visit(2) }));
    const responses = await Promise.all([first, second]);
    assert.equal(responses[0].ok, true);
    assert.equal(responses[1].ok, true);
    const history = await getHistory(MASTER);
    assert.deepEqual(history.map((item) => item.id), [visit(2).id, visit(1).id]);
    assert.deepEqual(values[historyStorageKey(MASTER)], history);
    assert.deepEqual(responses[1], { ok: true, history });
    assert.equal(setCalls, 2);
  });

  await t.test("persists at most 20 unique visits without mocking Date.now", async () => {
    const responses = await Promise.all(Array.from({ length: 25 }, (_, index) =>
      send(message({ action: "visit", visit: visit(index) }))));
    assert.ok(responses.every((response) => response.ok));
    const history = await getHistory(MASTER);
    assert.equal(history.length, 20);
    assert.equal(new Set(history.map((item) => item.id)).size, 20);
    assert.deepEqual(new Set(history.map((item) => item.id)),
      new Set(Array.from({ length: 20 }, (_, index) => visit(index + 5).id)));
    assert.ok(history.every((item) => Number.isFinite(item.lastVisitedAt) && item.lastVisitedAt > 0));
    assert.deepEqual(values[historyStorageKey(MASTER)], history);
    assert.deepEqual(responses[24], { ok: true, history: values[historyStorageKey(MASTER)] });
  });

  await t.test("remove one and clear master leave web scope unchanged", async () => {
    await Promise.all([
      send(message({ action: "visit", visit: visit(1) })),
      send(message({ action: "visit", visit: visit(2) })),
      send(message({ action: "visit", visit: visit(1) }, WEB)),
    ]);
    const webSnapshot = structuredClone(values[historyStorageKey(WEB)]);
    const removed = await send(message({ action: "remove", id: visit(1).id }));
    assert.equal(removed.ok, true);
    assert.deepEqual((await getHistory(MASTER)).map((item) => item.id), [visit(2).id]);
    assert.deepEqual(values[historyStorageKey(WEB)], webSnapshot);
    assert.deepEqual(await send(message({ action: "clear" })), { ok: true, history: [] });
    assert.deepEqual(values[historyStorageKey(MASTER)], []);
    assert.deepEqual(values[historyStorageKey(WEB)], webSnapshot);
    assert.deepEqual(await getHistory(WEB), webSnapshot);
  });

  await t.test("mismatching sender origins or IDs and malformed requests never mutate storage", async () => {
    await send(message({ action: "visit", visit: visit(1) }));
    const snapshot = structuredClone(values);
    const writes = setCalls;
    for (const sender of [
      { ...SENDER, url: "https://other.example/sitecore/" },
      { ...SENDER, origin: "https://other.example" },
      { ...SENDER, id: "another-extension" },
    ]) {
      const response = await send(message({ action: "clear" }), sender, false);
      assert.equal(response.ok, false);
    }
    for (const request of [
      { type: FOBLES_ITEM_HISTORY_CHANGE },
      { type: FOBLES_ITEM_HISTORY_CHANGE, scope: {}, change: { action: "clear" } },
      { type: FOBLES_ITEM_HISTORY_CHANGE, scope: MASTER, change: { action: "unknown" } },
      { type: FOBLES_ITEM_HISTORY_CHANGE, scope: MASTER, change: { action: "remove", id: "bad" } },
      { type: FOBLES_ITEM_HISTORY_CHANGE, scope: MASTER, change: { action: "visit", visit: {} } },
    ]) {
      const response = await send(request, SENDER, false);
      assert.equal(response.ok, false);
    }
    assert.deepEqual(values, snapshot);
    assert.equal(setCalls, writes);
  });

  for (const operation of ["get", "set"] as const) {
    await t.test(`storage ${operation} failure returns false and queued writes recover`, async () => {
      await send(message({ action: "visit", visit: visit(1) }));
      const snapshot = structuredClone(values);
      failure = operation;
      const failed = send(message({ action: "visit", visit: visit(2) }));
      const recovered = send(message({ action: "visit", visit: visit(3) }));
      assert.deepEqual(await failed, { ok: false, error: `Storage ${operation} failed` });
      assert.deepEqual(await recovered, { ok: true, history: await getHistory(MASTER) });
      const history = await getHistory(MASTER);
      assert.deepEqual(history.map((item) => item.id), [visit(3).id, visit(1).id]);
      assert.deepEqual(values[historyStorageKey(MASTER)], history);
      assert.notDeepEqual(values, snapshot);
    });
  }
});