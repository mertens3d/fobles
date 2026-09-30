
import { CONST } from "../../CONST";
import {
    getLastKnownMousePosition,
    moveMouseOutsideHoverArea,
} from "../../helpers/mouse-proxy";
import { activateFobles, } from "../../helpers/fobles-helpers";
import { hoverAndGrow, hoverAndSlideOut } from "../../helpers/hover-helpers";
import { ensureMouseMarkerExists } from "../../helpers/mouse-proxy";
import { expect, foblesTest } from "../../fixtures/playwright";


foblesTest.describe("Fobles Hover", () => {

    foblesTest.skip(`'content-editor-root-item-lbolt' creates expected Fobles`, async ({ page }) => {
        await activateFobles(page);
        const lboltButton = page
            .locator(CONST.FOBLES.SELECTORS.LBOLT_BUTTON)
            .first();
        const editorTabs = page.locator("#EditorTabs");
        await expect(editorTabs).toBeVisible();
        await ensureMouseMarkerExists(page);

        const menuButton = page.locator(CONST.FOBLES.SELECTORS.JUMP_MENU_TRIGGER).first();
        await expect(menuButton).toBeVisible();
        const menuFlyout = page.locator(CONST.FOBLES.SELECTORS.JUMP_MENU).first();
        const mousePosition = getLastKnownMousePosition();

        await hoverAndGrow(page, {
            name: "LBolt",
            hoverTarget: lboltButton,
            measureTarget: lboltButton,
            moveAwayTargets: lboltButton,
            mousePosition,
        });

        await hoverAndSlideOut(page, {
            name: "Menu",
            hoverTarget: menuButton,
            flyoutTarget: menuFlyout,
            hoverRegion: [menuButton, menuFlyout],
            mousePosition,
        });

        await moveMouseOutsideHoverArea(
            page,
            [menuButton, menuFlyout],
            mousePosition,
            "Menu away",
        );
        await editorTabs.click();
        console.log("[fobles] Non-Fobles #EditorTabs target clicked");

        const expectedQuickInfoButtons: readonly string[] = [
            "{0DE95AE4-41AB-4D01-9EB0-67441B7C2450}",
            "/sitecore/content",
            "/sitecore/templates/System/Main section",
        ];


        for (const buttonName of expectedQuickInfoButtons) {
            await expect(
                page.getByRole("button", { name: buttonName, exact: true }).first(),
            ).toBeHidden();
        }
        console.log("[fobles] Quick-info Fobles buttons dismissed");
    });

});