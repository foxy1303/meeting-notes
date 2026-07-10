import type { MeetingResult } from "../types";
import { isMeetingResult } from "./streamEventParser";

const LAST_RESULT_STORAGE_KEY = "meeting-transcriber:last-result:v1";

export function readLastResult() {
  try {
    const raw = window.localStorage.getItem(LAST_RESULT_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as unknown;

    if (isMeetingResult(parsed)) {
      return parsed;
    }

    clearLastResult();
    return null;
  } catch {
    clearLastResult();
    return null;
  }
}

export function saveLastResult(result: MeetingResult) {
  try {
    window.localStorage.setItem(LAST_RESULT_STORAGE_KEY, JSON.stringify(result));
  } catch {
    // Storage can be unavailable or full; processing result should still render.
  }
}

export function clearLastResult() {
  try {
    window.localStorage.removeItem(LAST_RESULT_STORAGE_KEY);
  } catch {
    // Ignore storage cleanup errors.
  }
}
