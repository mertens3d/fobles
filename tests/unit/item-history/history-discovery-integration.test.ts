import assert from "node:assert/strict";
import { test } from "node:test";
import { createHistoryEnvironment, history, update } from "./history-sites-harness.ts";
import { ITEM_ID, MASTER, WEB } from "./history-sites-test.const.ts";

void test("visits schedule nonblocking discovery without a toolbar or LBolt and retain actual names", async () => {
  const env = createHistoryEnvironment();
  const stop = history.startItemHistoryManager(env.doc);
  const visit = { id: ITEM_ID, name: "Home", path: "/sitecore/content/Alpha/Home" };
  try {
    assert.equal(history.startItemHistoryManager(env.doc), stop);
    assert.deepEqual(env.messages, [{ type: "FOBLES_ITEM_HISTORY_CHANGE", scope: MASTER, change: { action: "visit", visit } }]);
    await update(() => {});
    assert.deepEqual(history.discovery.visits, [{ scope: MASTER, visits: [visit] }]);
    await update(() => env.doc.querySelector("span")!.textContent = "Home", true);
    assert.equal(history.discovery.visits.length, 1);
    await update(() => env.doc.querySelector("#Ribbon_Database")!.setAttribute("value", "web"), true);
    assert.deepEqual(history.discovery.visits[1], { scope: WEB, visits: [visit] });
    history.discovery.error = true;
    await update(() => env.doc.querySelector("span")!.textContent = "Renamed", true);
    assert.equal(env.messages.length, 3);
    assert.deepEqual(env.messages[2], {
      type: "FOBLES_ITEM_HISTORY_CHANGE", scope: WEB, change: { action: "visit", visit: { ...visit, name: "Renamed" } },
    });
    stop();
    await update(() => env.doc.querySelector("span")!.textContent = "Stopped", true);
    assert.equal(env.messages.length, 3);
  } finally {
    stop();
    await env.close();
  }
});

void test("deferred visit discovery is discarded after cleanup or a database/origin change", async () => {
  for (const transition of ["cleanup", "database", "origin"] as const) {
    const env = createHistoryEnvironment();
    const stop = history.startItemHistoryManager(env.doc);
    try {
      if (transition === "cleanup") {
        stop();
      } else if (transition === "database") {
        env.doc.querySelector<HTMLInputElement>("#Ribbon_Database")!.value = "web";
      } else {
        env.win.happyDOM.setURL("https://other.example/sitecore/shell/");
      }
      await update(() => {});
      assert.equal(env.messages.length, 1);
      assert.deepEqual(history.discovery.visits, []);
    } finally {
      stop();
      await env.close();
    }
  }
});