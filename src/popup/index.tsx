// @source-path [fobles] src/popup/index.tsx

import { createRoot } from "react-dom/client";
import { PopupApp } from "./popup-app";

const root = document.getElementById("popup-root");
if (root) createRoot(root).render(<PopupApp />);
