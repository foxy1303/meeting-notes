import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSummary } from "../src/app/api/meetings/transcribe/lib/normalizeSummary";

test("normalizeSummary keeps valid fields and filters invalid array entries", () => {
  assert.deepEqual(
    normalizeSummary({
      summary: "Итог",
      sections: [
        { title: "Раздел", items: ["пункт", 1] },
        { title: 123, items: ["skip"] },
      ],
      keyPoints: ["важно", null],
      decisions: ["решение"],
      actionItems: [
        { task: "сделать", owner: "Аня", deadline: "пятница" },
        { owner: "без задачи" },
      ],
      questions: ["вопрос"],
      risks: ["риск"],
    }),
    {
      summary: "Итог",
      sections: [{ title: "Раздел", items: ["пункт"] }],
      keyPoints: ["важно"],
      decisions: ["решение"],
      actionItems: [{ task: "сделать", owner: "Аня", deadline: "пятница" }],
      questions: ["вопрос"],
      risks: ["риск"],
    },
  );
});

test("normalizeSummary rejects non-object payload", () => {
  assert.throws(() => normalizeSummary(null), /неожиданном формате/);
});
