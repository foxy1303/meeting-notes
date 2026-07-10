import type {
  MeetingResult,
  ProcessingStage,
  TranscriptionStreamEvent,
} from "../types";
import { STREAM_PROCESSING_STAGES } from "../types";

export function parseStreamEvent(line: string): TranscriptionStreamEvent | null {
  const trimmed = line.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = JSON.parse(trimmed) as unknown;

  if (!isStreamEvent(parsed)) {
    throw new Error("Сервер вернул событие в неожиданном формате.");
  }

  return parsed;
}

function isStreamEvent(value: unknown): value is TranscriptionStreamEvent {
  if (!isRecord(value) || typeof value.type !== "string") {
    return false;
  }

  if (value.type === "progress") {
    return isProcessingStage(value.stage) && typeof value.message === "string";
  }

  if (value.type === "error") {
    return (
      typeof value.error === "string" &&
      (value.code === undefined || typeof value.code === "string")
    );
  }

  return value.type === "result" && isMeetingResult(value.payload);
}

export function isMeetingResult(value: unknown): value is MeetingResult {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.fileName === "string" &&
    typeof value.transcript === "string" &&
    typeof value.summary === "string" &&
    isSummarySections(value.sections) &&
    isStringArray(value.keyPoints) &&
    isStringArray(value.decisions) &&
    isActionItems(value.actionItems) &&
    isStringArray(value.questions) &&
    isStringArray(value.risks)
  );
}

function isProcessingStage(value: unknown): value is ProcessingStage {
  return (
    typeof value === "string" &&
    STREAM_PROCESSING_STAGES.includes(
      value as (typeof STREAM_PROCESSING_STAGES)[number],
    )
  );
}

function isSummarySections(value: unknown) {
  return (
    Array.isArray(value) &&
    value.every(
      (section) =>
        isRecord(section) &&
        typeof section.title === "string" &&
        isStringArray(section.items),
    )
  );
}

function isActionItems(value: unknown) {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        isRecord(item) &&
        typeof item.task === "string" &&
        optionalString(item.owner) &&
        optionalString(item.deadline),
    )
  );
}

function isStringArray(value: unknown) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function optionalString(value: unknown) {
  return value === undefined || typeof value === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
