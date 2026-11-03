// @source-path [fobles] tests/unit/shared-window/fobles-window-geometry-math.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  centeredRect,
  clampRect,
  parsePersistedFoblesWindowState,
} from "../../../src/content/shared/dialog/fobles-window-geometry-math.ts";

function fakeWindow(innerWidth: number, innerHeight: number): Window {
  return { innerWidth, innerHeight } as unknown as Window;
}

const WIN = fakeWindow(1200, 800);

void test("clampRect keeps an in-bounds rect unchanged", () => {
  const rect = { left: 100, top: 100, width: 400, height: 300 };
  assert.deepEqual(clampRect(WIN, rect, 200, 150), rect);
});

void test("clampRect enforces minimum width and height", () => {
  const result = clampRect(WIN, { left: 100, top: 100, width: -50, height: 0 }, 200, 150);
  assert.equal(result.width, 200);
  assert.equal(result.height, 150);
});

void test("clampRect shrinks a rect larger than the viewport", () => {
  const result = clampRect(WIN, { left: 0, top: 0, width: 5000, height: 4000 }, 100, 100);
  assert.equal(result.width, 1200 - 12 * 2);
  assert.equal(result.height, 800 - 12 * 2);
});

void test("clampRect pulls an off-viewport position back into bounds", () => {
  const result = clampRect(WIN, { left: -9000, top: 9000, width: 400, height: 300 }, 100, 100);
  assert.equal(result.left, 12);
  assert.ok(result.top < 800 && result.top >= 12);
});

void test("centeredRect centers within the viewport", () => {
  const result = centeredRect(WIN, 400, 300, 100, 100);
  assert.equal(result.left, Math.round((1200 - 400) / 2));
  assert.equal(result.top, Math.round((800 - 300) / 2));
});

void test("parsePersistedFoblesWindowState accepts the current typed record", () => {
  const stored = {
    type: "foblesWindowState",
    left: 50,
    top: 50,
    width: 400,
    height: 300,
    collapsed: false,
    maximized: false,
  };
  const result = parsePersistedFoblesWindowState(stored, WIN, 100, 100);
  assert.deepEqual(result, { left: 50, top: 50, width: 400, height: 300, collapsed: false, maximized: false });
});

void test("parsePersistedFoblesWindowState accepts a legacy record with no type field", () => {
  const stored = { left: 50, top: 50, width: 400, height: 300 };
  const result = parsePersistedFoblesWindowState(stored, WIN, 100, 100);
  assert.deepEqual(result, { left: 50, top: 50, width: 400, height: 300, collapsed: false, maximized: false });
});

void test("parsePersistedFoblesWindowState defaults missing collapsed/maximized to false", () => {
  const result = parsePersistedFoblesWindowState({ left: 0, top: 0, width: 400, height: 300 }, WIN, 100, 100);
  assert.equal(result?.collapsed, false);
  assert.equal(result?.maximized, false);
});

void test("parsePersistedFoblesWindowState ignores unknown extra fields", () => {
  const result = parsePersistedFoblesWindowState(
    { left: 0, top: 0, width: 400, height: 300, somethingUnknown: "x" },
    WIN,
    100,
    100,
  );
  assert.deepEqual(Object.keys(result ?? {}).sort(), ["collapsed", "height", "left", "maximized", "top", "width"]);
});

void test("parsePersistedFoblesWindowState rejects an unknown discriminator", () => {
  const result = parsePersistedFoblesWindowState(
    { type: "somethingElse", left: 0, top: 0, width: 400, height: 300 },
    WIN,
    100,
    100,
  );
  assert.equal(result, undefined);
});

void test("parsePersistedFoblesWindowState clamps negative persisted dimensions to the minimum", () => {
  const result = parsePersistedFoblesWindowState({ left: 0, top: 0, width: -10, height: -10 }, WIN, 200, 150);
  assert.equal(result?.width, 200);
  assert.equal(result?.height, 150);
});

void test("parsePersistedFoblesWindowState rejects NaN dimensions", () => {
  const result = parsePersistedFoblesWindowState({ left: 0, top: 0, width: Number.NaN, height: 300 }, WIN, 100, 100);
  assert.equal(result, undefined);
});

void test("parsePersistedFoblesWindowState rejects Infinity dimensions", () => {
  const result = parsePersistedFoblesWindowState(
    { left: 0, top: 0, width: Number.POSITIVE_INFINITY, height: 300 },
    WIN,
    100,
    100,
  );
  assert.equal(result, undefined);
});

void test("parsePersistedFoblesWindowState rejects string values where numbers are expected", () => {
  const result = parsePersistedFoblesWindowState({ left: "0", top: 0, width: 400, height: 300 }, WIN, 100, 100);
  assert.equal(result, undefined);
});

void test("parsePersistedFoblesWindowState clamps a stored position outside the viewport", () => {
  const result = parsePersistedFoblesWindowState({ left: 50000, top: -50000, width: 400, height: 300 }, WIN, 100, 100);
  assert.ok(result && result.left! < 1200 && result.top! >= 12);
});

void test("parsePersistedFoblesWindowState clamps a stored size larger than the viewport", () => {
  const result = parsePersistedFoblesWindowState({ left: 0, top: 0, width: 9000, height: 9000 }, WIN, 100, 100);
  assert.equal(result?.width, 1200 - 12 * 2);
  assert.equal(result?.height, 800 - 12 * 2);
});

void test("parsePersistedFoblesWindowState clamps correctly against an unusually small viewport", () => {
  const smallWin = fakeWindow(300, 200);
  const result = parsePersistedFoblesWindowState({ left: 0, top: 0, width: 400, height: 300 }, smallWin, 100, 100);
  assert.ok(result && result.width! <= 300 && result.height! <= 200);
});

void test("parsePersistedFoblesWindowState rejects null, primitives, and non-object values", () => {
  assert.equal(parsePersistedFoblesWindowState(null, WIN, 100, 100), undefined);
  assert.equal(parsePersistedFoblesWindowState(undefined, WIN, 100, 100), undefined);
  assert.equal(parsePersistedFoblesWindowState("not an object", WIN, 100, 100), undefined);
  assert.equal(parsePersistedFoblesWindowState(42, WIN, 100, 100), undefined);
});

void test("parsePersistedFoblesWindowState rejects a record missing a required field", () => {
  const result = parsePersistedFoblesWindowState({ left: 0, top: 0, width: 400 }, WIN, 100, 100);
  assert.equal(result, undefined);
});
