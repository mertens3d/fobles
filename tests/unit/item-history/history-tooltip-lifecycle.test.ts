import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { createElement, StrictMode, type ErrorInfo } from "react";
import { createRoot } from "react-dom/client";
import { HISTORY_CLASS, HISTORY_UI } from "../../../src/content/toolbar/history/history.const.ts";
import { createTooltipEnvironment, tooltipHistory, updateTooltip } from "./history-tooltip-harness.ts";
import type { HistoryTooltipAnchor } from "./history-tooltip-test.types.ts";

void test("real History tooltip survives hover/focus, close/reopen, row updates and repeated unmounts", async () => {
  const env = createTooltipEnvironment();
  const root = createRoot(env.container, { onUncaughtError: (error) => env.errors.push(error) });
  const render = (mounted = true) =>
    root.render(createElement(StrictMode, null, createElement(tooltipHistory.Harness, { doc: env.doc, mounted })));
  const tab = () => env.container.querySelector<HTMLButtonElement>(`.${HISTORY_CLASS.TAB}`)!;
  const row = () => env.container.querySelector<HistoryTooltipAnchor>(`.${HISTORY_CLASS.LINK}`)!;
  const tooltips = () => env.doc.querySelectorAll(`.${HISTORY_CLASS.TOOLTIP}`);
  const sibling = () => env.container.querySelector<HTMLButtonElement>("[data-sibling]")!;
  try {
    await updateTooltip(() => render());
    const toolbar = env.container.firstElementChild;
    const siblingNode = sibling();
    for (let cycle = 0; cycle < 3; cycle += 1) {
      await updateTooltip(() => tab().click());
      const anchor = row();
      const instance = anchor._tippy;
      assert.ok(instance, "actual Tippy instance is installed by the real hook");
      await updateTooltip(() => {
        if (cycle % 2) {
          anchor.focus();
        } else {
          anchor.dispatchEvent(new env.win.MouseEvent("mouseenter") as unknown as Event);
        }
      }, HISTORY_UI.TOOLTIP_DELAY + 30);
      assert.equal(instance.state.isVisible, true);
      assert.equal(tooltips().length, 1);
      assert.ok(tooltips()[0].textContent.includes("Path: /sitecore/content/Home"));
      assert.ok(tooltips()[0].textContent.includes("GUID: {11111111-1111-4111-8111-111111111111}"));
      assert.ok(anchor.getAttribute("aria-describedby")?.includes(instance.popper.id));

      await updateTooltip(() => tab().click());
      assert.equal(instance.state.isDestroyed, true);
      assert.equal(anchor.hasAttribute("aria-describedby"), false);
      assert.equal(tooltips().length, 0);

      await updateTooltip(() => tab().click());
      const pending = row()._tippy;
      await updateTooltip(() => row().focus());
      await updateTooltip(() => render(false), HISTORY_UI.TOOLTIP_DELAY + 30);
      assert.equal(pending.state.isDestroyed, true);
      assert.equal(tooltips().length, 0, "pending show cannot recreate an orphan tooltip");
      assert.equal(tooltipHistory.probe.subscribers.size, 0);
      await updateTooltip(() => sibling().click());
      assert.equal(sibling(), siblingNode);
      assert.equal(sibling().textContent, `Sibling ${cycle + 1}`);
      assert.equal(env.container.firstElementChild, toolbar);
      await updateTooltip(() => render());
    }

    await updateTooltip(() => tab().click());
    await updateTooltip(() => row().focus(), HISTORY_UI.TOOLTIP_DELAY + 30);
    const previous = row()._tippy;
    await updateTooltip(() =>
      tooltipHistory.probe.publish(
        tooltipHistory.probe.items.map((item) => ({
          ...item,
          path: "/sitecore/content/Renamed",
          lastVisitedAt: item.lastVisitedAt + 1,
        })),
      ),
    );
    assert.equal(previous.state.isDestroyed, true);
    assert.notEqual(row()._tippy, previous);
    await updateTooltip(() => {
      row().blur();
      row().focus();
    }, HISTORY_UI.TOOLTIP_DELAY + 30);
    assert.ok(tooltips()[0].textContent.includes("Path: /sitecore/content/Renamed"));
    const active = row()._tippy;
    await updateTooltip(() => root.unmount(), HISTORY_UI.TOOLTIP_DELAY + 30);
    assert.equal(active.state.isDestroyed, true);
    assert.equal(tooltips().length, 0);
    assert.equal(tooltipHistory.probe.subscribers.size, 0);
    assert.deepEqual(env.errors, []);
    assert.deepEqual(tooltipHistory.probe.logs, []);
  } finally {
    await updateTooltip(() => root.unmount());
    await env.close();
  }
});

void test("History cancels its scheduled flyout close when unmounted", async () => {
  const env = createTooltipEnvironment();
  const root = createRoot(env.container);
  const timers = mock.method(env.win, "setTimeout");
  const cancellations = mock.method(env.win, "clearTimeout");
  const render = (mounted: boolean) => root.render(createElement(tooltipHistory.Harness, { doc: env.doc, mounted }));
  try {
    await updateTooltip(() => render(true));
    const actions = env.container.querySelector(`.${HISTORY_CLASS.ACTIONS}`)!;
    await updateTooltip(() =>
      actions.dispatchEvent(
        new env.win.MouseEvent("mouseover", {
          bubbles: true,
          relatedTarget: env.win.document.body,
        }) as unknown as Event,
      ),
    );
    assert.ok(env.container.querySelector(`.${HISTORY_CLASS.PANEL}`));
    const before = timers.mock.callCount();
    await updateTooltip(() =>
      actions.dispatchEvent(
        new env.win.MouseEvent("mouseout", { bubbles: true, relatedTarget: env.win.document.body }) as unknown as Event,
      ),
    );
    assert.equal(timers.mock.callCount(), before + 1);
    const timer = timers.mock.calls[timers.mock.callCount() - 1].result;
    await updateTooltip(() => render(false));
    assert.ok(
      cancellations.mock.calls.some((call) => call.arguments[0] === timer),
      "unmount must cancel the pending close rather than running a stale setState",
    );
  } finally {
    await updateTooltip(() => root.unmount());
    timers.mock.restore();
    cancellations.mock.restore();
    await env.close();
  }
});

for (const failure of ["render", "tooltip effect"] as const) {
  void test(`History isolates a ${failure} failure and logs the original error without removing toolbar siblings`, async () => {
    const env = createTooltipEnvironment();
    const caught: unknown[] = [];
    const root = createRoot(env.container, {
      onCaughtError: (error) => caught.push(error),
      onUncaughtError: (error) => env.errors.push(error),
    });
    const render = (mounted = true) => root.render(createElement(tooltipHistory.Harness, { doc: env.doc, mounted }));
    const fault = new Error("Injected History tooltip setup failure");
    const originalCreate = env.doc.createElement.bind(env.doc);
    let injected = false;
    try {
      await updateTooltip(() => render());
      const sibling = env.container.querySelector<HTMLButtonElement>("[data-sibling]")!;
      if (failure === "render") {
        tooltipHistory.probe.items = [{ ...tooltipHistory.probe.items[0], id: "invalid-guid" }];
        await updateTooltip(() => tooltipHistory.probe.publish(tooltipHistory.probe.items));
      } else {
        mock.method(env.doc, "createElement", (tag: string, options?: ElementCreationOptions) => {
          if (tag === "div" && !injected) {
            injected = true;
            throw fault;
          }
          return originalCreate(tag, options);
        });
      }
      await updateTooltip(() => env.container.querySelector<HTMLButtonElement>(`.${HISTORY_CLASS.TAB}`)!.click());
      assert.equal(caught.length, 1);
      assert.equal(tooltipHistory.probe.logs.length, 1);
      const logged = tooltipHistory.probe.logs[0];
      assert.equal(logged[1], caught[0], "logging preserves the original error, not only a generic message");
      if (failure === "tooltip effect") {
        assert.equal(logged[1], fault);
      } else {
        assert.match((logged[1] as Error).message, /Invalid history item ID/);
      }
      assert.ok((logged[2] as ErrorInfo).componentStack?.includes("HistoryRow"));
      assert.ok(env.container.querySelector('[role="alert"]'));
      assert.equal(env.container.querySelector("[data-sibling]"), sibling);
      await updateTooltip(() => sibling.click());
      assert.equal(sibling.textContent, "Sibling 1");
      assert.equal(env.doc.querySelector(`.${HISTORY_CLASS.TOOLTIP}`), null);
      assert.equal(tooltipHistory.probe.subscribers.size, 0);
      assert.deepEqual(env.errors, []);
      await updateTooltip(() => render(false));
      mock.restoreAll();
      tooltipHistory.probe.items = [{ ...tooltipHistory.probe.items[0], id: "11111111-1111-4111-8111-111111111111" }];
      await updateTooltip(() => render());
      await updateTooltip(() => env.container.querySelector<HTMLButtonElement>(`.${HISTORY_CLASS.TAB}`)!.click());
      assert.ok(env.container.querySelector(`.${HISTORY_CLASS.LINK}`), "remount can recover History");
      assert.equal(env.container.querySelector("[data-sibling]"), sibling);
    } finally {
      mock.restoreAll();
      await updateTooltip(() => root.unmount());
      await env.close();
    }
  });
}
