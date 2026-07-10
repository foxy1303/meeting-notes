"use client";

import {
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { MeetingResult, ProcessingStage } from "../types";
import { readTranscriptionResponse } from "./readTranscriptionResponse";

const formatter = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 1,
});

export function useMeetingTranscription() {
  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [language, setLanguage] = useState("ru");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<MeetingResult | null>(null);
  const [processingStartedAt, setProcessingStartedAt] = useState<number | null>(
    null,
  );
  const [processingStage, setProcessingStage] =
    useState<ProcessingStage>("idle");
  const [processingMessage, setProcessingMessage] = useState("");

  const fileMeta = useMemo(() => {
    if (!file) {
      return "MP3, M4A, WAV, WEBM или MP4";
    }

    const size = formatter.format(file.size / 1024 / 1024);
    return `${file.name} · ${size} МБ`;
  }, [file]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();

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

    revokePreviewUrl();
    const objectUrl = URL.createObjectURL(nextFile);
    previewUrlRef.current = objectUrl;
    setPreviewUrl(objectUrl);
    setFile(nextFile);
    setResult(null);
    setError("");
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

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    startProcessing();

    const formData = new FormData();
    formData.append("file", file);
    formData.append("language", language);

    try {
      const response = await fetch("/api/meetings/transcribe", {
        method: "POST",
        body: formData,
        signal: abortController.signal,
      });
      const payload = await readTranscriptionResponse(response, (progress) => {
        setProcessingStage(progress.stage);
        setProcessingMessage(progress.message);
      });

      setResult(payload);
    } catch (requestError) {
      if (abortController.signal.aborted) {
        setError("Обработка остановлена.");
      } else {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Не удалось обработать запись.",
        );
      }

      resetProcessing();
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }

      setIsLoading(false);
      setProcessingStartedAt(null);
    }
  }

  function cancelProcessing() {
    abortControllerRef.current?.abort();
  }

  function resetFile() {
    if (isLoading) {
      return;
    }

    setFile(null);
    setPreviewUrl("");
    setResult(null);
    setError("");
    resetProcessing();
    revokePreviewUrl();

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
    selectFile(event.dataTransfer.files.item(0));
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    selectFile(event.target.files?.[0] ?? null);
  }

  function startProcessing() {
    setIsLoading(true);
    setProcessingStartedAt(Date.now());
    setProcessingStage("upload");
    setProcessingMessage("Отправляем файл");
    setError("");
    setResult(null);
  }

  function resetProcessing() {
    setProcessingStage("idle");
    setProcessingMessage("");
  }

  function revokePreviewUrl() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = "";
    }
  }

  return {
    cancelProcessing,
    error,
    file,
    fileInputRef,
    fileMeta,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleFileChange,
    handleSubmit,
    isDragging,
    isLoading,
    language,
    previewUrl,
    processingMessage,
    processingStage,
    processingStartedAt,
    resetFile,
    result,
    setLanguage,
  };
}
