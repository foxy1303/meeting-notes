export type AppErrorCode =
  | "AUDIO_PREP_FAILED"
  | "CHAT_MODEL_BAD_JSON"
  | "CHAT_MODEL_BAD_RESPONSE"
  | "CHAT_MODEL_UNAVAILABLE"
  | "FILE_MISSING"
  | "FILE_TOO_LARGE"
  | "PROCESSING_ABORTED"
  | "PROCESSING_BUSY"
  | "TRANSCRIPT_EMPTY"
  | "WHISPER_FAILED";

export class AppError extends Error {
  constructor(
    readonly code: AppErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "AppError";
  }
}

export function toAppError(error: unknown) {
  if (error instanceof AppError) {
    return error;
  }

  if (isAbortError(error)) {
    return new AppError("PROCESSING_ABORTED", "Обработка остановлена.");
  }

  return new AppError(
    "CHAT_MODEL_UNAVAILABLE",
    error instanceof Error ? error.message : "Не удалось обработать запись.",
  );
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}
