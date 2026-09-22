import { CONST } from "./CONST";
import { type Page } from "./fixtures/playwright";
import { isSprintMode } from "./mouse-proxy";

export async function showSpeakBubble(
  page: Page,
  text: string,
  position: { xPercent: number; yPercent: number },
): Promise<void> {
  if (isSprintMode()) return;
  const { xPercent, yPercent } = position;
  console.log(`[fobles] Speak bubble: "${text}" at (${xPercent}%, ${yPercent}%)`);
  await page.evaluate(
    ({ config, text, xPercent, yPercent }) => {
      let style = document.getElementById(config.STYLE_ID);
      if (!style) {
        style = document.createElement("style");
        style.id = config.STYLE_ID;
        style.textContent = config.STYLE_CSS;
        document.head.appendChild(style);
      }

      let bubble = document.getElementById(config.ID);
      if (!bubble) {
        bubble = document.createElement("div");
        bubble.id = config.ID;
        document.documentElement.appendChild(bubble);
      }
      bubble.textContent = text;
      bubble.style.left = `${xPercent}%`;
      bubble.style.top = `${yPercent}%`;
      bubble.style.transform = "translate(-50%, -50%)";
      bubble.style.display = "block";
    },
    { config: CONST.SPEAK_BUBBLE, text, xPercent, yPercent },
  );
}

export async function hideSpeakBubble(page: Page): Promise<void> {
  await page.evaluate((id) => {
    const bubble = document.getElementById(id);
    if (bubble) bubble.style.display = "none";
  }, CONST.SPEAK_BUBBLE.ID);
}
