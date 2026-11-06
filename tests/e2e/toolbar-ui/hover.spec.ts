import { TEST_CONST } from "../../constants/TEST_CONST";
import { getButtonSize, getLastKnownMousePosition, moveMouseOutsideHoverArea } from "../../helpers/mouse-proxy";
import { activateFobles } from "../../helpers/fobles-helpers-support/test-setup";
import { hoverAndSlideOut } from "../../helpers/hover-helpers";
import { ensureMouseMarkerExists } from "../../helpers/mouse-proxy";
import { expect, foblesTest } from "../../fixtures/playwright";
import { locateJumpFlyout, locateLBoltButton, locateJumpFlyoutTrigger, locateEditorTabs } from "../../helpers/locator-helpers";

foblesTest.describe("Fobles Hover", () => {
  foblesTest(`'content-editor-root-item-lbolt' creates expected Fobles`, async ({ page }) => {
    await activateFobles(page);
    const lboltButton = await locateLBoltButton(page);
    const editorTabs = await locateEditorTabs(page);
    await expect(editorTabs).toBeVisible();
    await ensureMouseMarkerExists(page);

    const jumpFlyoutButton = await locateJumpFlyoutTrigger(page);
    await expect(jumpFlyoutButton).toBeVisible();
    const jumpFlyout = await locateJumpFlyout(page);
    const mousePosition = getLastKnownMousePosition();

    await moveMouseOutsideHoverArea(page, lboltButton, mousePosition, "LBolt away");
    const originalSize = await getButtonSize(lboltButton);
    await lboltButton.hover();
    await page.waitForTimeout(600);
    const hoveredSize = await getButtonSize(lboltButton);
    expect(hoveredSize.width).toBeCloseTo(originalSize.width, 1);
    expect(hoveredSize.height).toBeCloseTo(originalSize.height, 1);
    await moveMouseOutsideHoverArea(page, lboltButton, mousePosition, "LBolt away");
    const restoredSize = await getButtonSize(lboltButton);
    expect(restoredSize.width).toBeCloseTo(originalSize.width, 1);
    expect(restoredSize.height).toBeCloseTo(originalSize.height, 1);

    await hoverAndSlideOut(page, {
      name: "Menu",
      hoverTarget: jumpFlyoutButton,
      flyoutTarget: jumpFlyout,
      hoverRegion: [jumpFlyoutButton, jumpFlyout],
      mousePosition,
    });

    await moveMouseOutsideHoverArea(page, [jumpFlyoutButton, jumpFlyout], mousePosition, "Menu away");
    await editorTabs.click();
    console.log("[fobles] Non-Fobles #EditorTabs target clicked");

    const expectedQuickInfoButtons: readonly string[] = [
      "{0DE95AE4-41AB-4D01-9EB0-67441B7C2450}",
      "/sitecore/content",
      "/sitecore/templates/System/Main section",
    ];

    for (const buttonName of expectedQuickInfoButtons) {
      await expect(page.getByRole("button", { name: buttonName, exact: true }).first()).toBeHidden();
    }
    console.log("[fobles] Quick-info Fobles buttons dismissed");
  });
});
