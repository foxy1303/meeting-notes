import type {
  MeetingResult,
  StreamProgressEvent,
} from "../types";
import { formatErrorMessage } from "./errorMessages";
import { parseStreamEvent } from "./streamEventParser";

type ApiError = {
  error?: string;
};

export async function readTranscriptionResponse(
  response: Response,
  onProgress: (event: StreamProgressEvent) => void,
) {
  const contentType = response.headers.get("content-type") || "";

  if (!response.body || !contentType.includes("application/x-ndjson")) {
    const payload = (await readJsonResponse(response)) as MeetingResult & ApiError;

    if (!response.ok) {
      throw new Error(payload.error || "Не удалось обработать запись.");
    }

    return payload;
  }

  if (!response.ok) {
    const payload = (await readJsonResponse(response)) as ApiError;
    throw new Error(payload.error || "Не удалось обработать запись.");
  }

  return readStream(response.body, onProgress);
}

async function readJsonResponse(response: Response) {
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    const snippet = text.replace(/\s+/g, " ").slice(0, 180);
    throw new Error(
      `Сервер вернул не JSON (${response.status}). Фрагмент ответа: ${snippet}`,
    );
  }
}

async function readStream(
  body: ReadableStream<Uint8Array>,
  onProgress: (event: StreamProgressEvent) => void,
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: MeetingResult | null = null;

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      result = handleStreamEvent(line, result, onProgress);
    }

    if (done) {
      break;
    }
  }

  result = handleStreamEvent(buffer, result, onProgress);

  if (!result) {
    throw new Error("Сервер не вернул результат обработки.");
  }

  return result;
}

function handleStreamEvent(
  line: string,
  currentResult: MeetingResult | null,
  onProgress: (event: StreamProgressEvent) => void,
) {
  const event = parseStreamEvent(line);

  if (!event) {
    return currentResult;
  }

  if (event.type === "progress") {
    onProgress(event);
    return currentResult;
  }

  if (event.type === "error") {
    throw new Error(
      formatErrorMessage(
        event.error || "Не удалось обработать запись.",
        event.code,
      ),
    );
  }

  return event.payload;
}
