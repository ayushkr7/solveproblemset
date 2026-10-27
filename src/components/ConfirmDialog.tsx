"use client";

import { useRef, type ReactNode } from "react";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
 * Confirmation modal (role "alertdialog"). Focus starts on Cancel so a stray
 * Enter can't confirm; Esc, the close button and the backdrop all cancel.
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
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent role="alertdialog" eyebrow={eyebrow} initialFocus={cancelRef}>
        <DialogBody>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{children}</DialogDescription>
          </DialogHeader>
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <button ref={cancelRef} type="button" className="btn">
              {cancelLabel}
            </button>
          </DialogClose>
          <button
            type="button"
            className={`btn ${tone === "danger" ? "btn--danger-solid" : "btn--primary"}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
