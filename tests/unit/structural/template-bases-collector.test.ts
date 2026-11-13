import assert from "node:assert/strict";
import { test } from "node:test";
import { Window } from "happy-dom";
import {
  collectTemplateBases,
  collectTemplateBasesFromSections,
} from "../../../src/content/foundation/harvesting/collectors/template-bases-collector.ts";
import { guid } from "./structural-fixture.ts";
import { SITECORE } from "../../../src/constants/sitecore.const.ts";

void test("targeted direct-base collector preserves unavailable versus genuinely empty and ignores other fields", () => {
  const window = new Window();
  const doc = window.document as unknown as Document;
  const markerClass = SITECORE.SELECTORS.EDITOR_FIELD_MARKER.slice(1);
  const labelClass = SITECORE.SELECTORS.FIELD_LABEL.slice(1);
  const controlClass = SITECORE.SELECTORS.CONTENT_CONTROL.slice(1);
  const label = SITECORE.ITEM_KIND.FIELD_LABELS.BASE_TEMPLATE;
  doc.body.innerHTML = `<div class="${markerClass}"><div class="${labelClass}">Other field:</div><input class="${controlClass}" value="${guid(20)}"></div>`;
  assert.equal(collectTemplateBases(doc), undefined);
  doc.body.innerHTML += `<div class="${markerClass}"><div class="${labelClass}">${label}:</div></div>`;
  assert.equal(collectTemplateBases(doc), undefined);
  const markers = doc.querySelectorAll<HTMLElement>(SITECORE.SELECTORS.EDITOR_FIELD_MARKER);
  const marker = markers[markers.length - 1];
  marker.innerHTML += `<input class="${controlClass}" value="">`;
  assert.deepEqual(collectTemplateBases(doc), []);
  const input = marker.querySelector<HTMLInputElement>(SITECORE.SELECTORS.CONTENT_CONTROL)!;
  input.value = `{${guid(2)}}|${guid(3)}|${guid(2)}`;
  assert.deepEqual(collectTemplateBases(doc), [guid(2), guid(3)]);
  input.value = "not a GUID";
  assert.equal(collectTemplateBases(doc), undefined);
  input.remove();
  marker.innerHTML += `<div class="scContentControl scContentControlTreelist"><div class="scContentControlTreelistSelected"><select class="scContentControlMultilistBox"><option value="${guid(2)}">Site</option></select></div></div>`;
  const pane = marker.querySelector(".scContentControlTreelistSelected")!;
  const expectedPaneClass = SITECORE.SELECTORS.TREE.LIST_SELECTED_PANE;
  if (expectedPaneClass.startsWith(".")) {
    pane.className = expectedPaneClass.slice(1);
  }
  assert.deepEqual(collectTemplateBases(doc), [guid(2)]);
  marker.insertAdjacentHTML("afterbegin", `<input class="${controlClass}" value="friendly display text">`);
  assert.deepEqual(collectTemplateBases(doc), [guid(2)]);
  marker.querySelector<HTMLInputElement>("input")!.value = "";
  assert.deepEqual(collectTemplateBases(doc), [guid(2)]);
});

void test("harvested sections only supply bases from an explicitly readable base field", () => {
  const field = {
    label: SITECORE.ITEM_KIND.FIELD_LABELS.BASE_TEMPLATE,
    value: `{${guid(2)}}|${guid(2)}`,
    links: [],
    rawMarkup: undefined,
  };
  assert.deepEqual(collectTemplateBasesFromSections([{ name: "Data", fields: [field] }]), [guid(2)]);
  assert.equal(
    collectTemplateBasesFromSections([{ name: "Data", fields: [{ ...field, value: undefined }] }]),
    undefined,
  );
  assert.equal(collectTemplateBasesFromSections([{ name: "Data", fields: [{ ...field, value: "Site" }] }]), undefined);
  assert.deepEqual(collectTemplateBasesFromSections([{ name: "Data", fields: [{ ...field, value: "" }] }]), []);
  assert.equal(collectTemplateBasesFromSections([]), undefined);
});
