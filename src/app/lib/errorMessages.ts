const errorHints: Record<string, string> = {
  AUDIO_PREP_FAILED: "Проверьте, что ffmpeg установлен и FFMPEG_BIN указан верно.",
  CHAT_MODEL_BAD_JSON:
    "Модель ответила не JSON. Попробуйте другую модель или уменьшите запись.",
  CHAT_MODEL_BAD_RESPONSE:
    "Проверьте совместимость endpoint с OpenAI chat/completions.",
  CHAT_MODEL_UNAVAILABLE: "Проверьте AI_BASE_URL, AI_API_KEY и доступность модели.",
  FILE_MISSING: "Выберите аудио или видеофайл и попробуйте снова.",
  FILE_TOO_LARGE: "Выберите файл меньшего размера или увеличьте MAX_UPLOAD_MB.",
  PROCESSING_ABORTED: "Можно выбрать другой файл или запустить обработку заново.",
  PROCESSING_BUSY: "Дождитесь завершения текущей обработки.",
  TRANSCRIPT_EMPTY: "Попробуйте запись с более чёткой речью или другую Whisper-модель.",
  WHISPER_FAILED:
    "Проверьте WHISPER_CPP_BIN, WHISPER_CPP_MODEL и наличие файла модели.",
};

export function formatErrorMessage(message: string, code?: string) {
  if (!code || !errorHints[code]) {
    return message;
  }

  return `${message} ${errorHints[code]}`;
}
