export function setRobotsMeta(content: string | null): void {
  const existing = document.querySelector('meta[name="robots"]');
  if (content === null) {
    existing?.remove();
    return;
  }
  const meta =
    existing instanceof HTMLMetaElement
      ? existing
      : Object.assign(document.createElement("meta"), { name: "robots" });
  if (!existing) {
    document.head.appendChild(meta);
  }
  meta.content = content;
}
