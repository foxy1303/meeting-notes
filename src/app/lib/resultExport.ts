import type { MeetingResult, ResultTab, SummarySection } from "../types";
import { buildProtocolText } from "./protocol";

type ExportTarget = {
  extension: "md" | "txt";
  fileName: string;
  label: string;
  text: string;
};

export function buildResultExport(
  result: MeetingResult,
  sections: SummarySection[],
  activeTab: ResultTab,
): ExportTarget {
  const baseName = stripExtension(result.fileName);

  if (activeTab === "transcript") {
    return {
      extension: "txt",
      fileName: `${baseName}-transcript.txt`,
      label: "Скачать транскрипцию .txt",
      text: result.transcript,
    };
  }

  if (activeTab === "actions") {
    return {
      extension: "md",
      fileName: `${baseName}-actions.md`,
      label: "Скачать действия .md",
      text: buildActionsText(result),
    };
  }

  if (activeTab === "details") {
    return {
      extension: "md",
      fileName: `${baseName}-sections.md`,
      label: "Скачать разделы .md",
      text: buildSectionsText(result, sections),
    };
  }

  return {
    extension: "md",
    fileName: `${baseName}-summary.md`,
    label: "Скачать сводку .md",
    text: buildSummaryText(result),
  };
}

export function downloadText(fileName: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function buildFullProtocolExport(
  result: MeetingResult,
  sections: SummarySection[],
) {
  return {
    fileName: `${stripExtension(result.fileName)}-protocol.md`,
    text: buildProtocolText(result, sections),
  };
}

function buildSummaryText(result: MeetingResult) {
  return [
    `# ${result.fileName}`,
    "",
    "## Общий итог",
    result.summary,
    "",
    "## Ключевые пункты",
    ...result.keyPoints.map((item) => `- ${item}`),
    "",
    "## Решения",
    ...result.decisions.map((item) => `- ${item}`),
    "",
    "## Риски",
    ...result.risks.map((item) => `- ${item}`),
  ].join("\n");
}

function buildSectionsText(result: MeetingResult, sections: SummarySection[]) {
  return [
    `# ${result.fileName}`,
    "",
    ...sections.flatMap((section) => [
      `## ${section.title}`,
      ...section.items.map((item) => `- ${item}`),
      "",
    ]),
  ].join("\n");
}

function buildActionsText(result: MeetingResult) {
  return [
    `# ${result.fileName}`,
    "",
    "## Задачи",
    ...result.actionItems.map((item) =>
      `- ${[item.task, item.owner, item.deadline].filter(Boolean).join(" · ")}`,
    ),
    "",
    "## Открытые вопросы",
    ...result.questions.map((item) => `- ${item}`),
    "",
    "## Решения",
    ...result.decisions.map((item) => `- ${item}`),
    "",
    "## Риски",
    ...result.risks.map((item) => `- ${item}`),
  ].join("\n");
}

function stripExtension(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "") || "meeting";
}
