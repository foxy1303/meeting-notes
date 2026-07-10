import assert from "node:assert/strict";
import test from "node:test";
import { splitTranscript } from "../src/app/api/meetings/transcribe/lib/chunkTranscript";

test("splitTranscript returns the original text when it fits", () => {
  assert.deepEqual(splitTranscript("short transcript", 100), ["short transcript"]);
});

test("splitTranscript splits by paragraphs where possible", () => {
  const chunks = splitTranscript("first paragraph\n\nsecond paragraph", 18);

  assert.deepEqual(chunks, ["first paragraph", "second paragraph"]);
});

test("splitTranscript splits oversized paragraphs by sentence", () => {
  const chunks = splitTranscript("First sentence. Second sentence.", 18);

  assert.deepEqual(chunks, ["First sentence.", "Second sentence."]);
});
