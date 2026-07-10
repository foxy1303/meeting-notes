"use client";

import { type RefObject, useEffect, useRef, useState } from "react";
import { FileAudio } from "lucide-react";
import { formatTime } from "../lib/format";
import {
  buildFallbackWaveform,
  extractWaveform,
  WAVEFORM_BARS,
} from "../lib/waveform";
import styles from "./PreviewPlayer.module.css";

type PreviewPlayerProps = {
  file: File | null;
  previewUrl: string;
};

export function PreviewPlaceholder() {
  return (
    <div className={styles.previewPlaceholder}>
      <span className={styles.placeholderIcon} aria-hidden="true">
        <FileAudio size={22} strokeWidth={2.1} />
      </span>
      <div>
        <span>Предпросмотр</span>
        <p>После выбора файла здесь появится встроенный плеер.</p>
      </div>
      <div className={styles.placeholderWave} aria-hidden="true">
        {Array.from({ length: 18 }, (_, index) => (
          <i key={index} style={{ height: `${20 + ((index * 13) % 42)}%` }} />
        ))}
      </div>
    </div>
  );
}

export function PreviewPlayer({ file, previewUrl }: PreviewPlayerProps) {
  const mediaRef = useRef<HTMLAudioElement | HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [waveform, setWaveform] = useState<number[]>([]);
  const [waveformStatus, setWaveformStatus] = useState("Анализируем волну...");
  const isVideo = file?.type.startsWith("video/");
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  useEffect(() => {
    let isCancelled = false;

    async function buildWaveform() {
      if (!file) {
        setWaveform([]);
        return;
      }

      setWaveform([]);
      setWaveformStatus("Анализируем волну...");

      try {
        const values = await extractWaveform(file, WAVEFORM_BARS);

        if (!isCancelled) {
          setWaveform(values);
          setWaveformStatus("");
        }
      } catch {
        if (!isCancelled) {
          setWaveform(buildFallbackWaveform(WAVEFORM_BARS));
          setWaveformStatus("Waveform недоступен, показан упрощенный вид.");
        }
      }
    }

    void buildWaveform();

    return () => {
      isCancelled = true;
    };
  }, [file]);

  async function togglePlayback() {
    const media = mediaRef.current;

    if (!media) {
      return;
    }

    if (media.paused) {
      await media.play();
      setIsPlaying(true);
    } else {
      media.pause();
      setIsPlaying(false);
    }
  }

  function seek(value: string) {
    const media = mediaRef.current;

    if (!media || duration <= 0) {
      return;
    }

    const nextTime = (Number(value) / 100) * duration;
    media.currentTime = nextTime;
    setCurrentTime(nextTime);
  }

  return (
    <div className={styles.preview}>
      <div className={styles.previewHeader}>
        <span>Прослушивание</span>
        <strong>{file?.name}</strong>
      </div>
      {isVideo ? (
        <video
          ref={mediaRef as RefObject<HTMLVideoElement>}
          className={styles.videoPreview}
          src={previewUrl}
          onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
          onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
          onEnded={() => setIsPlaying(false)}
        />
      ) : (
        <audio
          ref={mediaRef as RefObject<HTMLAudioElement>}
          src={previewUrl}
          onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
          onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
          onEnded={() => setIsPlaying(false)}
        />
      )}
      <div className={styles.trackPlayer}>
        <button type="button" onClick={togglePlayback} className={styles.playButton}>
          {isPlaying ? "Ⅱ" : "▶"}
        </button>
        <div className={styles.trackBody}>
          <div className={styles.waveform} aria-hidden="true">
            {(waveform.length > 0
              ? waveform
              : buildFallbackWaveform(WAVEFORM_BARS)
            ).map((value, index, values) => (
              <span
                key={index}
                style={{
                  height: `${Math.max(8, value * 100)}%`,
                  opacity: index / values.length <= progress / 100 ? 1 : 0.34,
                }}
              />
            ))}
          </div>
          {waveformStatus ? (
            <p className={styles.waveformStatus}>{waveformStatus}</p>
          ) : null}
          <input
            className={styles.seek}
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={progress}
            onChange={(event) => seek(event.target.value)}
            aria-label="Позиция воспроизведения"
          />
          <div className={styles.timeRow}>
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
