import { requestChatCompletionJson } from "./chatCompletionClient";
import { splitTranscript } from "./chunkTranscript";
import { readChatModelConfig } from "./modelConfig";
import { normalizeSummary } from "./normalizeSummary";
import {
  buildChunkSummaryPrompt,
  buildFinalSummaryPrompt,
  buildSummaryPrompt,
} from "./prompts";
import type { ChatModelConfig, MeetingSummary } from "./types";

const SUMMARY_CHUNK_CHARS = Number(process.env.SUMMARY_CHUNK_CHARS || 12000);

type SummaryOptions = {
  onProgress?: (message: string) => void;
  signal?: AbortSignal;
};

export async function summarizeMeeting(
  transcript: string,
  options: SummaryOptions = {},
) {
  const config = await readChatModelConfig();
  const chunks = splitTranscript(transcript, SUMMARY_CHUNK_CHARS);

  if (chunks.length === 1) {
    options.onProgress?.("Готовим сводку");
    return summarizePrompt(buildSummaryPrompt(transcript), config, options.signal);
  }

  const chunkSummaries = await summarizeChunks(chunks, config, options);
  options.onProgress?.("Собираем финальную сводку");
  return summarizePrompt(
    buildFinalSummaryPrompt(chunkSummaries),
    config,
    options.signal,
  );
}

async function summarizeChunks(
  chunks: string[],
  config: ChatModelConfig,
  options: SummaryOptions,
) {
  const chunkSummaries: MeetingSummary[] = [];

  for (let index = 0; index < chunks.length; index += 1) {
    options.onProgress?.(`Сводка: часть ${index + 1} из ${chunks.length}`);
    chunkSummaries.push(
      await summarizePrompt(
        buildChunkSummaryPrompt(chunks[index], index + 1, chunks.length),
        config,
        options.signal,
      ),
    );
  }

  return chunkSummaries;
}

async function summarizePrompt(
  prompt: string,
  config: ChatModelConfig,
  signal?: AbortSignal,
) {
  const rawSummary = await requestChatCompletionJson(prompt, config, signal);
  return normalizeSummary(rawSummary);
}
