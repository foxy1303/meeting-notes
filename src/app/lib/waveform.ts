export const WAVEFORM_BARS = 64;

export async function extractWaveform(file: File, barsCount: number) {
  const audioContext = new AudioContext();

  try {
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);
    const samplesPerBar = Math.max(1, Math.floor(channelData.length / barsCount));
    const bars = Array.from({ length: barsCount }, (_, index) => {
      const start = index * samplesPerBar;
      const end = Math.min(start + samplesPerBar, channelData.length);
      let sum = 0;

      for (let sampleIndex = start; sampleIndex < end; sampleIndex += 1) {
        sum += channelData[sampleIndex] ** 2;
      }

      return Math.sqrt(sum / Math.max(1, end - start));
    });
    const max = Math.max(...bars, 0.01);

    return bars.map((value) => 0.12 + (value / max) * 0.88);
  } finally {
    await audioContext.close();
  }
}

export function buildFallbackWaveform(count: number) {
  return Array.from(
    { length: count },
    (_, index) => 0.28 + (((index * 17) % 52) / 100),
  );
}
