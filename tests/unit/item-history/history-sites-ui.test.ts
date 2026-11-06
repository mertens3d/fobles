import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { historyStorageKey } from "../../../src/shared/item-history/item-history-model.ts";
import type { HistoryScope } from "../../../src/shared/item-history/item-history.types.ts";
import { knownSitesStorageKey } from "../../../src/shared/known-sites/known-sites-model.ts";
import { createHistoryEnvironment, history, update } from "./history-sites-harness.ts";
import { ITEM, MASTER, OTHER, SITE, TEMPLATE_ID, WEB } from "./history-sites-test.const.ts";
import type { HistorySitesProbeProps } from "./history-sites-test.types.ts";

const NOOP = () => {};
const FLYOUT = { visible: true, pinned: true, show: NOOP, hide: NOOP, scheduleHide: NOOP, cancelHide: NOOP, setPinned: NOOP };

void test("History UI remains responsive before discovery and updates scoped Site prefixes live", async () => {
  const env = createHistoryEnvironment();
  const container = env.doc.createElement("div");
  const root = createRoot(container);
  const historyKey = historyStorageKey(MASTER);
  const siteKey = knownSitesStorageKey(MASTER);
  env.values[historyKey] = [ITEM];
  const show = () => root.render(createElement(history.HistoryTrigger, {
    doc: env.doc, historyFlyout: FLYOUT, onOpen: NOOP, onToggle: NOOP,
  }));
  const label = () => container.querySelector("a")!.textContent;
  try {
    await update(show);
    assert.equal(label(), "(unknown): Home");
    assert.equal(container.querySelector("a")!.getAttribute("href")!.includes("sc_content=master"), true);
    const originalUrl = container.querySelector("a")!.getAttribute("href");
    await update(() => {
      container.querySelector<HTMLButtonElement>("li button")!.click();
    });
    assert.deepEqual(env.messages[0], {
      type: "FOBLES_ITEM_HISTORY_CHANGE", scope: MASTER, change: { action: "remove", id: ITEM.id },
    });

    await update(() => env.emit(siteKey, [SITE]));
    assert.equal(label(), "Alpha: Home");
    assert.deepEqual(history.discovery.validations, [{ scope: MASTER, path: SITE.path }]);
    assert.equal(container.querySelector("a")!.getAttribute("href"), originalUrl);
    assert.equal(container.querySelector("li button")!.getAttribute("aria-label"), "Remove Home");
    assert.deepEqual(env.values[historyKey], [ITEM]);
    assert.deepEqual(Array.from(container.querySelectorAll("h3"), (node) => node.textContent), ["Content"]);

    await update(() => env.emit(siteKey, [{ ...SITE, name: "Renamed" }]));
    assert.equal(label(), "Renamed: Home");
    await update(() => env.emit(knownSitesStorageKey(WEB), [{ ...SITE, name: "Wrong database" }]));
    await update(() => env.emit(knownSitesStorageKey(OTHER), [{ ...SITE, name: "Wrong origin" }]));
    await update(() => env.emit(siteKey, [{ ...SITE, name: "Wrong area" }], "sync"));
    assert.equal(label(), "Renamed: Home");

    await update(() => env.emit(siteKey, [SITE, { ...SITE, id: TEMPLATE_ID, name: "Nested", path: `${SITE.path}/HOME` }]));
    assert.equal(label(), "Nested: Home");
    await update(() => env.emit(siteKey, [{ ...SITE, path: "/sitecore/content/Alph" }]));
    assert.equal(label(), "(unknown): Home");
    await update(() => env.emit(siteKey, [SITE]));
    await update(() => env.emit(siteKey, undefined));
    assert.equal(label(), "(unknown): Home");

    env.values[historyStorageKey(WEB)] = [ITEM];
    env.values[knownSitesStorageKey(WEB)] = [{ ...SITE, name: "Web" }];
    await update(() => env.doc.querySelector("#Ribbon_Database")!.setAttribute("value", "web"), true);
    assert.equal(label(), "Web: Home");
    assert.ok(container.querySelector("a")!.getAttribute("href")!.includes("sc_content=web"));
    await update(() => env.emit(siteKey, [{ ...SITE, name: "Old master" }]));
    assert.equal(label(), "Web: Home");
    assert.deepEqual(env.values[historyKey], [ITEM]);
  } finally {
    await update(() => root.unmount());
    assert.equal(env.listeners.size, 0);
    await env.close();
  }
});

void test("Known Sites subscription beats pending reads; scope changes and unmount discard late results", async () => {
  const env = createHistoryEnvironment();
  const container = env.doc.createElement("div");
  const root = createRoot(container);
  function Probe({ scope }: HistorySitesProbeProps) {
    return createElement("span", null, history.useHistoryKnownSites(scope).map((site) => site.name).join(","));
  }
  const render = (scope: HistoryScope | null) => root.render(createElement(Probe, { scope }));
  const masterKey = knownSitesStorageKey(MASTER);
  env.deferred.add(masterKey);
  try {
    await update(() => render(MASTER));
    assert.equal(container.textContent, "");
    await update(() => env.emit(masterKey, [SITE]));
    assert.equal(container.textContent, "Alpha");
    await update(() => env.pending.get(masterKey)!.resolve({ [masterKey]: [{ ...SITE, name: "Stale read" }] }));
    assert.equal(container.textContent, "Alpha");

    const webKey = knownSitesStorageKey(WEB);
    env.deferred.add(webKey);
    await update(() => render(WEB));
    assert.equal(container.textContent, "");
    env.values[knownSitesStorageKey(OTHER)] = [{ ...SITE, name: "Other origin" }];
    await update(() => render(OTHER));
    assert.equal(container.textContent, "Other origin");
    await update(() => env.pending.get(webKey)!.resolve({ [webKey]: [{ ...SITE, name: "Late web" }] }));
    await update(() => env.emit(masterKey, [SITE]));
    assert.equal(container.textContent, "Other origin");
    assert.ok(history.discovery.validations.some((entry) => entry.scope.origin === OTHER.origin));
    assert.equal(history.discovery.validations.some((entry) => entry.scope.database === "web"), false);

    await update(() => render(null));
    assert.equal(container.textContent, "");
    assert.equal(env.listeners.size, 0);
    await update(() => render(WEB));
    await update(() => root.unmount());
    await update(() => env.pending.get(webKey)!.resolve({ [webKey]: [SITE] }));
    assert.equal(env.listeners.size, 0);
    assert.equal(history.discovery.validations.some((entry) => entry.scope.database === "web"), false);
  } finally {
    await env.close();
  }
});

void test("storage and validation failures leave actual names and cached labels usable", async () => {
  const env = createHistoryEnvironment();
  const container = env.doc.createElement("div");
  const root = createRoot(container);
  const key = knownSitesStorageKey(MASTER);
  env.values[historyStorageKey(MASTER)] = [ITEM];
  env.deferred.add(key);
  history.discovery.error = true;
  try {
    await update(() => root.render(createElement(history.HistoryTrigger, {
      doc: env.doc, historyFlyout: FLYOUT, onOpen: NOOP, onToggle: NOOP,
    })));
    await update(() => env.pending.get(key)!.reject(new Error("Storage unavailable")));
    assert.equal(container.querySelector("a")!.textContent, "(unknown): Home");
    await update(() => env.emit(key, [SITE]));
    assert.equal(container.querySelector("a")!.textContent, "Alpha: Home");
    assert.equal(container.querySelector('[role="alert"]'), null);
    await update(() => container.querySelector<HTMLButtonElement>("header button")!.click());
    assert.deepEqual(env.messages[env.messages.length - 1], {
      type: "FOBLES_ITEM_HISTORY_CHANGE", scope: MASTER, change: { action: "clear" },
    });
  } finally {
    await update(() => root.unmount());
    await env.close();
  }
});