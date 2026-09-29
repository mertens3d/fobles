import { CONST } from "../CONST";
import { type Page } from "../fixtures/playwright";
import { foblesWaitForTimeout } from "../helpers/wait-helpers";
import { highlightQuickInfoPath } from "../macros/sitecore-macros";
import { showSpeakBubble, hideSpeakBubble } from "../speak-bubble";
import type { DemoBeat } from "./demo-beat.types";

const SCENE_PAUSE_MS = 2_500;


export async function playDemoBeat(page: Page, beat: DemoBeat): Promise<void> {
    console.log(`[fobles] Playing demo beat: ${beat.name}`);
    if (beat.init) {
        await beat.init();
    }

    await showSpeakBubble(page, beat.speechText, beat.speechPosition ?? CONST.FOBLES.SPEAK_BUBBLE.DEFAULT_SPEECH_POSITION);
    await beat.action();

    if (beat.highlightResult !== false) {
        await (beat.highlightResult ?? (() => highlightQuickInfoPath(page)))();
    }

    await hideSpeakBubble(page);
    console.log(`[fobles] Scene pause: waiting ${SCENE_PAUSE_MS}ms`);
    await foblesWaitForTimeout(page, SCENE_PAUSE_MS);
}
