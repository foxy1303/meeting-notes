import type { MeetingResult, SummarySection } from "../types";

export function buildFallbackSections(result: MeetingResult): SummarySection[] {
  return [
    { title: "Ключевые пункты", items: result.keyPoints },
    { title: "Решения", items: result.decisions },
    {
      title: "Задачи",
      items: result.actionItems.map((item) =>
        [item.task, item.owner, item.deadline].filter(Boolean).join(" · "),
      ),
    },
    { title: "Требуют уточнения", items: result.questions },
    { title: "Риски", items: result.risks },
  ].filter((section) => section.items.length > 0);
}

export function buildProtocolText(
  result: MeetingResult,
  sections: SummarySection[],
) {
  const parts = [`${result.fileName}`, "", "Общий итог", result.summary, ""];

  for (const section of sections) {
    parts.push(section.title, "");
    parts.push(...section.items.map((item) => `• ${item}`), "");
  }

  parts.push("Полная транскрипция", "", result.transcript);

  return parts.join("\n");
}
