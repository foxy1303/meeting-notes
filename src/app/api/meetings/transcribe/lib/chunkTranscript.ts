export function splitTranscript(transcript: string, maxChunkChars: number) {
  if (transcript.length <= maxChunkChars) {
    return [transcript];
  }

  const paragraphs = transcript.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    current = collectParagraphChunks(paragraph, current, chunks, maxChunkChars);
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

function collectParagraphChunks(
  paragraph: string,
  current: string,
  chunks: string[],
  maxChunkChars: number,
) {
  const next = current ? `${current}\n\n${paragraph}` : paragraph;

  if (next.length <= maxChunkChars) {
    return next;
  }

  if (current) {
    chunks.push(current);
  }

  if (paragraph.length <= maxChunkChars) {
    return paragraph;
  }

  return collectSentenceChunks(paragraph, chunks, maxChunkChars);
}

function collectSentenceChunks(
  paragraph: string,
  chunks: string[],
  maxChunkChars: number,
) {
  const sentences = paragraph.split(/(?<=[.!?。！？])\s+/);
  let current = "";

  for (const sentence of sentences) {
    const nextSentence = current ? `${current} ${sentence}` : sentence;

    if (nextSentence.length <= maxChunkChars) {
      current = nextSentence;
    } else {
      if (current) {
        chunks.push(current);
      }

      current = sentence.slice(0, maxChunkChars);
    }
  }

  return current;
}
