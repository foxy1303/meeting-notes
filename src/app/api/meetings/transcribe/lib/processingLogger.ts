import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";

type LogFields = Record<string, string | number | boolean | null | undefined>;

type LogEvent = LogFields & {
  event: string;
  requestId: string;
  scope: "meeting-transcription";
  timestamp: string;
};

export function createProcessingLogger() {
  const requestId = randomUUID();
  const startedAt = performance.now();

  function info(event: string, fields: LogFields = {}) {
    console.info(
      JSON.stringify({
        scope: "meeting-transcription",
        requestId,
        event,
        timestamp: new Date().toISOString(),
        ...compactFields(fields),
      } satisfies LogEvent),
    );
  }

  function error(event: string, caught: unknown, fields: LogFields = {}) {
    const message = caught instanceof Error ? caught.message : "unknown error";
    info(event, { ...fields, error: message });
  }

  async function measure<T>(
    stage: string,
    fields: LogFields,
    action: () => Promise<T>,
  ) {
    const stageStartedAt = performance.now();
    info("stage_start", { stage, ...fields });

    try {
      const result = await action();
      info("stage_end", {
        stage,
        durationMs: Math.round(performance.now() - stageStartedAt),
        ...fields,
      });
      return result;
    } catch (caught) {
      error("stage_error", caught, {
        stage,
        durationMs: Math.round(performance.now() - stageStartedAt),
        ...fields,
      });
      throw caught;
    }
  }

  function finish(fields: LogFields = {}) {
    info("request_end", {
      durationMs: Math.round(performance.now() - startedAt),
      ...fields,
    });
  }

  return { error, finish, info, measure, requestId };
}

function compactFields(fields: LogFields) {
  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined),
  );
}
