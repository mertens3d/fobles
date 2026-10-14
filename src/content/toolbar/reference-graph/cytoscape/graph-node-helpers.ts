export function buildLabel(kind: string, name: string): string {
    return `${name}\n[${kind.toLowerCase()}]`;
}
