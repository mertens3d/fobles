import { CONST } from "./CONST";
import { type Page } from "./fixtures/playwright";
import { isSprintMode } from "./mouse-proxy";

export async function showBillboard(
  page: Page,
  text: string,
  position: { xPercent: number; yPercent: number } =  { xPercent: 50, yPercent: 80 }
): Promise<void> {
  if (isSprintMode()) return;
  const { xPercent, yPercent } = position;
  console.log(`[fobles] Billboard: "${text}" at (${xPercent}%, ${yPercent}%)`);
  await page.evaluate(
    ({ config, text, xPercent, yPercent }) => {
      let style = document.getElementById(config.STYLE_ID);

      if (!style) {
        style = document.createElement("style");
        style.id = config.STYLE_ID;
        style.textContent =
          config.STYLE_CSS +
          `
        #${config.ID} {
          opacity: 0;
          transition: opacity 600ms ease;
        }
      `;
        document.head.appendChild(style);
      }

      let billboard = document.getElementById(config.ID);

      if (!billboard) {
        billboard = document.createElement("div");
        billboard.id = config.ID;
        document.documentElement.appendChild(billboard);
      }

      const win = window as Window & {
        __foblesBillboardGeneration?: number;
        __foblesBillboardTimeout?: number;
      };

      win.__foblesBillboardGeneration =
        (win.__foblesBillboardGeneration ?? 0) + 1;

      const generation = win.__foblesBillboardGeneration;

      if (win.__foblesBillboardTimeout) {
        clearTimeout(win.__foblesBillboardTimeout);
      }

      billboard.textContent = text;
      billboard.style.left = `${xPercent}%`;
      billboard.style.top = `${yPercent}%`;
      billboard.style.transform = "translate(-50%, -50%)";
      billboard.style.display = "block";
      billboard.style.opacity = "1";

      win.__foblesBillboardTimeout = window.setTimeout(() => {
        if (generation !== win.__foblesBillboardGeneration) {
          return;
        }

        billboard.style.opacity = "0";

        window.setTimeout(() => {
          if (generation !== win.__foblesBillboardGeneration) {
            return;
          }

          billboard.style.display = "none";
        }, 600);
      }, 3000);
    },
    { config: CONST.FOBLES.BILLBOARD, text, xPercent, yPercent },
  );
}

// export async function hideBillboard(page: Page): Promise<void> {
//   await page.evaluate((id) => {
//     const billboard = document.getElementById(id);
//     if (billboard) billboard.style.display = "none";
//   }, CONST.FOBLES.BILLBOARD.ID);
// }
