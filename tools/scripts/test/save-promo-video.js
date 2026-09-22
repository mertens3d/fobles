import fs from "node:fs";
import path from "node:path";

const sourcePath = path.resolve(
  "./tests/test-artifacts/playwright-results/promo-video/main.webm",
);
const destDir = path.resolve(
  "./tests/test-artifacts/playwright-results/videoComposit",
);
const destPath = path.join(destDir, "FoblesPromoVideoMain.webm");

if (!fs.existsSync(sourcePath)) {
  console.error(
    `No recorded video found at ${sourcePath}. Run npm run test:e2e:promoVideo with RECORD_VIDEO on first.`,
  );
  process.exit(1);
}

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(sourcePath, destPath);
console.log(`Copied ${sourcePath} to ${destPath}`);
