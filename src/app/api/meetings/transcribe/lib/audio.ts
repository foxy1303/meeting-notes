import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { promisify } from "node:util";
import { AppError } from "./appError";
import { readCommandError } from "./common";

const execFileAsync = promisify(execFile);

const WHISPER_BIN = process.env.WHISPER_CPP_BIN || "whisper-cli";
const WHISPER_MODEL = process.env.WHISPER_CPP_MODEL || "models/ggml-base.bin";
const FFMPEG_BIN = process.env.FFMPEG_BIN || "ffmpeg";

export async function saveUpload(file: File, workDir: string) {
  const safeName = sanitizeFileName(file.name);
  const filePath = join(workDir, safeName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);
  return filePath;
}

export async function prepareAudio(
  inputPath: string,
  workDir: string,
  signal?: AbortSignal,
) {
  if (extname(inputPath).toLowerCase() === ".wav") {
    return inputPath;
  }

  const outputPath = join(workDir, "audio.wav");

  try {
    await execFileAsync(
      FFMPEG_BIN,
      [
        "-y",
        "-i",
        inputPath,
        "-ar",
        "16000",
        "-ac",
        "1",
        "-c:a",
        "pcm_s16le",
        outputPath,
      ],
      { maxBuffer: 1024 * 1024 * 8, signal },
    );
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }

    throw new AppError(
      "AUDIO_PREP_FAILED",
      `Не удалось подготовить аудио. Установите ffmpeg или укажите FFMPEG_BIN. Детали: ${readCommandError(
        error,
      )}`,
    );
  }

  return outputPath;
}

export async function transcribeAudio(
  wavPath: string,
  workDir: string,
  language: FormDataEntryValue | null,
  signal?: AbortSignal,
) {
  const outputBase = join(workDir, "transcript");
  const args = ["-m", WHISPER_MODEL, "-f", wavPath, "-otxt", "-of", outputBase];

  if (typeof language === "string" && language) {
    args.push("-l", language);
  }

  try {
    await execFileAsync(WHISPER_BIN, args, {
      maxBuffer: 1024 * 1024 * 64,
      signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }

    throw new AppError(
      "WHISPER_FAILED",
      `Не удалось выполнить whisper.cpp. Проверьте WHISPER_CPP_BIN и WHISPER_CPP_MODEL. Детали: ${readCommandError(
        error,
      )}`,
    );
  }

  const transcript = (
    await readFile(/* turbopackIgnore: true */ `${outputBase}.txt`, "utf8")
  ).trim();

  if (!transcript) {
    throw new AppError("TRANSCRIPT_EMPTY", "Whisper вернул пустую транскрипцию.");
  }

  return transcript;
}

function sanitizeFileName(fileName: string) {
  const parsedName = basename(fileName).replace(/[^a-zA-Z0-9._-]/g, "_");
  return parsedName || "upload";
}
