import { copyFile, readFile, writeFile } from "fs/promises";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const projectRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const stampPath = join(projectRoot, "dist", "build-stamp.txt");
const buildStamp = await readFile(stampPath, "utf8").catch(
  () => new Date().toISOString().replace("T", " ").slice(0, 19),
);

const banner = [
  "// =============================================================",
  "// AUTO-GENERATED FILE - DO NOT EDIT",
  "// Source of truth: src/extension",
  `// Build: ${buildStamp}`,
  "// Regenerate with: npm run build:extension",
  "// =============================================================",
  "",
].join("\n");

const generatedFiles = ["background.js", "content.js"];
const iconSourcePath = join(projectRoot, "src", "extension", "foble_icon.png");
const iconOutputPath = join(projectRoot, "dist", "unpacked", "foble_icon.png");
const maintainedFiles = [
  "manifest.json",
  "options.html",
  "popup.html",
  "popup.js",
];

async function applyBannerToGeneratedFiles() {
  await copyFile(iconSourcePath, iconOutputPath);

  for (const fileName of maintainedFiles) {
    const sourcePath = join(projectRoot, "src", "extension", fileName);
    const outputPath = join(projectRoot, "dist", "unpacked", fileName);
    const content = await readFile(sourcePath, "utf8");
    await writeFile(outputPath, content.replaceAll("__BUILD_STAMP__", buildStamp));
  }

  for (const fileName of generatedFiles) {
    const filePath = join(projectRoot, "dist", "unpacked", fileName);
    let content = await readFile(filePath, "utf8");

    while (true) {
      const stripped = content.replace(
        /^(?:\n|\/\/ =============================================================\r?\n|\/\/ AUTO-GENERATED FILE - DO NOT EDIT\r?\n|\/\/ Source of truth: src\/extension\r?\n|\/\/ Build: .*?\r?\n|\/\/ Regenerate with: npm run build:extension\r?\n)+/s,
        "",
      );

      if (stripped === content) {
        break;
      }

      content = stripped;
    }

    if (content.startsWith(banner)) {
      continue;
    }

    const nextContent = `${banner}\n${content}`;
    await writeFile(filePath, nextContent);
    console.log(`Applied banner to ${filePath}`);
  }
}

applyBannerToGeneratedFiles().catch((error) => {
  console.error("Failed to apply generated-file banners:", error);
  process.exit(1);
});
