// @source-path [fobles] tests/unit/harvesting/reference-harvesting-lease.test.ts

import assert from "node:assert/strict";
import { test } from "node:test";
import { runWithReferenceHarvestingLease } from "../../../src/content/foundation/harvesting/coordinator/reference-harvesting-lease.ts";
import { UTILITY_LOCK_MESSAGE } from "../../../src/shared/utility/fobles-utility-lock.messages.ts";

type LockMessage = { type: string; ownershipId: string; origin: string };

type RuntimeResponse = { acquired: boolean } | null;

function installRuntime(responses: RuntimeResponse[]): { messages: LockMessage[]; restore: () => void } {
  const messages: LockMessage[] = [];
  const previousChrome = Object.getOwnPropertyDescriptor(globalThis, "chrome");
  const previousLocation = Object.getOwnPropertyDescriptor(globalThis, "location");

  Object.defineProperty(globalThis, "chrome", {
    configurable: true,
    value: {
      runtime: {
        sendMessage: (message: LockMessage): Promise<RuntimeResponse> => {
          messages.push(message);
          const response = responses.shift();
          if (response === undefined) {
            throw new Error("No fake utility-lock response remains");
          }
          return Promise.resolve(response);
        },
      },
    },
  });
  Object.defineProperty(globalThis, "location", {
    configurable: true,
    value: { origin: "https://sitecore.example" },
  });

  return {
    messages,
    restore: () => {
      if (previousChrome) {
        Object.defineProperty(globalThis, "chrome", previousChrome);
      } else {
        Reflect.deleteProperty(globalThis, "chrome");
      }
      if (previousLocation) {
        Object.defineProperty(globalThis, "location", previousLocation);
      } else {
        Reflect.deleteProperty(globalThis, "location");
      }
    },
  };
}

void test("runs under an acquired lease and releases using the same ownership and origin", async () => {
  const runtime = installRuntime([{ acquired: true }, null]);
  try {
    const value = await runWithReferenceHarvestingLease(() => Promise.resolve("harvested"));

    assert.equal(value, "harvested");
    assert.equal(runtime.messages.length, 2);
    assert.equal(runtime.messages[0]?.type, UTILITY_LOCK_MESSAGE.ACQUIRE);
    assert.equal(runtime.messages[1]?.type, UTILITY_LOCK_MESSAGE.RELEASE);
    assert.equal(runtime.messages[0]?.ownershipId, runtime.messages[1]?.ownershipId);
    assert.equal(runtime.messages[0]?.origin, "https://sitecore.example");
    assert.equal(runtime.messages[1]?.origin, "https://sitecore.example");
  } finally {
    runtime.restore();
  }
});

void test("retries acquisition after contention before running and releasing the callback", async () => {
  const runtime = installRuntime([{ acquired: false }, { acquired: true }, null]);
  try {
    let runCount = 0;
    await runWithReferenceHarvestingLease(() => {
      runCount += 1;
      return Promise.resolve();
    });

    assert.equal(runCount, 1);
    assert.deepEqual(
      runtime.messages.map(({ type }) => type),
      [UTILITY_LOCK_MESSAGE.ACQUIRE, UTILITY_LOCK_MESSAGE.ACQUIRE, UTILITY_LOCK_MESSAGE.RELEASE],
    );
    assert.equal(runtime.messages[0]?.ownershipId, runtime.messages[1]?.ownershipId);
    assert.equal(runtime.messages[1]?.ownershipId, runtime.messages[2]?.ownershipId);
  } finally {
    runtime.restore();
  }
});

void test("releases the acquired lease when the callback rejects and preserves its error", async () => {
  const runtime = installRuntime([{ acquired: true }, null]);
  const callbackError = new Error("harvest failed");
  try {
    await assert.rejects(runWithReferenceHarvestingLease(() => Promise.reject(callbackError)), callbackError);

    assert.deepEqual(
      runtime.messages.map(({ type }) => type),
      [UTILITY_LOCK_MESSAGE.ACQUIRE, UTILITY_LOCK_MESSAGE.RELEASE],
    );
  } finally {
    runtime.restore();
  }
});

void test("does not run or release when acquisition fails", async () => {
  const runtime = installRuntime([]);
  const acquisitionError = new Error("lock unavailable");
  Object.defineProperty(globalThis, "chrome", {
    configurable: true,
    value: {
      runtime: {
        sendMessage: (message: LockMessage): Promise<never> => {
          runtime.messages.push(message);
          return Promise.reject(acquisitionError);
        },
      },
    },
  });

  let runCount = 0;
  try {
    await assert.rejects(
      runWithReferenceHarvestingLease(() => {
        runCount += 1;
        return Promise.resolve();
      }),
      acquisitionError,
    );

    assert.equal(runCount, 0);
    assert.deepEqual(runtime.messages.map(({ type }) => type), [UTILITY_LOCK_MESSAGE.ACQUIRE]);
  } finally {
    runtime.restore();
  }
});
