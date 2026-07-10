export type ActionItem = {
  task: string;
  owner?: string;
  deadline?: string;
};

export type MeetingResult = {
  fileName: string;
  transcript: string;
  summary: string;
  sections: SummarySection[];
  keyPoints: string[];
  decisions: string[];
  actionItems: ActionItem[];
  questions: string[];
  risks: string[];
};

export type SummarySection = {
  title: string;
  items: string[];
};

export type ProcessingStage =
  | "idle"
  | "upload"
  | "audio"
  | "transcript"
  | "summary"
  | "done";

export const STREAM_PROCESSING_STAGES = [
  "upload",
  "audio",
  "transcript",
  "summary",
  "done",
] as const;

export type ResultTab = "summary" | "details" | "actions" | "transcript";

export type StreamProgressEvent = {
  type: "progress";
  stage: ProcessingStage;
  message: string;
};

export type StreamResultEvent = {
  type: "result";
  payload: MeetingResult;
};

export type StreamErrorEvent = {
  type: "error";
  error: string;
  code?: string;
};

export type TranscriptionStreamEvent =
  | StreamProgressEvent
  | StreamResultEvent
  | StreamErrorEvent;
