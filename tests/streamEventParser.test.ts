import assert from "node:assert/strict";
import test from "node:test";
import { parseStreamEvent } from "../src/app/lib/streamEventParser";

const resultPayload = {
  fileName: "meeting.wav",
  transcript: "hello",
  summary: "summary",
  sections: [{ title: "Topic", items: ["item"] }],
  keyPoints: ["point"],
  decisions: ["decision"],
  actionItems: [{ task: "task", owner: "owner", deadline: "today" }],
  questions: ["question"],
  risks: ["risk"],
};

test("parseStreamEvent returns null for empty lines", () => {
  assert.equal(parseStreamEvent("  "), null);
});

test("parseStreamEvent accepts progress events with known stage", () => {
  const event = parseStreamEvent(
    JSON.stringify({
      type: "progress",
      stage: "summary",
      message: "Preparing summary",
    }),
  );

  assert.deepEqual(event, {
    type: "progress",
    stage: "summary",
    message: "Preparing summary",
  });
});

test("parseStreamEvent rejects unknown progress stage", () => {
  assert.throws(
    () =>
      parseStreamEvent(
        JSON.stringify({
          type: "progress",
          stage: "unknown",
          message: "bad",
        }),
      ),
    /неожиданном формате/,
  );
});

test("parseStreamEvent validates result payload shape", () => {
  assert.deepEqual(
    parseStreamEvent(JSON.stringify({ type: "result", payload: resultPayload })),
    { type: "result", payload: resultPayload },
  );

  assert.throws(
    () =>
      parseStreamEvent(
        JSON.stringify({
          type: "result",
          payload: { ...resultPayload, transcript: 12 },
        }),
      ),
    /неожиданном формате/,
  );
});

test("parseStreamEvent accepts coded error events", () => {
  assert.deepEqual(
    parseStreamEvent(
      JSON.stringify({
        type: "error",
        code: "WHISPER_FAILED",
        error: "Whisper failed",
      }),
    ),
    {
      type: "error",
      code: "WHISPER_FAILED",
      error: "Whisper failed",
    },
  );
});
