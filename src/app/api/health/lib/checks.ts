import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import { promisify } from "node:util";
import { readChatModelConfig } from "../../meetings/transcribe/lib/modelConfig";

const execFileAsync = promisify(execFile);

const WHISPER_BIN = process.env.WHISPER_CPP_BIN || "whisper-cli";
const WHISPER_MODEL = process.env.WHISPER_CPP_MODEL || "models/ggml-base.bin";
const FFMPEG_BIN = process.env.FFMPEG_BIN || "ffmpeg";

export type HealthCheck = {
  details?: string;
  name: string;
  ok: boolean;
};

export async function runHealthChecks() {
  const checks = await Promise.all([
    checkBinary("ffmpeg", FFMPEG_BIN, ["-version"]),
    checkBinary("whisper", WHISPER_BIN, ["-h"]),
    checkWhisperModel(),
    checkChatModel(),
  ]);

  return {
    checks,
    ok: checks.every((check) => check.ok),
  };
}

async function checkBinary(name: string, bin: string, args: string[]) {
  try {
    await execFileAsync(bin, args, {
      maxBuffer: 1024 * 1024,
      signal: AbortSignal.timeout(3000),
    });
    return { name, ok: true };
  } catch (error) {
    return {
      name,
      ok: false,
      details: error instanceof Error ? error.message : "binary check failed",
    };
  }
}

async function checkWhisperModel() {
  try {
    await access(WHISPER_MODEL);
    return { name: "whisperModel", ok: true };
  } catch {
    return {
      name: "whisperModel",
      ok: false,
      details: `Model file is not readable: ${WHISPER_MODEL}`,
    };
  }
}

async function checkChatModel() {
  try {
    const config = await readChatModelConfig();
    const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/models`, {
      headers: config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {},
      signal: AbortSignal.timeout(3000),
    });

    return {
      name: "chatModel",
      ok: response.ok,
      details: response.ok
        ? `${config.source}:${config.model}`
        : `HTTP ${response.status} from ${config.baseUrl}`,
    };
  } catch (error) {
    return {
      name: "chatModel",
      ok: false,
      details: error instanceof Error ? error.message : "chat model check failed",
    };
  }
}
