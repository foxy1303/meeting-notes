import { isRecord } from "./common";
import { AppError } from "./appError";
import type { ChatModelConfig } from "./types";

export async function requestChatCompletionJson(
  prompt: string,
  config: ChatModelConfig,
  signal?: AbortSignal,
) {
  const response = await fetch(
    `${config.baseUrl.replace(/\/$/, "")}/chat/completions`,
    {
      method: "POST",
      headers: buildHeaders(config),
      signal,
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: "system",
            content:
              "Ты помощник, который готовит протоколы совещаний. Возвращай только валидный JSON без Markdown.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      }),
    },
  );
  const payload = await readUpstreamJson(response, `${config.source} chat/completions`);

  if (!response.ok) {
    throw new AppError(
      "CHAT_MODEL_UNAVAILABLE",
      readChatModelError(payload, config.source),
    );
  }

  try {
    return JSON.parse(stripCodeFence(extractChatCompletionText(payload)));
  } catch (error) {
    throw new AppError(
      "CHAT_MODEL_BAD_JSON",
      "Модель вернула сводку не в JSON-формате.",
      { cause: error },
    );
  }
}

function buildHeaders(config: ChatModelConfig) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (config.apiKey) {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }

  return headers;
}

async function readUpstreamJson(response: Response, source: string) {
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    const contentType = response.headers.get("content-type") || "unknown";
    const snippet = text.replace(/\s+/g, " ").slice(0, 220);

    throw new AppError(
      "CHAT_MODEL_BAD_RESPONSE",
      `${source} вернул не JSON. HTTP ${response.status}, content-type: ${contentType}. Фрагмент: ${snippet}`,
    );
  }
}

function readChatModelError(payload: unknown, source: string) {
  if (
    isRecord(payload) &&
    isRecord(payload.error) &&
    typeof payload.error.message === "string"
  ) {
    return `${source} model error: ${payload.error.message}`;
  }

  return `${source} model не вернула сводку.`;
}

function extractChatCompletionText(payload: unknown) {
  if (!isRecord(payload) || !Array.isArray(payload.choices)) {
    throw new AppError(
      "CHAT_MODEL_BAD_RESPONSE",
      "Chat model вернула ответ в неожиданном формате.",
    );
  }

  const firstChoice = payload.choices[0];

  if (!isRecord(firstChoice) || !isRecord(firstChoice.message)) {
    throw new AppError("CHAT_MODEL_BAD_RESPONSE", "Chat model не вернула message.");
  }

  const { content } = firstChoice.message;

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    const text = content
      .map((part) => (isRecord(part) && typeof part.text === "string" ? part.text : ""))
      .filter(Boolean)
      .join("\n");

    if (text) {
      return text;
    }
  }

  throw new AppError(
    "CHAT_MODEL_BAD_RESPONSE",
    "Chat model не вернула текст сводки.",
  );
}

function stripCodeFence(text: string) {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
}
