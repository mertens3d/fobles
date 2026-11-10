import assert from "node:assert/strict";
import { test } from "node:test";
import {
  normalizeRuntimeSettings,
  initializeRuntimeSettings,
  getRuntimeSettings,
  getStructuralCacheMaxUnvalidatedAgeMs,
} from "../../../src/content/runtime-settings/runtime-settings.ts";
import {
  DEFAULT_RUNTIME_SETTINGS,
  RUNTIME_SETTINGS_LIMITS,
  RUNTIME_SETTINGS_STORAGE_KEY,
} from "../../../src/content/runtime-settings/runtime-settings.const.ts";
import { normalizeStructuralSettings } from "../../../src/shared/structural/structural-settings.ts";
import {
  loadRuntimeSettingsText,
  saveRuntimeSettingsText,
} from "../../../src/content/shared/ui/indexeddb-viewer/runtime-settings-editor-service.ts";

void test("runtime tuning defaults to seven days and a one-second background cooldown", () => {
  const defaults = normalizeRuntimeSettings(undefined);
  assert.equal(defaults.structuralCache.maxUnvalidatedAgeHours, 7 * 24);
  assert.equal(defaults.workerPool.backgroundIntertaskCooldownMs, 1000);
  assert.deepEqual(defaults, DEFAULT_RUNTIME_SETTINGS);
  assert.equal("maxAgeMs" in normalizeStructuralSettings({ maxAgeMs: 1 }), false);
  assert.equal(normalizeRuntimeSettings({ maxAgeMs: 1 }).structuralCache.maxUnvalidatedAgeHours, 7 * 24);
});

void test("runtime age hours is a positive integer; background cooldown is a nonnegative integer", () => {
  for (const value of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, "1000", null]) {
    const settings = normalizeRuntimeSettings({
      structuralCache: { maxUnvalidatedAgeHours: value },
      workerPool: { backgroundIntertaskCooldownMs: value },
    });
    assert.equal(
      settings.structuralCache.maxUnvalidatedAgeHours,
      DEFAULT_RUNTIME_SETTINGS.structuralCache.maxUnvalidatedAgeHours,
    );
    assert.equal(
      settings.workerPool.backgroundIntertaskCooldownMs,
      DEFAULT_RUNTIME_SETTINGS.workerPool.backgroundIntertaskCooldownMs,
    );
  }
  const zero = normalizeRuntimeSettings({
    structuralCache: { maxUnvalidatedAgeHours: 0 },
    workerPool: { backgroundIntertaskCooldownMs: 0 },
  });
  assert.equal(
    zero.structuralCache.maxUnvalidatedAgeHours,
    DEFAULT_RUNTIME_SETTINGS.structuralCache.maxUnvalidatedAgeHours,
  );
  assert.equal(zero.workerPool.backgroundIntertaskCooldownMs, 0);
});

void test("runtime tuning accepts boundary values and converts hours to milliseconds", () => {
  const maximum = normalizeRuntimeSettings({
    structuralCache: { maxUnvalidatedAgeHours: RUNTIME_SETTINGS_LIMITS.MAX_UNVALIDATED_AGE_HOURS },
    workerPool: { backgroundIntertaskCooldownMs: RUNTIME_SETTINGS_LIMITS.MAX_BACKGROUND_INTERTASK_COOLDOWN_MS },
  });
  assert.equal(maximum.structuralCache.maxUnvalidatedAgeHours, RUNTIME_SETTINGS_LIMITS.MAX_UNVALIDATED_AGE_HOURS);
  assert.equal(
    maximum.workerPool.backgroundIntertaskCooldownMs,
    RUNTIME_SETTINGS_LIMITS.MAX_BACKGROUND_INTERTASK_COOLDOWN_MS,
  );
  const oneHour = normalizeRuntimeSettings({ structuralCache: { maxUnvalidatedAgeHours: 1 } });
  getRuntimeSettings().structuralCache.maxUnvalidatedAgeHours = oneHour.structuralCache.maxUnvalidatedAgeHours;
  assert.equal(getStructuralCacheMaxUnvalidatedAgeMs(), 60 * 60 * 1000);
});

void test("runtime JSON editor persists hour tuning and legacy shared age never overrides it", async (t) => {
  const values: Record<string, unknown> = {
    [RUNTIME_SETTINGS_STORAGE_KEY]: {
      structuralCache: { maxUnvalidatedAgeHours: 72 },
      workerPool: { backgroundIntertaskCooldownMs: 27 },
    },
  };
  let changed: ((changes: Record<string, { newValue: unknown }>, area: string) => void) | undefined;
  const original = Object.getOwnPropertyDescriptor(globalThis, "chrome");
  t.after(() => {
    if (original) {
      Object.defineProperty(globalThis, "chrome", original);
    } else {
      Reflect.deleteProperty(globalThis, "chrome");
    }
  });
  Object.defineProperty(globalThis, "chrome", {
    configurable: true,
    value: {
      storage: {
        local: {
          get: () => Promise.resolve(structuredClone(values)),
          set: (updates: Record<string, unknown>) => {
            Object.assign(values, structuredClone(updates));
            changed?.({ [RUNTIME_SETTINGS_STORAGE_KEY]: { newValue: values[RUNTIME_SETTINGS_STORAGE_KEY] } }, "local");
            return Promise.resolve();
          },
        },
        sync: { get: () => Promise.resolve({ foblesStructuralSettings: { maxAgeMs: 1 } }) },
        onChanged: {
          addListener: (listener: typeof changed) => {
            changed = listener;
          },
        },
      },
    },
  });
  await initializeRuntimeSettings();
  const text = await loadRuntimeSettingsText();
  const loaded = normalizeRuntimeSettings(JSON.parse(text));
  assert.equal(loaded.structuralCache.maxUnvalidatedAgeHours, 72);
  assert.equal(loaded.workerPool.backgroundIntertaskCooldownMs, 27);
  loaded.structuralCache.maxUnvalidatedAgeHours = 96;
  loaded.workerPool.backgroundIntertaskCooldownMs = 0;
  const result = await saveRuntimeSettingsText(JSON.stringify(loaded));
  assert.equal(result.ok, true);
  assert.equal(getRuntimeSettings().structuralCache.maxUnvalidatedAgeHours, 96);
  assert.equal(getRuntimeSettings().workerPool.backgroundIntertaskCooldownMs, 0);
  assert.deepEqual(normalizeRuntimeSettings(JSON.parse(await loadRuntimeSettingsText())), loaded);
});
