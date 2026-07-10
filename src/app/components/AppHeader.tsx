"use client";

import { useEffect, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2 } from "lucide-react";
import styles from "./AppHeader.module.css";

type HealthState = "checking" | "ready" | "warning";

export function AppHeader() {
  const [health, setHealth] = useState<HealthState>("checking");

  useEffect(() => {
    let cancelled = false;

    async function checkHealth() {
      try {
        const response = await fetch("/api/health", { cache: "no-store" });

        if (!cancelled) {
          setHealth(response.ok ? "ready" : "warning");
        }
      } catch {
        if (!cancelled) {
          setHealth("warning");
        }
      }
    }

    void checkHealth();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <header className={styles.header}>
      <div>
        <p className={styles.eyebrow}>Транскрипция совещаний</p>
        <h1>Рабочий протокол из записи</h1>
      </div>
      <div className={styles.headerAside}>
        <p>
          Whisper распознает речь, chat-модель собирает сводку, решения, задачи,
          вопросы и риски.
        </p>
        <HealthBadge state={health} />
      </div>
    </header>
  );
}

function HealthBadge({ state }: { state: HealthState }) {
  const content = {
    checking: {
      icon: <Activity size={14} strokeWidth={2.2} />,
      label: "Проверяем окружение",
    },
    ready: {
      icon: <CheckCircle2 size={14} strokeWidth={2.2} />,
      label: "Окружение готово",
    },
    warning: {
      icon: <AlertTriangle size={14} strokeWidth={2.2} />,
      label: "Нужна проверка настроек",
    },
  }[state];

  return (
    <span className={[styles.healthBadge, styles[state]].join(" ")}>
      {content.icon}
      {content.label}
    </span>
  );
}
