import fs from "node:fs";
import path from "node:path";

const promoVideoDir = path.resolve("./playwright/test-artifacts/playwright-results/promo-video");

// See tests/README.md's Promo Video section for naming and ordering.
export function renamePromoVideoFiles(): void {
  const files = fs
    .readdirSync(promoVideoDir)
    .filter((name) => name.endsWith(".webm"))
    .map((name) => {
      const fullPath = path.join(promoVideoDir, name);
      return { fullPath, sizeBytes: fs.statSync(fullPath).size };
    })
    .sort((a, b) => a.sizeBytes - b.sizeBytes);

  files.forEach((file, index) => {
    const isMainVideo = index === files.length - 1;
    const newName = isMainVideo ? "main.webm" : `secondary-${index + 1}.webm`;
    fs.renameSync(file.fullPath, path.join(promoVideoDir, newName));
  });
}

export function cleanPromoVideoFiles(): void {
  fs.rmSync(promoVideoDir, { recursive: true, force: true });
  fs.mkdirSync(promoVideoDir, { recursive: true });
}

export function getPromoVideoDir(): string {
  return promoVideoDir;
}
