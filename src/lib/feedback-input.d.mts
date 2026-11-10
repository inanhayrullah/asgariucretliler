export type FeedbackSubmission = {
  type: "complaint" | "suggestion";
  message: string;
};

export function isValidFeedback(value: unknown): value is FeedbackSubmission;
export const MAX_FEEDBACK_SCREENSHOT_BYTES: number;
export function isValidFeedbackScreenshot(value: unknown): value is Blob;
export function hasValidFeedbackScreenshotSignature(file: Blob): Promise<boolean>;
