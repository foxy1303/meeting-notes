export type ActionItem = {
  task: string;
  owner?: string;
  deadline?: string;
};

export type MeetingSummary = {
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
  | "upload"
  | "audio"
  | "transcript"
  | "summary"
  | "done";

export type StreamEvent =
  | {
      type: "progress";
      stage: ProcessingStage;
      message: string;
    }
  | {
      type: "result";
      payload: MeetingSummary & {
        fileName: string;
        transcript: string;
      };
    }
  | {
      type: "error";
      error: string;
      code?: string;
    };

export type ChatModelConfig = {
  baseUrl: string;
  apiKey?: string;
  model: string;
  source: string;
};
