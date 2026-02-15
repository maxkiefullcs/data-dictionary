"use client";

import { useEffect } from "react";

const SUCCESS_AUTO_DISMISS_MS = 4000;
const ERROR_AUTO_DISMISS_MS = 5000;

export type ExportNotificationType =
  | { type: "success" }
  | { type: "error"; message: string }
  | null;

type Props = {
  notification: ExportNotificationType;
  onDismiss: () => void;
};

export function ExportNotification({ notification, onDismiss }: Props) {
  useEffect(() => {
    if (!notification) return;
    const ms =
      notification.type === "success"
        ? SUCCESS_AUTO_DISMISS_MS
        : ERROR_AUTO_DISMISS_MS;
    const id = window.setTimeout(onDismiss, ms);
    return () => window.clearTimeout(id);
  }, [notification, onDismiss]);

  if (!notification) return null;

  if (notification.type === "success") {
    return (
      <div
        role="alert"
        aria-live="polite"
        className="fixed right-4 top-4 z-50 flex max-w-sm items-start gap-3 rounded-theme-lg border border-success/40 bg-navy-900/95 px-4 py-3 shadow-theme-md backdrop-blur-sm ring-1 ring-success/20"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success/90 text-white">
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="font-semibold text-white">บันทึกสำเร็จ</p>
          <p className="mt-0.5 text-sm text-slate-300">
            Export completed successfully.
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded p-1 text-slate-400 hover:bg-navy-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
          aria-label="Dismiss"
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed right-4 top-4 z-50 flex max-w-sm items-start gap-3 rounded-theme-lg border border-error/40 bg-navy-900/95 px-4 py-3 shadow-theme-md backdrop-blur-sm ring-1 ring-error/20"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-error/90 text-white">
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="font-semibold text-white">Export failed</p>
        <p className="mt-0.5 text-sm text-error-soft">{notification.message}</p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 rounded p-1 text-slate-400 hover:bg-navy-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
        aria-label="Dismiss"
      >
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}
