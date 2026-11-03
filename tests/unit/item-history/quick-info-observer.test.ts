// @source-path [fobles] tests/unit/item-history/quick-info-observer.test.ts

import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { test } from "node:test";
import { Window } from "happy-dom";
import { readHistoryVisit, resolveHistoryScope } from "../../../src/content/item-history/quick-info.ts";
import { ITEM_HISTORY_CAPTURE } from "../../../src/content/item-history/item-history.const.ts";

const ITEM_ID = "{AABBCCDD-1234-5678-9ABC-DEF012345678}";
const NORMALIZED_ID = "aabbccdd-1234-5678-9abc-def012345678";
const SETTLE_MS = ITEM_HISTORY_CAPTURE.DEBOUNCE_MS + 50;
const ATTACHMENT_SETTLE_MS = ITEM_HISTORY_CAPTURE.ATTACHMENT_CHECK_MS + SETTLE_MS;

function createWindow(markup = ""): Window {
  const view = new Window({ url: "https://sitecore.example/sitecore/shell/" });
  view.document.body.innerHTML = markup;
  return view;
}

function documentOf(view: Window): Document {
  return view.document as unknown as Document;
}

function tableMarkup(name = " Home "): string {
  return `<table class="scEditorQuickInfo"><tbody>
    <tr><td> iTeM Id: </td><td><input class="scEditorHeaderQuickInfoInput" readonly value=" ${ITEM_ID} "></td></tr>
    <tr><td>ITEM PATH:</td><td><input class="scEditorHeaderQuickInfoInput" readonly value=" /sitecore/content/Home "></td></tr>
    <tr><td>item name:</td><td><span>${name}</span></td></tr>
  </tbody></table>`;
}

function editorMarkup(): string {
  return `<input id="Ribbon_Database" value="master"><div id="Editors"><div class="scEditorHeader"></div>
    <div>${tableMarkup()}</div><div id="field">Unrelated field</div></div>`;
}

void test("observer and manager capture lifecycle", async (t) => {
  const messages: unknown[] = [];
  const originalChrome = Object.getOwnPropertyDescriptor(globalThis, "chrome");
  Object.defineProperty(globalThis, "chrome", {
    configurable: true,
    value: {
      runtime: {
        sendMessage: (message: unknown) => {
          messages.push(message);
          return Promise.resolve({ ok: true, history: [] });
        },
      },
      storage: {
        sync: { get: () => Promise.resolve({}) },
        onChanged: {
          addListener() {},
          removeListener() {},
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
  const { observeQuickInfo } = await import("../../../src/content/item-history/quick-info-observer.ts");
  const { startItemHistoryManager } = await import("../../../src/content/item-history/item-history-manager.ts");

  await t.test("initial callback, filtered mutations, debounce, database values and cleanup", async () => {
    const view = createWindow(editorMarkup());
    let callbacks = 0;
    const stop = observeQuickInfo(documentOf(view), () => {
      callbacks += 1;
    });
    try {
      assert.equal(callbacks, 1);
      view.document.querySelector("#field")!.textContent = "Changed unrelated field";
      await delay(SETTLE_MS);
      assert.equal(callbacks, 1);
      const name = view.document.querySelector(".scEditorQuickInfo span")!;
      name.firstChild!.textContent = "First";
      name.firstChild!.textContent = "Second";
      assert.equal(callbacks, 1);
      await delay(SETTLE_MS);
      assert.equal(callbacks, 2);
      view.document.querySelector("#Ribbon_Database")!.setAttribute("value", "web");
      await delay(SETTLE_MS);
      assert.equal(callbacks, 3);
      name.textContent = "Pending";
      await delay(0);
      stop();
      stop();
      await delay(SETTLE_MS);
      assert.equal(callbacks, 3);
    } finally {
      stop();
      void view.happyDOM.abort();
    }
  });

  await t.test("removed/replaced tables trigger capture but unrelated additions do not", async () => {
    const view = createWindow(editorMarkup());
    let callbacks = 0;
    const stop = observeQuickInfo(documentOf(view), () => {
      callbacks += 1;
    });
    try {
      view.document.querySelector("#field")!.innerHTML = "<input value='unrelated'>";
      await delay(SETTLE_MS);
      assert.equal(callbacks, 1);
      view.document.querySelector(".scEditorQuickInfo")!.remove();
      await delay(SETTLE_MS);
      assert.equal(callbacks, 2);
      view.document.querySelector("#Editors")!.insertAdjacentHTML("beforeend", `<section>${tableMarkup()}</section>`);
      await delay(SETTLE_MS);
      assert.equal(callbacks, 3);
      view.dispatchEvent(new view.Event("pagehide"));
      view.document.querySelector(".scEditorQuickInfo span")!.textContent = "After pagehide";
      await delay(SETTLE_MS);
      assert.equal(callbacks, 3);
    } finally {
      stop();
      void view.happyDOM.abort();
    }
  });

  await t.test("header-parent fallback captures property updates signaled by input/change events", async () => {
    const view = createWindow(`<section><div class="scEditorHeader"></div>${tableMarkup()}</section>
      <input id="Ribbon_Database" value="master">`);
    let callbacks = 0;
    const stop = observeQuickInfo(documentOf(view), () => {
      callbacks += 1;
    });
    try {
      const database = documentOf(view).querySelector<HTMLInputElement>("#Ribbon_Database")!;
      database.value = "core";
      database.dispatchEvent(new view.Event("change", { bubbles: true }) as unknown as Event);
      await delay(SETTLE_MS);
      assert.equal(callbacks, 2);
      assert.equal(resolveHistoryScope(documentOf(view)).database, "core");
      const path = documentOf(view).querySelectorAll<HTMLInputElement>(".scEditorHeaderQuickInfoInput")[1];
      path.value = "/sitecore/content/New";
      path.dispatchEvent(new view.Event("input", { bubbles: true }) as unknown as Event);
      await delay(SETTLE_MS);
      assert.equal(callbacks, 3);
      assert.equal(readHistoryVisit(documentOf(view))?.path, "/sitecore/content/New");
    } finally {
      stop();
      void view.happyDOM.abort();
    }
  });

  await t.test("attachment polling discovers editors and pagehide cancels polling", async () => {
    const view = createWindow();
    let callbacks = 0;
    const stop = observeQuickInfo(documentOf(view), () => {
      callbacks += 1;
    });
    try {
      assert.equal(callbacks, 1);
      view.document.body.innerHTML = editorMarkup();
      await delay(ATTACHMENT_SETTLE_MS);
      assert.equal(callbacks, 2);
      stop();
      const empty = createWindow();
      try {
        let emptyCallbacks = 0;
        observeQuickInfo(documentOf(empty), () => {
          emptyCallbacks += 1;
        });
        empty.dispatchEvent(new empty.Event("pagehide"));
        empty.document.body.innerHTML = editorMarkup();
        await delay(ATTACHMENT_SETTLE_MS);
        assert.equal(emptyCallbacks, 1);
      } finally {
        void empty.happyDOM.abort();
      }
    } finally {
      stop();
      void view.happyDOM.abort();
    }
  });

  await t.test("editor replacement and temporary absence restore capture without duplicate observers", async () => {
    const view = createWindow(editorMarkup());
    const visits: Array<string | undefined> = [];
    const stop = observeQuickInfo(documentOf(view), () => {
      visits.push(readHistoryVisit(documentOf(view))?.name);
    });
    try {
      const oldEditor = view.document.querySelector("#Editors")!;
      const replacement = view.document.createElement("div");
      replacement.id = "Editors";
      replacement.innerHTML = tableMarkup("Replacement");
      oldEditor.parentNode!.replaceChild(replacement, oldEditor);
      await delay(ATTACHMENT_SETTLE_MS);
      assert.deepEqual(visits, ["Home", "Replacement"]);
      oldEditor.querySelector("span")!.textContent = "Detached";
      await delay(SETTLE_MS);
      assert.equal(visits.length, 2);
      view.document.querySelector(".scEditorQuickInfo span")!.textContent = "Live";
      await delay(SETTLE_MS);
      assert.deepEqual(visits, ["Home", "Replacement", "Live"]);
      view.document.querySelector("#Editors")!.remove();
      await delay(ATTACHMENT_SETTLE_MS);
      assert.equal(visits[visits.length - 1], undefined);
      view.document.body.insertAdjacentHTML("beforeend", `<div id="Editors">${tableMarkup("Restored")}</div>`);
      await delay(ATTACHMENT_SETTLE_MS);
      assert.deepEqual(visits, ["Home", "Replacement", "Live", undefined, "Restored"]);
      view.document.querySelector(".scEditorQuickInfo span")!.textContent = "Restored live";
      await delay(SETTLE_MS);
      assert.equal(visits[visits.length - 1], "Restored live");
      await delay(ATTACHMENT_SETTLE_MS);
      assert.equal(visits.length, 6);
      view.dispatchEvent(new view.Event("pagehide"));
      view.document.body.innerHTML = editorMarkup();
      await delay(ATTACHMENT_SETTLE_MS);
      assert.equal(visits.length, 6);
    } finally {
      stop();
      void view.happyDOM.abort();
    }
  });

  await t.test("manager captures external database replacements and observes their later value changes", async () => {
    messages.length = 0;
    const view = createWindow(editorMarkup());
    const stop = startItemHistoryManager(documentOf(view));
    try {
      const oldDatabase = view.document.querySelector("#Ribbon_Database")!;
      oldDatabase.outerHTML = '<input id="Ribbon_Database" value="web">';
      await delay(ATTACHMENT_SETTLE_MS);
      assert.equal(messages.length, 2);
      assert.deepEqual(messages[1], {
        type: "FOBLES_ITEM_HISTORY_CHANGE", scope: { origin: "https://sitecore.example", database: "web" },
        change: { action: "visit", visit: { id: NORMALIZED_ID, name: "Home", path: "/sitecore/content/Home" } },
      });
      view.document.querySelector("#Ribbon_Database")!.setAttribute("value", "core");
      await delay(SETTLE_MS);
      assert.equal(messages.length, 3);
      assert.deepEqual(messages[2], {
        type: "FOBLES_ITEM_HISTORY_CHANGE", scope: { origin: "https://sitecore.example", database: "core" },
        change: { action: "visit", visit: { id: NORMALIZED_ID, name: "Home", path: "/sitecore/content/Home" } },
      });
      view.dispatchEvent(new view.Event("pagehide"));
      view.document.querySelector("#Ribbon_Database")!.outerHTML = '<input id="Ribbon_Database" value="master">';
      await delay(ATTACHMENT_SETTLE_MS);
      assert.equal(messages.length, 3);
    } finally {
      stop();
      void view.happyDOM.abort();
    }
  });

  await t.test("manager deduplicates complete snapshots, survives transitions and tracks metadata/scope", async () => {
    messages.length = 0;
    const view = createWindow(editorMarkup());
    const doc = documentOf(view);
    const stop = startItemHistoryManager(doc);
    try {
      assert.equal(startItemHistoryManager(doc), stop);
      assert.equal(messages.length, 1);
      const name = view.document.querySelector(".scEditorQuickInfo span")!;
      name.textContent = " Home ";
      await delay(SETTLE_MS);
      assert.equal(messages.length, 1);
      name.textContent = "";
      await delay(SETTLE_MS);
      name.textContent = "Home";
      await delay(SETTLE_MS);
      assert.equal(messages.length, 1);
      name.textContent = "Renamed";
      await delay(SETTLE_MS);
      assert.equal(messages.length, 2);
      const inputs = view.document.querySelectorAll(".scEditorHeaderQuickInfoInput");
      inputs[1].setAttribute("value", "/sitecore/content/Moved");
      await delay(SETTLE_MS);
      assert.equal(messages.length, 3);
      const database = view.document.querySelector("#Ribbon_Database")!;
      database.setAttribute("value", "web");
      await delay(SETTLE_MS);
      assert.equal(messages.length, 4);
      assert.deepEqual(messages[3], {
        type: "FOBLES_ITEM_HISTORY_CHANGE", scope: { origin: "https://sitecore.example", database: "web" },
        change: { action: "visit", visit: { id: NORMALIZED_ID, name: "Renamed", path: "/sitecore/content/Moved" } },
      });
      view.dispatchEvent(new view.Event("pagehide"));
      name.textContent = "Ignored";
      await delay(SETTLE_MS);
      assert.equal(messages.length, 4);
    } finally {
      stop();
      void view.happyDOM.abort();
    }
  });
});