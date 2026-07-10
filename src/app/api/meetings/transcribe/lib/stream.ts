import type { StreamEvent } from "./types";

const streamEncoder = new TextEncoder();

export function createStreamResponse(stream: ReadableStream) {
  return new Response(stream, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/x-ndjson; charset=utf-8",
    },
  });
}

export function writeStreamEvent(
  controller: ReadableStreamDefaultController,
  event: StreamEvent,
) {
  try {
    controller.enqueue(streamEncoder.encode(`${JSON.stringify(event)}\n`));
  } catch {
    // The client may have aborted the request while a long-running stage ended.
  }
}
