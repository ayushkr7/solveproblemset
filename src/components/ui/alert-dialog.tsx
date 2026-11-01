"use client";

/**
 * shadcn/ui AlertDialog on Base UI: a dialog that interrupts to ask for a
 * decision. Base UI gives it role="alertdialog" and, unlike Dialog, an outside
 * click doesn't dismiss it; Escape and the buttons do. Shares the dialog's
 * styles (globals.css) and focus rules (dialog.tsx).
 */
import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog";
import type { ComponentProps, ReactNode, RefObject } from "react";
import { CloseIcon } from "@/components/Icons";
import { Button } from "@/components/ui/button";
import { usePopupFocus } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

function AlertDialog(props: ComponentProps<typeof AlertDialogPrimitive.Root>) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />;
}

interface AlertDialogContentProps
  extends Omit<ComponentProps<typeof AlertDialogPrimitive.Popup>, "initialFocus" | "finalFocus" | "className"> {
  className?: string;
  /** Small mono label in the header bar, e.g. "Confirm restart". */
  eyebrow?: ReactNode;
  /** A close (×) button in the header bar; it cancels like Escape. */
  showCloseButton?: boolean;
  initialFocus?: RefObject<HTMLElement | null>;
  returnFocus?: RefObject<HTMLElement | null>;
}

function AlertDialogContent({
  className,
  children,
  eyebrow,
  showCloseButton = true,
  initialFocus,
  returnFocus,
  ...props
}: AlertDialogContentProps) {
  const focus = usePopupFocus({ initialFocus, returnFocus });
  return (
    <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal">
      <AlertDialogPrimitive.Backdrop data-slot="alert-dialog-overlay" className="dialog-overlay" />
      <AlertDialogPrimitive.Popup
        ref={focus.popup}
        data-slot="alert-dialog-content"
        className={cn("dialog", className)}
        initialFocus={focus.initial}
        finalFocus={focus.final}
        {...props}
      >
        {focus.capture}
        {(eyebrow || showCloseButton) && (
          <div data-slot="alert-dialog-bar" className="dialog__head">
            <span className="label">{eyebrow}</span>
            {showCloseButton && (
              <AlertDialogPrimitive.Close render={<Button variant="ghost" size="icon" aria-label="Close" />}>
                <CloseIcon />
              </AlertDialogPrimitive.Close>
            )}
          </div>
        )}
        {children}
      </AlertDialogPrimitive.Popup>
    </AlertDialogPrimitive.Portal>
  );
}

function AlertDialogBody({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="alert-dialog-body" className={cn("dialog__body", className)} {...props} />;
}

function AlertDialogHeader({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="alert-dialog-header" className={cn("dialog__header", className)} {...props} />;
}

function AlertDialogFooter({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="alert-dialog-footer" className={cn("dialog__foot", className)} {...props} />;
}

function AlertDialogTitle({ className, ...props }: ComponentProps<typeof AlertDialogPrimitive.Title> & { className?: string }) {
  return <AlertDialogPrimitive.Title data-slot="alert-dialog-title" className={cn("dialog__title", className)} {...props} />;
}

/** Rendered as a <div> so it can hold paragraphs. */
function AlertDialogDescription({
  className,
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Description> & { className?: string }) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      render={<div />}
      className={cn("dialog__text", className)}
      {...props}
    />
  );
}

/** Closes the dialog without acting. */
function AlertDialogCancel({ ...props }: ComponentProps<typeof Button>) {
  return <AlertDialogPrimitive.Close data-slot="alert-dialog-cancel" render={<Button {...props} />} />;
}

function AlertDialogAction(props: ComponentProps<typeof Button>) {
  return <Button data-slot="alert-dialog-action" {...props} />;
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogBody,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
};
