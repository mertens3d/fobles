import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { Window } from "happy-dom";
import { compileString } from "sass";

void test("toolbar diagnostics stay below buttons in flow and above visible worker iframes", async () => {
  const { css } = compileString(`
    @use "fobles-flyout";
    @use "../toolbar/diagnostics/toolbar-diagnostics";
    @use "iframe-workers";
  `, { loadPaths: [fileURLToPath(new URL("../../../src/content/styles/", import.meta.url))] });
  const win = new Window();
  try {
    const style = win.document.createElement("style");
    style.textContent = css;
    win.document.head.append(style);
    const rules = Array.from(style.sheet!.cssRules);
    function declarations(selector: string) {
      const rule = rules.find((entry) => "selectorText" in entry && entry.selectorText === selector);
      assert.ok(rule && "style" in rule);
      return (rule as unknown as CSSStyleRule).style;
    }
    const toolbar = declarations(".fobles-toolbar-container");
    const diagnostics = declarations(".fobles-toolbar-diagnostics");
    const workers = declarations(".fobles-worker-iframe-container--visible");
    assert.equal(toolbar.getPropertyValue("display"), "grid");
    assert.equal(diagnostics.getPropertyValue("grid-row"), "2");
    assert.equal(diagnostics.getPropertyValue("grid-column"), "2");
    assert.equal(diagnostics.getPropertyValue("contain"), "inline-size");
    assert.equal(diagnostics.getPropertyValue("position"), "");
    assert.doesNotMatch(css, /\[data-position[^}]+> \.fobles-toolbar-diagnostics/);
    assert.ok(Number(toolbar.getPropertyValue("z-index")) > Number(workers.getPropertyValue("z-index")));
  } finally {
    await win.happyDOM.close();
  }
});