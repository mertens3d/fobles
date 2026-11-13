import assert from "node:assert/strict";
import { test } from "node:test";
import { Window } from "happy-dom";
import { TEMPLATE_BASES_RESTORATION_ERROR_CODE } from "../../../src/content/foundation/harvesting/coordinator/template-bases-lease.const.ts";
import { handleStructuralDiscoveryError } from "../../../src/content/shell/work-session/structural-error-sink.ts";
import { FOBLES_ERROR_DIALOG_ID } from "../../../src/shared/shared.const.ts";

function restorationFailure(): Error {
  return Object.assign(new Error("restoration failed"), { code: TEMPLATE_BASES_RESTORATION_ERROR_CODE });
}

void test("structural restoration failures show the existing persistent dialog through nested and aggregated causes", () => {
  const failure = restorationFailure();
  const errors = [
    failure,
    Object.assign(new Error("Structural background reads failed"), { cause: [new Error("missing read"), failure] }),
    Object.assign(new Error("aggregate"), { errors: [new Error("missing read"), Object.assign(new Error("finish failed"), { cause: [failure] })] }),
    Object.assign(new Error("discovery failed"), { cause: Object.assign(new Error("aggregate"), { errors: [failure] }) }),
  ];
  for (const error of errors) {
    const window = new Window();
    const doc = window.document as unknown as Document;
    handleStructuralDiscoveryError(error, doc);
    const dialog = doc.getElementById(FOBLES_ERROR_DIALOG_ID) as HTMLDialogElement | null;
    assert.ok(dialog);
    assert.equal(dialog.open, true);
    assert.match(dialog.textContent ?? "", /Raw Values/);
    assert.match(dialog.textContent ?? "", /Standard Fields/);
    assert.match(dialog.textContent ?? "", /does not change Standard Fields/);
    assert.match(dialog.textContent ?? "", /reload the Sitecore page/);
    handleStructuralDiscoveryError(error, doc);
    assert.equal(doc.querySelectorAll(`#${FOBLES_ERROR_DIALOG_ID}`).length, 1);
    assert.equal(doc.querySelector("dialog")?.open, true);
    doc.querySelector<HTMLButtonElement>("button")?.click();
    assert.equal(doc.getElementById(FOBLES_ERROR_DIALOG_ID), null);
  }
});

void test("ordinary missing reads and unrelated errors remain log-only, including cyclic cause graphs", () => {
  const cycle = Object.assign(new Error("cycle"), { cause: new Array<unknown>() });
  cycle.cause = [cycle];
  const window = new Window();
  const doc = window.document as unknown as Document;
  const errors: unknown[] = [
    undefined, null, "read failed", new Error("Failed to restore Raw Values after structural read"),
    Object.assign(new Error("Structural background reads failed"), { cause: [new Error("missing read")] }),
    Object.assign(new Error("aggregate"), { errors: [new Error("missing read"), cycle] }), cycle,
    { code: "UNRELATED_ERROR" },
  ];
  for (const error of errors) {
    handleStructuralDiscoveryError(error, doc);
    assert.equal(doc.getElementById(FOBLES_ERROR_DIALOG_ID), null);
  }
});

void test("cyclic aggregate causes do not hide a restoration failure or replace its warning with an ordinary error", () => {
  const cycle = Object.assign(new Error("cycle"), { cause: new Array<unknown>() });
  cycle.cause.push(cycle);
  const window = new Window();
  const doc = window.document as unknown as Document;
  handleStructuralDiscoveryError(Object.assign(new Error("finish failed"), { cause: [cycle, restorationFailure()] }), doc);
  const warning = doc.getElementById(FOBLES_ERROR_DIALOG_ID);
  assert.ok(warning);
  handleStructuralDiscoveryError(new Error("missing read"), doc);
  assert.equal(doc.getElementById(FOBLES_ERROR_DIALOG_ID), warning);
});