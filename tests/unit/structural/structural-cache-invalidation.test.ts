import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import { test } from "node:test";
import * as cache from "../../../src/content/foundation/cache/sitecore-data/sitecore-data-cache.ts";
import { structuralTemplateCacheKey } from "../../../src/content/foundation/cache/sitecore-data/structural-cache-key.ts";
import { invalidateStructuralCache } from "../../../src/content/foundation/cache/sitecore-data/structural-cache-invalidation.ts";
import { guid, SCOPE } from "./structural-fixture.ts";

void test("scoped structural invalidation removes template facts across languages, preserving items and other databases", async () => {
  await cache.clear();
  const key = structuralTemplateCacheKey(SCOPE, guid(10));
  const danish = { ...key, language: "da" };
  const web = { ...key, database: "web" };
  const masterOther = { ...key, database: "master2" };
  for (const item of [key, danish, web, masterOther]) {
    await cache.putFact(
      item,
      "templateBases",
      { inheritedTemplateIds: [guid(2)] },
      { revision: "revision-preserved", lastVerifiedAt: 123 },
    );
    await cache.putFact(item, "templateDerived", {
      complete: true,
      fingerprint: "settings/dependencies",
      inheritedIds: [guid(2)],
      kind: "site",
    });
    await cache.putFact(item, "customSections", { sections: [] });
    await cache.putFact(item, "parent", { parent: undefined });
    await cache.putFact(item, "quickInfo", { result: { status: "not-found", requested: item.item } });
  }
  const before = await Promise.all([key, danish, web, masterOther].map((item) => cache.getItem(item)));
  await assert.rejects(
    invalidateStructuralCache({ ...SCOPE, origin: "https://foreign.example" }, SCOPE.origin),
    /origin/,
  );
  await assert.rejects(
    invalidateStructuralCache({ ...SCOPE, origin: "https://sitecore.example" }, SCOPE.origin),
    /origin/,
  );
  assert.deepEqual(await Promise.all([key, danish, web, masterOther].map((item) => cache.getItem(item))), before);
  await invalidateStructuralCache({ origin: "https://SITECORE.example:8443/path", database: " Master " }, SCOPE.origin);
  for (const [index, item] of [key, danish].entries()) {
    const expected = { ...before[index] };
    delete expected.templateBases;
    delete expected.templateDerived;
    assert.deepEqual(await cache.getItem(item), expected);
  }
  assert.deepEqual(await cache.getItem(web), before[2]);
  assert.deepEqual(await cache.getItem(masterOther), before[3]);
  assert.equal(await cache.count(), 4);
});
