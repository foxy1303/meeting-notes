import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { isRecord, readString } from "./common";
import type { ChatModelConfig } from "./types";

export async function readChatModelConfig(): Promise<ChatModelConfig> {
  const envConfig = readEnvChatModelConfig();

  if (envConfig) {
    return envConfig;
  }

  return readOpenCodeConfig();
}

function readEnvChatModelConfig(): ChatModelConfig | null {
  const baseUrl = readString(
    process.env.AI_BASE_URL ||
      process.env.CHAT_COMPLETIONS_BASE_URL ||
      process.env.OPENAI_BASE_URL,
  );
  const model = readString(
    process.env.AI_MODEL ||
      process.env.CHAT_COMPLETIONS_MODEL ||
      process.env.OPENAI_MODEL,
  );

  if (!baseUrl && !model) {
    return null;
  }

  if (!baseUrl || !model) {
    throw new Error(
      "Для конфигурации нейронки через env укажите AI_BASE_URL и AI_MODEL.",
    );
  }

  return {
    baseUrl,
    apiKey: readString(
      process.env.AI_API_KEY ||
        process.env.CHAT_COMPLETIONS_API_KEY ||
        process.env.OPENAI_API_KEY,
    ),
    model,
    source: "нейронка",
  };
}

async function readOpenCodeConfig(): Promise<ChatModelConfig> {
  const configPath =
    process.env.OPENCODE_CONFIG_PATH ||
    join(
      /* turbopackIgnore: true */ homedir(),
      ".config",
      "opencode",
      "opencode.json",
    );
  const providerName = process.env.OPENCODE_PROVIDER || "llm-bridge";
  const requestedModel = process.env.OPENCODE_MODEL || "smart-fast";
  const rawConfig = JSON.parse(
    await readFile(/* turbopackIgnore: true */ configPath, "utf8"),
  );

  if (!isRecord(rawConfig) || !isRecord(rawConfig.provider)) {
    throw new Error(`openCode config не содержит provider: ${configPath}`);
  }

  const provider = rawConfig.provider[providerName];

  if (!isRecord(provider)) {
    throw new Error(`openCode provider не найден: ${providerName}`);
  }

  const options = isRecord(provider.options) ? provider.options : provider;
  const baseUrl = readString(options.baseURL || options.baseUrl);
  const apiKey = readString(options.apiKey);
  const model = readOpenCodeModel(provider, requestedModel);

  if (!baseUrl || !apiKey || !model) {
    throw new Error(
      `openCode provider ${providerName} должен содержать baseURL, apiKey и модель ${requestedModel}.`,
    );
  }

  return { baseUrl, apiKey, model, source: "openCode" };
}

function readOpenCodeModel(
  provider: Record<string, unknown>,
  requestedModel: string,
) {
  if (!isRecord(provider.models)) {
    return requestedModel;
  }

  const modelConfig = provider.models[requestedModel];

  if (!isRecord(modelConfig)) {
    return requestedModel;
  }

  return readString(modelConfig.id) || readString(modelConfig.name) || requestedModel;
}
