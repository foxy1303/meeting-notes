"use client";

import { AppHeader } from "./components/AppHeader";
import { EmptyState } from "./components/EmptyState";
import { PreviewPlaceholder, PreviewPlayer } from "./components/PreviewPlayer";
import { ProcessingPanel } from "./components/ProcessingPanel";
import { Results } from "./components/Results";
import { UploadPanel } from "./components/UploadPanel";
import { useMeetingTranscription } from "./lib/useMeetingTranscription";
import styles from "./page.module.css";

export default function Home() {
  const transcription = useMeetingTranscription();

  return (
    <main className={styles.page}>
      <section className={styles.workspace}>
        <AppHeader />

        <div className={styles.workbench}>
          <UploadPanel
            error={transcription.error}
            file={transcription.file}
            fileInputRef={transcription.fileInputRef}
            fileMeta={transcription.fileMeta}
            isDragging={transcription.isDragging}
            isLoading={transcription.isLoading}
            language={transcription.language}
            onCancel={transcription.cancelProcessing}
            onDragEnter={transcription.handleDragEnter}
            onDragLeave={transcription.handleDragLeave}
            onDragOver={transcription.handleDragOver}
            onDrop={transcription.handleDrop}
            onFileChange={transcription.handleFileChange}
            onLanguageChange={transcription.setLanguage}
            onReset={transcription.resetFile}
            onSubmit={transcription.handleSubmit}
          />

          <aside className={styles.sidePanel}>
            {transcription.previewUrl ? (
              <PreviewPlayer
                file={transcription.file}
                previewUrl={transcription.previewUrl}
              />
            ) : (
              <PreviewPlaceholder />
            )}

            <ProcessingPanel
              isLoading={transcription.isLoading}
              hasFile={Boolean(transcription.file)}
              startedAt={transcription.processingStartedAt}
              stage={transcription.processingStage}
              message={transcription.processingMessage}
            />
          </aside>
        </div>

        {transcription.result ? (
          <Results result={transcription.result} />
        ) : (
          <EmptyState />
        )}
      </section>
    </main>
  );
}
