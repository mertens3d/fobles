export const getElement = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing options element: #${id}`);
  return element as T;
};

export const requireInput = (scope: ParentNode, selector: string): HTMLInputElement => {
  const input = scope.querySelector<HTMLInputElement>(selector);
  if (!input) throw new Error(`Missing options input: ${selector}`);
  return input;
};

export function clearFieldError(input: HTMLInputElement): void {
  input.removeAttribute("aria-invalid");
  input.closest("label")?.querySelector(".field-error")?.remove();
}

export function showFieldError(input: HTMLInputElement, message: string): void {
  input.setAttribute("aria-invalid", "true");
  const field = input.closest("label");
  if (!field || field.querySelector(".field-error")) return;

  const error = document.createElement("span");
  error.className = "field-error";
  error.textContent = message;
  field.insertBefore(error, input);
}
