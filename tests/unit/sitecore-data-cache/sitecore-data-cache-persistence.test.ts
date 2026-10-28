// @source-path [fobles] tests/unit/sitecore-data-cache/sitecore-data-cache-persistence.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import { toPersistedValue } from "../../../src/content/foundation/cache/sitecore-data/sitecore-data-cache-persistence.ts";

const ENVIRONMENT = "https://xmc-sitecore31f55-gregorydemo7b6d-devff6b.sitecorecloud.io";

void test("layout persistence removes empty values and runtime-only properties recursively", () => {
  const persisted = toPersistedValue({
    layoutSectionFields: [{
      name: "Final renderings",
      devices: [{
        scDeviceItem: { type: "scItem", scItemId: "{DEVICE}", facts: {} },
        placements: [{
          path: "headless-main",
          placements: [],
          controls: [{
            rendering: { type: "scItem", scItemId: "{RENDERING}", facts: {} },
            uid: "{UID}",
            parameters: { GridParameters: "{GRID}", FieldNames: "", Styles: "   ", Enabled: false, Count: 0 },
            rawData: { uid: "{UID}", "s:par": "FieldNames&Styles" },
          }],
        }],
        rawData: { id: "{DEVICE}" },
      }],
    }],
  }, ENVIRONMENT);

  assert.deepEqual(persisted, {
    layoutSectionFields: [{
      name: "Final renderings",
      devices: [{
        scDeviceItem: { type: "scItem", scItemId: "{DEVICE}" },
        placements: [{
          path: "headless-main",
          placements: [],
          controls: [{
            rendering: { type: "scItem", scItemId: "{RENDERING}" },
            uid: "{UID}",
            parameters: { GridParameters: "{GRID}", Enabled: false, Count: 0 },
          }],
        }],
      }],
    }],
  });
});

void test("empty values are omitted by value rather than parameter name", () => {
  const persisted = toPersistedValue({ parameters: { FieldNames: "actual value", ArbitraryParameter: "", AnotherParameter: "value" } }, ENVIRONMENT);
  assert.deepEqual(persisted, { parameters: { FieldNames: "actual value", AnotherParameter: "value" } });
});

void test("non-empty external parameter URLs remain absolute", () => {
  const url = "https://feaas.blob.core.windows.net";
  assert.deepEqual(toPersistedValue({ parameters: { ComponentHostName: url } }, ENVIRONMENT), { parameters: { ComponentHostName: url } });
});
