import type { ChangeEvent, DragEvent, FormEvent, RefObject } from "react";
import { FileAudio, FileVideo, UploadCloud, X } from "lucide-react";
import styles from "./UploadPanel.module.css";

type UploadPanelProps = {
  error: string;
  file: File | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  fileMeta: string;
  isDragging: boolean;
  isLoading: boolean;
  language: string;
  onCancel: () => void;
  onDragEnter: (event: DragEvent<HTMLLabelElement>) => void;
  onDragLeave: (event: DragEvent<HTMLLabelElement>) => void;
  onDragOver: (event: DragEvent<HTMLLabelElement>) => void;
  onDrop: (event: DragEvent<HTMLLabelElement>) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onLanguageChange: (language: string) => void;
  onReset: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function UploadPanel({
  error,
  file,
  fileInputRef,
  fileMeta,
  isDragging,
  isLoading,
  language,
  onCancel,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  onFileChange,
  onLanguageChange,
  onReset,
  onSubmit,
}: UploadPanelProps) {
  const FileIcon = file?.type.startsWith("video/") ? FileVideo : FileAudio;
  const fileSize = file ? formatFileSize(file.size) : "";

  return (
    <form className={styles.uploadPanel} onSubmit={onSubmit} aria-busy={isLoading}>
      <div className={styles.panelHeader}>
        <div>
          <h2>Запись</h2>
          <p>Аудио или видео совещания</p>
        </div>
        {file ? (
          <button
            className={styles.iconButton}
            type="button"
            onClick={onReset}
            disabled={isLoading}
            aria-label="Удалить выбранный файл"
            title="Удалить файл"
          >
            <X aria-hidden="true" size={17} strokeWidth={2.2} />
          </button>
        ) : null}
      </div>

      <label
        className={[
          styles.dropzone,
          isDragging ? styles.dropzoneActive : "",
          isLoading ? styles.dropzoneDisabled : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,video/mp4,video/webm"
          onChange={onFileChange}
          disabled={isLoading}
        />
        <span className={styles.dropzoneIcon} aria-hidden="true">
          <UploadCloud size={22} strokeWidth={2.2} />
        </span>
        <span className={styles.dropzoneTitle}>
          {isDragging
            ? "Отпустите файл"
            : file
              ? "Выбрать другой файл"
              : "Выберите или перетащите файл"}
        </span>
        <span className={styles.dropzoneMeta}>
          {isLoading
            ? "Файл обрабатывается"
            : file
              ? "MP3, M4A, WAV, WEBM или MP4"
              : fileMeta}
        </span>
      </label>

      {file ? (
        <div className={styles.fileRow}>
          <span className={styles.fileIcon} aria-hidden="true">
            <FileIcon size={18} strokeWidth={2.1} />
          </span>
          <div className={styles.fileDetails}>
            <strong>{file.name}</strong>
            <span>{fileSize}</span>
          </div>
        </div>
      ) : null}

      <label className={styles.field}>
        <span>Язык записи</span>
        <select
          value={language}
          onChange={(event) => onLanguageChange(event.target.value)}
          disabled={isLoading}
        >
          <option value="ru">Русский</option>
          <option value="en">English</option>
          <option value="">Определить автоматически</option>
        </select>
      </label>

      <div className={styles.actions}>
        {isLoading ? (
          <button
            className={styles.dangerButton}
            type="button"
            onClick={onCancel}
          >
            Остановить
          </button>
        ) : (
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={onReset}
            aria-disabled={!file}
          >
            Сбросить
          </button>
        )}
        <button
          className={styles.primaryButton}
          type="submit"
          aria-disabled={isLoading || !file}
        >
          {isLoading ? "Обработка..." : "Получить протокол"}
        </button>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}
    </form>
  );
}

function formatFileSize(size: number) {
  return `${new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 1,
  }).format(size / 1024 / 1024)} МБ`;
}
