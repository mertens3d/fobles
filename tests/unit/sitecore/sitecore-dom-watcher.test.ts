// @source-path [fobles] tests/unit/sitecore/sitecore-dom-watcher.test.ts

import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { test } from "node:test";
import { Window } from "happy-dom";
import { watchSitecoreDocument } from "../../../src/content/foundation/sitecore/watchers/sitecore-dom-watcher.ts";
import { SITECORE_DOM_WATCHER } from "../../../src/content/foundation/sitecore/watchers/watchers.const.ts";
import type { SitecoreDocumentEvent, SitecoreDocumentSnapshot } from "../../../src/content/foundation/sitecore/watchers/watchers.types.ts";

const ITEM_ID = "{AABBCCDD-1234-5678-9ABC-DEF012345678}";
const NORMALIZED_ID = "aabbccdd-1234-5678-9abc-def012345678";
const SETTLE_MS = SITECORE_DOM_WATCHER.DEBOUNCE_MS + 50;

function editorMarkup(name = "Home"): string {
  return `<input id="Ribbon_Database" value="master"><div id="Editors"><div class="scEditorHeader"></div>
    <table class="scEditorQuickInfo"><tbody>
      <tr><td>Item ID:</td><td><input class="scEditorHeaderQuickInfoInput" readonly value="${ITEM_ID}"></td></tr>
      <tr><td>Item path:</td><td><input class="scEditorHeaderQuickInfoInput" readonly value="/sitecore/content/Home"></td></tr>
      <tr><td>Item name:</td><td><span>${name}</span></td></tr>
    </tbody></table></div>`;
}

function createDocument(): { doc: Document; view: Window } {
  const view = new Window({ url: "https://sitecore.example/sitecore/shell/" });
  view.document.body.innerHTML = editorMarkup();
  return { doc: view.document as unknown as Document, view };
}

void test("subscribers share one watcher, get the current snapshot at once and every later change", async () => {
  const { doc, view } = createDocument();
  const first: SitecoreDocumentSnapshot[] = [];
  const second: SitecoreDocumentSnapshot[] = [];
  const stopFirst = watchSitecoreDocument(doc, ({ snapshot }) => first.push(snapshot));
  const stopSecond = watchSitecoreDocument(doc, ({ snapshot }) => second.push(snapshot));
  try {
    assert.equal(first.length, 1);
    assert.equal(second.length, 1);
    assert.deepEqual(first[0].scope, { origin: "https://sitecore.example", database: "master" });
    assert.equal(first[0].visit?.id, NORMALIZED_ID);
    view.document.querySelector(".scEditorQuickInfo span")!.textContent = "Renamed";
    await delay(SETTLE_MS);
    assert.equal(first.length, 2);
    assert.equal(second.length, 2);
    assert.equal(second[1].visit?.name, "Renamed");
  } finally {
    stopFirst();
    stopSecond();
    void view.happyDOM.abort();
  }
});

void test("a failing listener never blocks the others and the last unsubscribe stops observation", async () => {
  const { doc, view } = createDocument();
  const seen: SitecoreDocumentSnapshot[] = [];
  const stopFailing = watchSitecoreDocument(doc, () => {
    throw new Error("listener failed");
  });
  const stopSeen = watchSitecoreDocument(doc, ({ snapshot }) => seen.push(snapshot));
  try {
    view.document.querySelector(".scEditorQuickInfo span")!.textContent = "Changed";
    await delay(SETTLE_MS);
    assert.equal(seen.length, 2);
    stopFailing();
    stopSeen();
    view.document.querySelector(".scEditorQuickInfo span")!.textContent = "After stop";
    await delay(SETTLE_MS);
    assert.equal(seen.length, 2);
  } finally {
    stopFailing();
    stopSeen();
    void view.happyDOM.abort();
  }
});

void test("popstate arrives as a POP_STATE event with a fresh snapshot", () => {
  const { doc, view } = createDocument();
  const events: SitecoreDocumentEvent[] = [];
  const stop = watchSitecoreDocument(doc, (event) => events.push(event));
  try {
    view.dispatchEvent(new view.Event("popstate"));
    assert.deepEqual(events.map((event) => event.type), [SITECORE_DOM_WATCHER.EVENT.CHANGE, SITECORE_DOM_WATCHER.EVENT.POP_STATE]);
    assert.equal(events[1].snapshot.visit?.id, NORMALIZED_ID);
  } finally {
    stop();
    void view.happyDOM.abort();
  }
});

void test("page hide ends the watcher and a later subscriber starts a fresh one", async () => {
  const { doc, view } = createDocument();
  const before: SitecoreDocumentSnapshot[] = [];
  const stopBefore = watchSitecoreDocument(doc, ({ snapshot }) => before.push(snapshot));
  try {
    view.dispatchEvent(new view.Event("pagehide"));
    view.document.querySelector(".scEditorQuickInfo span")!.textContent = "After pagehide";
    await delay(SETTLE_MS);
    assert.equal(before.length, 1);
    const after: SitecoreDocumentSnapshot[] = [];
    const stopAfter = watchSitecoreDocument(doc, ({ snapshot }) => after.push(snapshot));
    assert.equal(after.length, 1);
    assert.equal(after[0].visit?.name, "After pagehide");
    stopAfter();
  } finally {
    stopBefore();
    void view.happyDOM.abort();
  }
});
