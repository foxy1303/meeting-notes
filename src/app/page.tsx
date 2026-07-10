"use client";

import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styles from "./page.module.css";

type ActionItem = {
  task: string;
  owner?: string;
  deadline?: string;
};

type MeetingResult = {
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

type SummarySection = {
  title: string;
  items: string[];
};

type ApiError = {
  error?: string;
};

const formatter = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 1,
});
const WAVEFORM_BARS = 64;

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [language, setLanguage] = useState("ru");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<MeetingResult | null>(null);

  const fileMeta = useMemo(() => {
    if (!file) {
      return "MP3, M4A, WAV, WEBM или MP4";
    }

    const size = formatter.format(file.size / 1024 / 1024);
    return `${file.name} · ${size} МБ`;
  }, [file]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  function selectFile(nextFile: File | null) {
    if (isLoading || !nextFile) {
      return;
    }

    if (
      !nextFile.type.startsWith("audio/") &&
      !nextFile.type.startsWith("video/")
    ) {
      setError("Поддерживаются только аудио и видеофайлы.");
      return;
    }

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    const objectUrl = URL.createObjectURL(nextFile);
    previewUrlRef.current = objectUrl;
    setPreviewUrl(objectUrl);
    setFile(nextFile);
    setResult(null);
    setError("");
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    selectFile(event.target.files?.[0] ?? null);
  }

  function handleDragEnter(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();

    if (!isLoading) {
      setIsDragging(true);
    }
  }

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
  }

  function handleDragLeave(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);

    if (isLoading) {
      return;
    }

    selectFile(event.dataTransfer.files.item(0));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isLoading) {
      return;
    }

    if (!file) {
      setError("Выберите аудио или видеофайл с записью совещания.");
      return;
    }

    setIsLoading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("language", language);

    try {
      const response = await fetch("/api/meetings/transcribe", {
        method: "POST",
        body: formData,
      });

      const payload = (await readJsonResponse(response)) as MeetingResult & ApiError;

      if (!response.ok) {
        throw new Error(payload.error || "Не удалось обработать запись.");
      }

      setResult(payload);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Не удалось обработать запись.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  function resetFile() {
    if (isLoading) {
      return;
    }

    setFile(null);
    setPreviewUrl("");
    setResult(null);
    setError("");

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = "";
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.workspace}>
        <div className={styles.hero}>
          <p className={styles.eyebrow}>Транскрипция совещаний</p>
          <h1>Загрузите запись и получите протокол встречи</h1>
          <p className={styles.lead}>
            Приложение локально распознает речь через Whisper, выделит решения,
            задачи, риски и сохранит полный текст разговора для дальнейшей
            работы.
          </p>
        </div>

        <form
          className={styles.uploadPanel}
          onSubmit={handleSubmit}
          aria-busy={isLoading}
        >
          <label
            className={[
              styles.dropzone,
              isDragging ? styles.dropzoneActive : "",
              isLoading ? styles.dropzoneDisabled : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,video/mp4,video/webm"
              onChange={handleFileChange}
              disabled={isLoading}
            />
            <span className={styles.dropzoneIcon}>↑</span>
            <span className={styles.dropzoneTitle}>
              {isDragging ? "Отпустите файл здесь" : "Выберите или перетащите запись"}
            </span>
            <span className={styles.dropzoneMeta}>
              {isLoading ? "Файл заблокирован на время обработки" : fileMeta}
            </span>
          </label>

          <div className={styles.controls}>
            {previewUrl ? (
              <PreviewPlayer file={file} previewUrl={previewUrl} />
            ) : (
              <div className={styles.previewPlaceholder}>
                <span>Предпросмотр</span>
                <p>После выбора файла здесь появится встроенный плеер.</p>
              </div>
            )}

            <label className={styles.field}>
              <span>Язык записи</span>
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                disabled={isLoading}
              >
                <option value="ru">Русский</option>
                <option value="en">English</option>
                <option value="">Определить автоматически</option>
              </select>
            </label>

            <div className={styles.actions}>
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={resetFile}
                disabled={isLoading || !file}
              >
                Сбросить
              </button>
              <button
                className={styles.primaryButton}
                type="submit"
                disabled={isLoading || !file}
              >
                {isLoading ? "Обрабатываем..." : "Получить сводку"}
              </button>
            </div>
          </div>

          {error ? <p className={styles.error}>{error}</p> : null}
        </form>

        {result ? <Results result={result} /> : <EmptyState />}
      </section>
    </main>
  );
}

async function readJsonResponse(response: Response) {
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    const snippet = text.replace(/\s+/g, " ").slice(0, 180);
    throw new Error(
      `Сервер вернул не JSON (${response.status}). Фрагмент ответа: ${snippet}`,
    );
  }
}

function PreviewPlayer({
  file,
  previewUrl,
}: {
  file: File | null;
  previewUrl: string;
}) {
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
          setWaveformStatus("Браузер не смог прочитать waveform, показан упрощенный вид.");
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

async function extractWaveform(file: File, barsCount: number) {
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

function buildFallbackWaveform(count: number) {
  return Array.from(
    { length: count },
    (_, index) => 0.28 + (((index * 17) % 52) / 100),
  );
}

function Results({ result }: { result: MeetingResult }) {
  const [copyStatus, setCopyStatus] = useState("Скопировать");
  const sections =
    result.sections.length > 0
      ? result.sections
      : buildFallbackSections(result);
  const protocolText = buildProtocolText(result, sections);

  async function copyProtocol() {
    await navigator.clipboard.writeText(protocolText);
    setCopyStatus("Скопировано");
    window.setTimeout(() => setCopyStatus("Скопировать"), 1800);
  }

  return (
    <section className={styles.results} aria-live="polite">
      <div className={styles.resultHeader}>
        <div>
          <p className={styles.eyebrow}>Готово</p>
          <h2>{result.fileName}</h2>
        </div>
        <button className={styles.copyButton} type="button" onClick={copyProtocol}>
          {copyStatus}
        </button>
      </div>

      <article className={styles.summaryBlock}>
        <h3>Общий итог</h3>
        <p>{result.summary}</p>
      </article>

      <article className={styles.fullSummary}>
        <h3>Полная сводка</h3>
        {sections.map((section) => (
          <section className={styles.summarySection} key={section.title}>
            <h4>{section.title}</h4>
            <ul>
              {section.items.map((item, index) => (
                <li key={`${section.title}-${index}`}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </article>

      <article className={styles.transcriptBlock}>
        <h3>Полная транскрипция</h3>
        <pre>{result.transcript}</pre>
      </article>
    </section>
  );
}

function formatTime(value: number) {
  if (!Number.isFinite(value)) {
    return "0:00";
  }

  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${seconds}`;
}

function buildFallbackSections(result: MeetingResult): SummarySection[] {
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

function buildProtocolText(result: MeetingResult, sections: SummarySection[]) {
  const parts = [`${result.fileName}`, "", "Общий итог", result.summary, ""];

  for (const section of sections) {
    parts.push(section.title, "");
    parts.push(...section.items.map((item) => `• ${item}`), "");
  }

  parts.push("Полная транскрипция", "", result.transcript);

  return parts.join("\n");
}

function EmptyState() {
  return (
    <section className={styles.empty}>
      <div>
        <h2>Что появится после обработки</h2>
        <p>
          Сводка, список решений, задачи с ответственными, открытые вопросы,
          риски и полный текст записи. Данные обрабатываются локальными
          моделями.
        </p>
      </div>
      <div className={styles.steps}>
        <span>1. Загрузка</span>
        <span>2. Транскрипция</span>
        <span>3. Сводка</span>
      </div>
    </section>
  );
}
