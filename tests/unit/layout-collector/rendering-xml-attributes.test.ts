// @source-path [fobles] tests/unit/layout-collector/rendering-xml-attributes.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readRenderingAttribute } from "../../../src/content/foundation/harvesting/collectors/section-collector/layout-collector/rendering-xml-attributes.ts";
import type { SitecoreRenderingXml } from "../../../src/content/foundation/harvesting/collectors/section-collector/layout-collector/sitecore-layout-xml-schema.types";

const RENDERING_ID = "{493B3A83-0FA7-4484-8FC9-4680991CF743}";

// AI NOTE: This is the exact shape the shared "Renderings" field parses to (copied from a real Reference Model dump).
const plainRendering: SitecoreRenderingXml = { ds: "", id: RENDERING_ID, par: "", ph: "content", uid: "{A08C9132-DBD1-474F-A2CA-6CA26A4AA650}" };
const prefixedRendering: SitecoreRenderingXml = { uid: "{A08C9132-DBD1-474F-A2CA-6CA26A4AA650}", "s:ds": "local:/Data/Hero", "s:id": RENDERING_ID, "s:par": "FieldNames=Hero", "s:ph": "/main/centercolumn" };

void test("reads the plain attributes of the shared Renderings field", () => {
  assert.equal(readRenderingAttribute(plainRendering, "id"), RENDERING_ID);
  assert.equal(readRenderingAttribute(plainRendering, "ph"), "content");
});

void test("reads the s:-prefixed attributes of the Final renderings delta", () => {
  assert.equal(readRenderingAttribute(prefixedRendering, "id"), RENDERING_ID);
  assert.equal(readRenderingAttribute(prefixedRendering, "ph"), "/main/centercolumn");
  assert.equal(readRenderingAttribute(prefixedRendering, "ds"), "local:/Data/Hero");
  assert.equal(readRenderingAttribute(prefixedRendering, "par"), "FieldNames=Hero");
});

void test("an empty plain attribute stays an empty string, not undefined", () => {
  assert.equal(readRenderingAttribute(plainRendering, "ds"), "");
  assert.equal(readRenderingAttribute(plainRendering, "par"), "");
});

void test("an absent attribute is undefined in both formats", () => {
  assert.equal(readRenderingAttribute({ uid: "{X}" }, "id"), undefined);
  assert.equal(readRenderingAttribute({ uid: "{X}" }, "ph"), undefined);
});

void test("the plain attribute wins when both forms are present", () => {
  assert.equal(readRenderingAttribute({ id: "{PLAIN}", "s:id": "{PREFIXED}" }, "id"), "{PLAIN}");
});
