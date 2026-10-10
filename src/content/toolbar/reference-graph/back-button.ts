import type { ReferenceGraphResult } from "./reference-graph.types";

let backButton: HTMLButtonElement | null = null;
// History of every root this dialog has shown so far (oldest first) - Back pops the most
// recent one and re-renders it, without re-fetching anything already harvested this session.
const graphHistory: ReferenceGraphResult[] = [];


  
export function buildBackButton(doc: Document, onRegraphCb: () => void) {
  backButton = doc.createElement("button");
  backButton.type = "button";
  backButton.textContent = "< Back";
  backButton.disabled = true;
  backButton.className = "fobles-reference-graph-button";
  // Under the dropdown (not beside it) and the same width, so the whole panel stays narrow.
  backButton.style.cssText = "width:170px;";


  backButton.addEventListener("click", () => {
    const previous = graphHistory.pop();
    if (!previous) return;
    onRegraphCb(previous);
  });

  return backButton;
}

export function getBackButton(): HTMLButtonElement | null {
  return backButton;
}