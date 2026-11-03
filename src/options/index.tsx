// @source-path [fobles] src/options/index.tsx

import { createRoot } from "react-dom/client";
import { OptionsApp } from "./options-app";

const root = document.getElementById("options-root");
if (root) {
  createRoot(root).render(<OptionsApp />);
}
