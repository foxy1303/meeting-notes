export function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function readCommandError(error: unknown) {
  if (!isRecord(error)) {
    return "неизвестная ошибка";
  }

  const stderr = typeof error.stderr === "string" ? error.stderr.trim() : "";
  const message = typeof error.message === "string" ? error.message : "";

  return stderr || message || "неизвестная ошибка";
}
