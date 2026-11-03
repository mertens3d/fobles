import { RECORD_VIDEO } from "../settings/settings";
import path from "node:path";

export const TEST_CONSTB = {
  extensionPath: path.resolve("./dist/unpacked"),
  VIEWPORT_SIZE: RECORD_VIDEO ? { width: 1100, height: 720 } : { width: 800, height: 720 },
};
