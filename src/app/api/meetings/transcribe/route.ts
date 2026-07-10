import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AppError, toAppError } from "./lib/appError";
import { prepareAudio, saveUpload, transcribeAudio } from "./lib/audio";
import { createProcessingLogger } from "./lib/processingLogger";
import { acquireProcessingSlot } from "./lib/processingSemaphore";
import { createStreamResponse, writeStreamEvent } from "./lib/stream";
import { summarizeMeeting } from "./lib/summary";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_FILE_SIZE = Number(process.env.MAX_UPLOAD_MB || 200) * 1024 * 1024;

export async function POST(request: Request) {
  const logger = createProcessingLogger();
  const stream = new ReadableStream({
    async start(controller) {
      let workDir = "";
      let completed = false;
      let releaseSlot: (() => void) | null = null;

      try {
        logger.info("request_start");
        releaseSlot = acquireProcessingSlot();
        writeStreamEvent(controller, {
          type: "progress",
          stage: "upload",
          message: "Получаем файл",
        });

        const { language, originalPath, upload } = await logger.measure(
          "upload",
          {},
          async () => {
            const body = await request.formData();
            const nextUpload = readUpload(body);
            const nextLanguage = body.get("language");
            workDir = await mkdtemp(join(tmpdir(), "meeting-transcription-"));
            const nextOriginalPath = await saveUpload(nextUpload, workDir);

            return {
              language: nextLanguage,
              originalPath: nextOriginalPath,
              upload: nextUpload,
            };
          },
        );

        writeStreamEvent(controller, {
          type: "progress",
          stage: "audio",
          message: "Готовим аудио для распознавания",
        });

        const fileFields = {
          fileSizeBytes: upload.size,
          fileType: upload.type || "unknown",
        };
        const wavPath = await logger.measure(
          "audio",
          fileFields,
          () => prepareAudio(originalPath, workDir, request.signal),
        );

        writeStreamEvent(controller, {
          type: "progress",
          stage: "transcript",
          message: "Распознаём речь через Whisper",
        });

        const transcript = await logger.measure(
          "transcript",
          fileFields,
          () => transcribeAudio(wavPath, workDir, language, request.signal),
        );

        writeStreamEvent(controller, {
          type: "progress",
          stage: "summary",
          message: "Собираем протокол и ключевые пункты",
        });

        const summary = await logger.measure(
          "summary",
          { transcriptChars: transcript.length },
          () =>
            summarizeMeeting(transcript, {
              onProgress: (message) =>
                writeStreamEvent(controller, {
                  type: "progress",
                  stage: "summary",
                  message,
                }),
              signal: request.signal,
            }),
        );

        writeStreamEvent(controller, {
          type: "progress",
          stage: "done",
          message: "Протокол готов",
        });
        writeStreamEvent(controller, {
          type: "result",
          payload: {
            fileName: upload.name,
            transcript,
            ...summary,
          },
        });
        completed = true;
      } catch (error) {
        const appError = toAppError(error);
        logger.error("request_error", appError, { code: appError.code });
        writeStreamEvent(controller, {
          type: "error",
          code: appError.code,
          error: appError.message,
        });
      } finally {
        releaseSlot?.();

        if (workDir) {
          await logger.measure("cleanup", {}, () =>
            rm(workDir, { force: true, recursive: true }),
          );
        }

        logger.finish({ completed });
        controller.close();
      }
    },
  });

  return createStreamResponse(stream);
}

function readUpload(body: FormData) {
  const upload = body.get("file");

  if (!(upload instanceof File)) {
    throw new AppError("FILE_MISSING", "Файл записи не найден в запросе.");
  }

  if (upload.size > MAX_FILE_SIZE) {
    throw new AppError(
      "FILE_TOO_LARGE",
      `Файл слишком большой. Максимальный размер: ${Math.round(
        MAX_FILE_SIZE / 1024 / 1024,
      )} МБ.`,
    );
  }

  return upload;
}
