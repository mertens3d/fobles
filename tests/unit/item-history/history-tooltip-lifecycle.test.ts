import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HISTORY_CLASS } from "../../../src/content/toolbar/history/history.const.ts";
import { createTooltipEnvironment, tooltipHistory, updateTooltip } from "./history-tooltip-harness.ts";

void test("History is click-only, survives reopen and unmount, and creates no row tooltip", async () => {
  const env = createTooltipEnvironment();
  const root = createRoot(env.container, { onUncaughtError: (error) => env.errors.push(error) });
  const render = (mounted = true) => root.render(createElement(StrictMode, null, createElement(tooltipHistory.Harness, { doc: env.doc, mounted })));
  const tab = () => env.container.querySelector<HTMLButtonElement>(`.${HISTORY_CLASS.TAB}`)!;
  const sibling = () => env.container.querySelector<HTMLButtonElement>("[data-sibling]")!;
  try {
    await updateTooltip(() => render());
    const siblingNode = sibling();
    assert.ok(tab());
    assert.equal(env.doc.getElementById("fobles-history-panel"), null);
    await updateTooltip(() => tab().dispatchEvent(new env.win.MouseEvent("mouseover", { bubbles: true }) as unknown as Event));
    assert.equal(env.doc.getElementById("fobles-history-panel"), null);
    await updateTooltip(() => tab().click());
    assert.ok(env.doc.getElementById("fobles-history-panel"));
    assert.ok(env.doc.querySelector(`.${HISTORY_CLASS.LINK}`));
    assert.equal(env.doc.querySelector('[role="tooltip"]'), null);
    await updateTooltip(() => tab().click());
    assert.equal(env.doc.getElementById("fobles-history-panel"), null);
    await updateTooltip(() => tab().click());
    assert.ok(env.doc.getElementById("fobles-history-panel"));
    await updateTooltip(() => render(false));
    assert.equal(env.doc.getElementById("fobles-history-panel"), null);
    assert.equal(tooltipHistory.probe.subscribers.size, 0);
    await updateTooltip(() => sibling().click());
    assert.equal(sibling(), siblingNode);
    assert.equal(sibling().textContent, "Sibling 1");
    assert.deepEqual(env.errors, []);
  } finally {
    await updateTooltip(() => root.unmount());
    await env.close();
  }
});

void test("History ErrorBoundary preserves toolbar siblings and logs render failures", async () => {
  const env = createTooltipEnvironment();
  const caught: unknown[] = [];
  const root = createRoot(env.container, { onCaughtError: (error) => caught.push(error), onUncaughtError: (error) => env.errors.push(error) });
  const render = () => root.render(createElement(tooltipHistory.Harness, { doc: env.doc, mounted: true }));
  try {
    await updateTooltip(render);
    const sibling = env.container.querySelector<HTMLButtonElement>("[data-sibling]")!;
    tooltipHistory.probe.items = [{ ...tooltipHistory.probe.items[0], id: "invalid-guid" }];
    await updateTooltip(() => tooltipHistory.probe.publish(tooltipHistory.probe.items));
    await updateTooltip(() => env.container.querySelector<HTMLButtonElement>(`.${HISTORY_CLASS.TAB}`)!.click());
    assert.equal(caught.length, 1);
    assert.equal(tooltipHistory.probe.logs.length, 1);
    assert.match((tooltipHistory.probe.logs[0][1] as Error).message, /Invalid history item ID/);
    assert.ok(env.container.querySelector('[role="alert"]'));
    assert.equal(env.container.querySelector("[data-sibling]"), sibling);
    assert.deepEqual(env.errors, []);
  } finally {
    await updateTooltip(() => root.unmount());
    await env.close();
  }
});
