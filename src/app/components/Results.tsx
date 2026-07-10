"use client";

import { useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import {
  buildFallbackSections,
  buildProtocolText,
} from "../lib/protocol";
import type { ActionItem, MeetingResult, ResultTab } from "../types";
import styles from "./Results.module.css";

export function Results({ result }: { result: MeetingResult }) {
  const [copyStatus, setCopyStatus] = useState("Скопировать");
  const [activeTab, setActiveTab] = useState<ResultTab>("summary");
  const sections =
    result.sections.length > 0
      ? result.sections
      : buildFallbackSections(result);
  const protocolText = buildProtocolText(result, sections);
  const tabs = buildTabs(result, sections.length);

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
        <div className={styles.resultToolbar} aria-label="Действия с протоколом">
          <button type="button" onClick={copyProtocol}>
            {copyStatus === "Скопировано" ? (
              <Check size={16} strokeWidth={2.4} />
            ) : (
              <Copy size={16} strokeWidth={2.2} />
            )}
            {copyStatus}
          </button>
          <button
            type="button"
            onClick={() => downloadText(`${result.fileName}.md`, protocolText)}
          >
            <Download size={16} strokeWidth={2.2} />
            .md
          </button>
          <button
            type="button"
            onClick={() => downloadText(`${result.fileName}.txt`, result.transcript)}
          >
            <Download size={16} strokeWidth={2.2} />
            .txt
          </button>
        </div>
      </div>

      <div className={styles.tabs} role="tablist" aria-label="Разделы протокола">
        {tabs.map((tab) => (
          <button
            className={activeTab === tab.id ? styles.tabActive : ""}
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            <span>{tab.label}</span>
            {tab.count > 0 ? <b>{tab.count}</b> : null}
          </button>
        ))}
      </div>

      {activeTab === "summary" ? <SummaryTab result={result} /> : null}
      {activeTab === "details" ? <DetailsTab sections={sections} /> : null}
      {activeTab === "actions" ? <ActionsTab result={result} /> : null}
      {activeTab === "transcript" ? (
        <article className={styles.transcriptBlock}>
          <h3>Полная транскрипция</h3>
          <pre>{result.transcript}</pre>
        </article>
      ) : null}
    </section>
  );
}

function SummaryTab({ result }: { result: MeetingResult }) {
  return (
    <div className={styles.resultGrid}>
      <article className={styles.summaryBlock}>
        <h3>Общий итог</h3>
        <p>{result.summary}</p>
      </article>
      <ListCard title="Ключевые пункты" items={result.keyPoints} />
      <ListCard title="Решения" items={result.decisions} />
      <ListCard title="Риски" items={result.risks} emptyText="Рисков нет" />
    </div>
  );
}

function DetailsTab({
  sections,
}: {
  sections: { title: string; items: string[] }[];
}) {
  return (
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
  );
}

function ActionsTab({ result }: { result: MeetingResult }) {
  return (
    <div className={styles.resultGrid}>
      <ActionItemsCard items={result.actionItems} />
      <ListCard
        title="Открытые вопросы"
        items={result.questions}
        emptyText="Открытых вопросов нет"
      />
      <ListCard title="Решения" items={result.decisions} />
      <ListCard title="Риски" items={result.risks} emptyText="Рисков нет" />
    </div>
  );
}

function ListCard({
  title,
  items,
  emptyText = "Нет данных",
}: {
  title: string;
  items: string[];
  emptyText?: string;
}) {
  return (
    <article className={styles.card}>
      <h3>{title}</h3>
      {items.length > 0 ? (
        <ul>
          {items.map((item, index) => (
            <li key={`${title}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className={styles.muted}>{emptyText}</p>
      )}
    </article>
  );
}

function ActionItemsCard({ items }: { items: ActionItem[] }) {
  return (
    <article className={styles.card}>
      <h3>Задачи</h3>
      {items.length > 0 ? (
        <ul className={styles.taskList}>
          {items.map((item, index) => (
            <li key={`${item.task}-${index}`}>
              <strong>{item.task}</strong>
              <span className={styles.taskMeta}>
                {item.owner ? <em>{item.owner}</em> : null}
                {item.deadline ? <em>{item.deadline}</em> : null}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.muted}>Задач нет</p>
      )}
    </article>
  );
}

function buildTabs(result: MeetingResult, sectionsCount: number) {
  return [
    { id: "summary" as const, label: "Сводка", count: result.keyPoints.length },
    { id: "details" as const, label: "Разделы", count: sectionsCount },
    {
      id: "actions" as const,
      label: "Действия",
      count:
        result.actionItems.length +
        result.questions.length +
        result.decisions.length +
        result.risks.length,
    },
    { id: "transcript" as const, label: "Транскрипция", count: 0 },
  ];
}

function downloadText(fileName: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
