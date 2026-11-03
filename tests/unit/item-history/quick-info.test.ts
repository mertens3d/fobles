// @source-path [fobles] tests/unit/item-history/quick-info.test.ts

import assert from "node:assert/strict";
import { test } from "node:test";
import { Window } from "happy-dom";
import { getQuickInfo } from "../../../src/content/foundation/sitecore/quick-info.ts";
import { readHistoryVisit, resolveHistoryScope } from "../../../src/content/item-history/quick-info.ts";

const ITEM_ID = "{AABBCCDD-1234-5678-9ABC-DEF012345678}";
const NORMALIZED_ID = "aabbccdd-1234-5678-9abc-def012345678";
const TEMPLATE_ID = "{11111111-2222-3333-4444-555555555555}";

function createWindow(markup = "", url = "https://sitecore.example/sitecore/shell/"): Window {
  const view = new Window({ url });
  view.document.body.innerHTML = markup;
  return view;
}

function documentOf(view: Window): Document {
  return view.document as unknown as Document;
}

function tableMarkup(name = " Home ", id = ITEM_ID, path = " /sitecore/content/Home "): string {
  return `<table class="scEditorQuickInfo"><tbody>
    <tr><td> iTeM Id: </td><td><input class="scEditorHeaderQuickInfoInput" readonly value=" ${id} "></td></tr>
    <tr><td>ITEM PATH:</td><td><input class="scEditorHeaderQuickInfoInput" readonly value="${path}"></td></tr>
    <tr><td>item name:</td><td><span>${name}</span></td></tr>
    <tr><td>Template:</td><td><a> /sitecore/templates/Test </a><input class="scEditorHeaderQuickInfoInputID" readonly value=" ${TEMPLATE_ID} "></td></tr>
  </tbody></table>`;
}

void test("Quick Info reads nested real inputs, trims metadata and distinguishes template ID", () => {
  const view = createWindow(`<section><div>${tableMarkup()}</div></section>`);
  try {
    assert.deepEqual(readHistoryVisit(documentOf(view)), {
      id: NORMALIZED_ID, name: "Home", path: "/sitecore/content/Home",
    });
    assert.deepEqual(getQuickInfo(documentOf(view)).template, {
      id: TEMPLATE_ID, path: "/sitecore/templates/Test",
    });
  } finally {
    void view.happyDOM.abort();
  }
});

void test("Quick Info supports cell text, empty-span fallback, multiple tables and label casing", () => {
  const view = createWindow(`<table class="scEditorQuickInfo"><tr><td>ITEM ID:</td><td>AABBCCDD123456789ABCDEF012345678</td></tr></table>
    <table class="scEditorQuickInfo"><tr><td>Item Path:</td><td> /sitecore/content/Home </td></tr>
    <tr><td>ITEM NAME:</td><td><span> </span> Home </td></tr></table>`);
  try {
    assert.deepEqual(readHistoryVisit(documentOf(view)), {
      id: NORMALIZED_ID, name: "Home", path: "/sitecore/content/Home",
    });
  } finally {
    void view.happyDOM.abort();
  }
});

void test("missing, invalid and transitional metadata never yields a visit or substitutes template ID", () => {
  const view = createWindow();
  try {
    for (const markup of ["", tableMarkup("", ITEM_ID), tableMarkup("Home", "bad-guid"),
      tableMarkup("Home", ITEM_ID, ""), tableMarkup("Home", ITEM_ID, "/not-sitecore/Home"),
      `<table class="scEditorQuickInfo"><tr><td>Template:</td><td><input class="scEditorHeaderQuickInfoInputID" readonly value="${TEMPLATE_ID}"></td></tr></table>`]) {
      view.document.body.innerHTML = markup;
      assert.equal(readHistoryVisit(documentOf(view)), undefined);
    }
  } finally {
    void view.happyDOM.abort();
  }
});

void test("history scope normalizes identity, ignores language, and retains database query precedence", () => {
  const view = createWindow(`<input id="Ribbon_Database" value=" WEB ">`, "https://SITECORE.example:8443/editor?sc_lang=da");
  try {
    assert.deepEqual(resolveHistoryScope(documentOf(view)), { origin: "https://sitecore.example:8443", database: "web" });
    view.happyDOM.setURL("https://sitecore.example:8443/editor?db=Core&sc_lang=en");
    assert.deepEqual(resolveHistoryScope(documentOf(view)), { origin: "https://sitecore.example:8443", database: "core" });
  } finally {
    void view.happyDOM.abort();
  }
});
