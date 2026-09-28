import type { StrategyTestContext } from "../strategies/scenario.types";

export async function LogDebugTestContext(
  testContext: StrategyTestContext,
): Promise<void> {
  const safe = async <T>(
    name: string,
    action: () => Promise<T>,
  ): Promise<T | string> => {
    try {
      return await action();
    } catch (error) {
      return `[ERROR] ${name}: ${String(error)}`;
    }
  };

  const fieldTable = await safe(
    "fieldTable",
    () => testContext.getFieldTable(),
  );

  const locatorFirstResult = await safe(
    "locatorFirstResult",
    () => testContext.getScLocatorFirstResult(),
  );

  const fieldTableInfo =
    typeof fieldTable === "string"
      ? fieldTable
      : {
          count: await safe(
            "fieldTable.count",
            () => fieldTable.count(),
          ),
          visible: await safe(
            "fieldTable.visible",
            () => fieldTable.isVisible(),
          ),
          boundingBox: await safe(
            "fieldTable.boundingBox",
            () => fieldTable.boundingBox(),
          ),
        };

  const locatorInfo =
    typeof locatorFirstResult === "string"
      ? locatorFirstResult
      : {
          count: await safe(
            "locatorFirstResult.count",
            () => locatorFirstResult.count(),
          ),
          visible: await safe(
            "locatorFirstResult.visible",
            () => locatorFirstResult.isVisible(),
          ),
          boundingBox: await safe(
            "locatorFirstResult.boundingBox",
            () => locatorFirstResult.boundingBox(),
          ),
          text: await safe(
            "locatorFirstResult.textContent",
            () => locatorFirstResult.textContent(),
          ),
          html: await safe(
            "locatorFirstResult.outerHTML",
            () =>
              locatorFirstResult.evaluate(
                (e) => (e as HTMLElement).outerHTML,
              ),
          ),
        };

  console.log(
    "[DEBUG TEST CONTEXT]",
    JSON.stringify(
      {
        pageUrl: await safe(
          "page.url",
          async () => testContext.page.url(),
        ),
        scenario: {
          friendlyName: testContext.SCENARIO.friendlyName,
          fieldLabel: testContext.SCENARIO.scElemFieldLabel,
          itemId: testContext.SCENARIO.itemId,
          locator: testContext.SCENARIO.scElemLocator,
        },
        fieldTable: fieldTableInfo,
        locatorFirstResult: locatorInfo,
      },
      null,
      2,
    ),
  );
}