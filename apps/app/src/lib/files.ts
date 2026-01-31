export function safeFileName(name: string) {
  return name
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 120);
}