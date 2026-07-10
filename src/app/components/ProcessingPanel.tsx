"use client";

import { useEffect, useState } from "react";
import { Check, Circle, LoaderCircle } from "lucide-react";
import { formatElapsed } from "../lib/format";
import type { ProcessingStage } from "../types";
import styles from "./ProcessingPanel.module.css";

type ProcessingPanelProps = {
  isLoading: boolean;
  hasFile: boolean;
  startedAt: number | null;
  stage: ProcessingStage;
  message: string;
};

const steps: { id: ProcessingStage; label: string }[] = [
  { id: "upload", label: "Получение файла" },
  { id: "audio", label: "Подготовка аудио" },
  { id: "transcript", label: "Распознавание речи" },
  { id: "summary", label: "Подготовка сводки" },
  { id: "done", label: "Готово" },
];

export function ProcessingPanel({
  isLoading,
  hasFile,
  startedAt,
  stage,
  message,
}: ProcessingPanelProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!isLoading || !startedAt) {
      return;
    }

    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isLoading, startedAt]);

  const activeStepIndex = Math.max(
    0,
    steps.findIndex((step) => step.id === stage),
  );
  const status = isLoading
    ? `${message || "Идет обработка"}, ${formatElapsed(elapsedSeconds)}`
    : hasFile
      ? "Файл готов к отправке"
      : "Ожидание файла";

  return (
    <div className={styles.processingPanel}>
      <div className={styles.panelHeader}>
        <div>
          <h2>Статус</h2>
          <p>{status}</p>
        </div>
        <span
          className={[
            styles.statusDot,
            isLoading ? styles.statusDotActive : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-hidden="true"
        />
      </div>
      <ol className={styles.processingSteps}>
        {steps.map((step, index) => (
          <li
            className={[
              isLoading && index === activeStepIndex
                ? styles.processingStepActive
                : "",
              isLoading && index < activeStepIndex
                ? styles.processingStepDone
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            key={step.id}
          >
            <span className={styles.stepIcon}>
              {isLoading && index < activeStepIndex ? (
                <Check size={14} strokeWidth={2.6} />
              ) : isLoading && index === activeStepIndex ? (
                <LoaderCircle size={14} strokeWidth={2.4} />
              ) : (
                <Circle size={10} strokeWidth={2.4} />
              )}
            </span>
            <span className={styles.stepLabel}>{step.label}</span>
            {isLoading && index === activeStepIndex ? (
              <span className={styles.elapsed}>{formatElapsed(elapsedSeconds)}</span>
            ) : null}
          </li>
        ))}
      </ol>
      <p className={styles.processingNote}>
        Длинные записи могут обрабатываться несколько минут. Не закрывайте
        вкладку до появления результата.
      </p>
    </div>
  );
}
