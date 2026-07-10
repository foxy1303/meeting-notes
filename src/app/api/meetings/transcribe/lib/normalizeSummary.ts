import { isRecord, readString, readStringArray } from "./common";
import type { ActionItem, MeetingSummary, SummarySection } from "./types";

export function normalizeSummary(summary: unknown): MeetingSummary {
  if (!isRecord(summary)) {
    throw new Error("Сводка пришла в неожиданном формате.");
  }

  return {
    summary: readString(summary.summary),
    sections: readSummarySections(summary.sections),
    keyPoints: readStringArray(summary.keyPoints),
    decisions: readStringArray(summary.decisions),
    actionItems: readActionItems(summary.actionItems),
    questions: readStringArray(summary.questions),
    risks: readStringArray(summary.risks),
  };
}

function readSummarySections(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((section): SummarySection[] => {
    if (!isRecord(section) || typeof section.title !== "string") {
      return [];
    }

    return [
      {
        title: section.title,
        items: readStringArray(section.items),
      },
    ];
  });
}

function readActionItems(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item): ActionItem[] => {
    if (!isRecord(item) || typeof item.task !== "string") {
      return [];
    }

    return [
      {
        task: item.task,
        owner: readString(item.owner),
        deadline: readString(item.deadline),
      },
    ];
  });
}
