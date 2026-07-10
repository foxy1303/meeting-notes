import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFallbackSections,
  buildProtocolText,
} from "../src/app/lib/protocol";
import type { MeetingResult } from "../src/app/types";

const result: MeetingResult = {
  fileName: "call.wav",
  transcript: "full text",
  summary: "summary",
  sections: [],
  keyPoints: ["point"],
  decisions: ["decision"],
  actionItems: [{ task: "task", owner: "owner" }],
  questions: [],
  risks: ["risk"],
};

test("buildFallbackSections keeps only non-empty sections", () => {
  assert.deepEqual(buildFallbackSections(result), [
    { title: "Ключевые пункты", items: ["point"] },
    { title: "Решения", items: ["decision"] },
    { title: "Задачи", items: ["task · owner"] },
    { title: "Риски", items: ["risk"] },
  ]);
});

test("buildProtocolText includes summary, sections, and transcript", () => {
  const text = buildProtocolText(result, [
    { title: "Ключевые пункты", items: ["point"] },
  ]);

  assert.match(text, /call\.wav/);
  assert.match(text, /Общий итог\nsummary/);
  assert.match(text, /• point/);
  assert.match(text, /Полная транскрипция\n\nfull text/);
});
