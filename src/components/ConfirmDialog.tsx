"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { CloseIcon } from "./Icons";

interface ConfirmDialogProps {
  open: boolean;
  /** Small mono label above the title, e.g. "Confirm restart". */
  eyebrow: string;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Modal confirmation built on <dialog>: native focus trapping, Esc to cancel,
 * inert background. Focus starts on Cancel so a stray Enter can't confirm.
 */
export function ConfirmDialog({
  open,
  eyebrow,
  title,
  children,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      cancelRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={titleId}
      aria-describedby={descId}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      onClick={(e) => {
        // Click on the backdrop (the dialog element itself) cancels.
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="dialog__head">
        <span className="label">{eyebrow}</span>
        <button type="button" className="btn btn--ghost btn--icon" onClick={onCancel} aria-label="Close">
          <CloseIcon />
        </button>
      </div>
      <div className="dialog__body">
        <h2 id={titleId} className="dialog__title">{title}</h2>
        <div id={descId} className="dialog__text">{children}</div>
      </div>
      <div className="dialog__foot">
        <button ref={cancelRef} type="button" className="btn" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={`btn ${tone === "danger" ? "btn--danger-solid" : "btn--primary"}`}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
