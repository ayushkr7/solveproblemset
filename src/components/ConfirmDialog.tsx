"use client";

import { useRef, type ReactNode, type RefObject } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogBody,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmDialogProps {
  open: boolean;
  /** Small mono label above the title, e.g. "Confirm restart". */
  eyebrow: string;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  /** Takes focus on close, when confirming removes the button that opened this. */
  returnFocus?: RefObject<HTMLElement | null>;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation modal (Base UI AlertDialog, role "alertdialog"). Focus starts on
 * Cancel so a stray Enter can't confirm; Esc, the close button and Cancel all
 * cancel. An outside click doesn't, so the choice is always deliberate.
 */
export function ConfirmDialog({
  open,
  eyebrow,
  title,
  children,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "danger",
  returnFocus,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <AlertDialogContent eyebrow={eyebrow} initialFocus={cancelRef} returnFocus={returnFocus}>
        <AlertDialogBody>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{children}</AlertDialogDescription>
          </AlertDialogHeader>
        </AlertDialogBody>
        <AlertDialogFooter>
          <AlertDialogCancel ref={cancelRef}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction variant={tone === "danger" ? "danger-solid" : "primary"} onClick={onConfirm}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
