export function createGenerationRequestId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `vid-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
