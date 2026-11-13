import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { act, createElement, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createGraphButtonEnvironment, loadGraphButton } from "./graph-button-context-harness.ts";

void test("GraphButton caches its icon at module load and renders/rerenders after extension invalidation", async () => {
  let invalidated = false;
  const getURL = mock.fn((path: string) => {
    if (invalidated) {
      throw new Error("Extension context invalidated.");
    }
    return `chrome-extension://graph-button-test/${path}`;
  });
  const env = createGraphButtonEnvironment(getURL);
  const root = createRoot(env.container, { onUncaughtError: (error) => env.errors.push(error) });
  try {
    const { GraphButton, ICONS, TEXT } = await loadGraphButton();
    assert.equal(getURL.mock.callCount(), 1, "icon resolves before any React render");
    assert.deepEqual(getURL.mock.calls[0].arguments, [ICONS.GRAPH]);
    const cachedUrl = getURL.mock.calls[0].result;
    invalidated = true;

    for (let render = 0; render < 3; render += 1) {
      await assert.doesNotReject(async () => {
        await act(async () => {
          root.render(createElement(StrictMode, null, createElement(GraphButton, { context: { ...env.context } })));
          await Promise.resolve();
        });
      });
      const button = env.container.querySelector("button");
      assert.ok(button, "the actual Graph button remains mounted");
      assert.equal(button.getAttribute("aria-label"), TEXT.GRAPH_TITLE);
      assert.equal(button.title, TEXT.GRAPH_TITLE);
      assert.equal(button.querySelector("img")?.getAttribute("src"), cachedUrl);
      assert.equal(button.querySelector("img")?.alt, "");
      assert.equal(getURL.mock.callCount(), 1, "render and rerender never consult the invalidated runtime");
    }
    assert.deepEqual(env.errors, []);
  } finally {
    try {
      await act(async () => {
        root.unmount();
        await Promise.resolve();
      });
    } finally {
      await env.close();
    }
  }
});

void test("GraphButton loads in an initially invalid context and renders an accessible button without an image", async () => {
  const getURL = mock.fn((_path: string): string => {
    throw new Error("Extension context invalidated.");
  });
  const env = createGraphButtonEnvironment(getURL);
  const root = createRoot(env.container, { onUncaughtError: (error) => env.errors.push(error) });
  try {
    const { GraphButton, ICONS, TEXT } = await loadGraphButton();
    assert.equal(getURL.mock.callCount(), 1, "module load catches the initial runtime failure");
    assert.deepEqual(getURL.mock.calls[0].arguments, [ICONS.GRAPH]);
    assert.match((getURL.mock.calls[0].error as Error).message, /Extension context invalidated\./);

    for (let render = 0; render < 2; render += 1) {
      await assert.doesNotReject(async () => {
        await act(async () => {
          root.render(createElement(StrictMode, null, createElement(GraphButton, { context: { ...env.context } })));
          await Promise.resolve();
        });
      });
      const button = env.container.querySelector("button");
      assert.ok(button);
      assert.equal(button.getAttribute("aria-label"), TEXT.GRAPH_TITLE);
      assert.equal(button.title, TEXT.GRAPH_TITLE);
      assert.equal(button.disabled, false);
      assert.equal(env.container.querySelector("img"), null);
      assert.equal(getURL.mock.callCount(), 1, "a failed icon resolution is cached rather than retried during render");
    }
    assert.deepEqual(env.errors, []);
  } finally {
    try {
      await act(async () => {
        root.unmount();
        await Promise.resolve();
      });
    } finally {
      await env.close();
    }
  }
});
