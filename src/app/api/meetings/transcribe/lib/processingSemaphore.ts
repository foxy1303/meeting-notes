import { AppError } from "./appError";

let activeJobs = 0;

const MAX_ACTIVE_JOBS = Number(process.env.MAX_ACTIVE_TRANSCRIPTIONS || 1);

export function acquireProcessingSlot() {
  if (activeJobs >= MAX_ACTIVE_JOBS) {
    throw new AppError(
      "PROCESSING_BUSY",
      "Сейчас уже обрабатывается другая запись. Попробуйте позже.",
    );
  }

  activeJobs += 1;
  let released = false;

  return function releaseProcessingSlot() {
    if (released) {
      return;
    }

    released = true;
    activeJobs = Math.max(0, activeJobs - 1);
  };
}
