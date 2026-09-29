import {
    expect,
    test,
    type Frame,
    type Page,
} from "../fixtures/playwright";
import { CONST } from "../CONST";
import {
    clickWithMouseMarker,
} from "../mouse-proxy";
import { openSitecorePageAndFindFoblesFrame,  createStep } from "../fobles-helpers";
import { ceRibbonOpenHome } from "../macros/sitecore-macros";
import { ClickFoblesMenuButton, dismissFoblesConfirmDialogIfPresent } from "../macros/fobles-macros";
import { expectFlyoutVisible } from "../expectSnippets/expectSnippets";



export type menuTarget = {
    label: string;
    url: string;
};

test.describe("Fobles Other Buttons", () => {

    test("other menu buttons navigate to their configured URLs", async ({
        page,
    }, testInfo) => {
        test.setTimeout(CONST.TIMEOUTS.TEST_SUITE_MS);
        const foblesFrame = await openSitecorePageAndFindFoblesFrame(page);
        const step = createStep(page, testInfo, page, "Menu Button");

        await ClickFoblesMenuButton(page);

        await expectFlyoutVisible(foblesFrame);

        const menuButtons = foblesFrame.locator(  CONST.FOBLES.LOCATORS.MENU_URL);
        const targets: menuTarget[] = await menuButtons.evaluateAll((buttons) =>
            buttons.map((button) => ({
                label: button.textContent?.trim() ?? "",
                url: button.getAttribute(CONST.FOBLES.ATTRIBUTES.MENU_URL) ?? "",
            })),
        );
        expect(targets.length).toBeGreaterThan(0);
        const failures: string[] = [];

        for (let index = 0; index < targets.length; index += 1) {
            const target = targets[index];
             await testOneJumpButton(target, index, step, page, failures);
        }

        if (failures.length > 0) {
            throw new Error(`Menu target failures:\n${failures.join("\n")}`);
        }
    });
});

async function testOneJumpButton(target: menuTarget,
    index: number,
    step: (title: string,
        body: (fullTitle: string) => Promise<void>, options?: { timeout?: number; screenshot?: boolean; }) => Promise<void>, 
        
    page: Page,
    failures: string[]) {
    try {
        await step(
            `Click "${target.label}": URL contains "${target.url}"`,
            async () => {
                await testOneJumpButtonInner(index, page, target);
            },
            { timeout: CONST.TIMEOUTS.STEP_TIMEOUT_MS }
        );
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const failure = `${target.label}\nexpect: ${target.url}\nactual: ${page.url()}\nerror: ${message}`;
        failures.push(failure);
        console.error(
            `[fobles] FAILED STEP TIMEOUT/ERROR; continuing: ${failure}`
        );
    }
   
}

async function testOneJumpButtonInner(index: number, page: Page, target: menuTarget) {
    const foblesFrame: Frame = await openSitecorePageAndFindFoblesFrame(page);
    await ClickFoblesMenuButton(page);
    await expectFlyoutVisible(foblesFrame);

    const menuButton = foblesFrame
        .locator(CONST.FOBLES.LOCATORS.MENU_URL)
        .nth(index);
    await expect(menuButton).toBeVisible();
    await menuButton.scrollIntoViewIfNeeded(); // this doesn't make sense. This probably got confused with a tree button
    await clickWithMouseMarker(page, menuButton, `Menu ${target.label}`);

    await dismissFoblesConfirmDialogIfPresent(page, { turnOffWarning: true });

    await page.waitForURL(
        (url) => url.toString().includes(encodeURI(target.url)),
        { timeout: CONST.TIMEOUTS.URL_WAIT_MS }
    );
    // waitForURL only confirms the URL changed, not that the new page has actually
    // painted - without this, the step's auto screenshot can capture a stale composited
    // frame from the page being navigated away from instead of the new one.
    await page.waitForLoadState("load").catch(() => undefined);

    // Content Editor's ribbon can be left on whatever tab a previous session used -
    // normalize to Home before the screenshot so it's consistent regardless.
    await ceRibbonOpenHome(page);

    const actualUrl = page.url();
    expect(
        actualUrl,
        `Expected current URL to contain ${target.url}`
    ).toContain(encodeURI(target.url));
    console.log(
        `[fobles] URL assertion: expected ${target.url}; actual ${actualUrl}`
    );
    await page.waitForTimeout(
        CONST.SPEED.SETTINGS[CONST.SPEED.SELECTED].STEP_WAIT_MS *
        CONST.NAVIGATION.HOLD_MULTIPLIER
    );
    return foblesFrame;
}

