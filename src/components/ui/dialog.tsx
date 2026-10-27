"use client";

/**
 * shadcn/ui Dialog, built on Radix UI. Same parts and API as shadcn's
 * `components/ui/dialog`, styled with this project's design tokens (globals.css)
 * instead of Tailwind classes.
 *
 * Radix owns all modal behaviour: focus trap, Escape, outside click, scroll lock
 * (with scrollbar-gap compensation), `pointer-events` on <body>, and hiding the
 * rest of the page from assistive technology. Nothing here touches global
 * styles. The only addition is focus *return* for dialogs opened from state
 * rather than a <DialogTrigger> (Radix returns focus only to a trigger); it uses
 * Radix's own onOpenAutoFocus / onCloseAutoFocus hooks.
 */
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useRef, type ComponentProps, type ReactNode, type RefObject } from "react";
import { CloseIcon } from "@/components/Icons";
import { cn } from "@/lib/utils";

function Dialog(props: ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger(props: ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal(props: ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose(props: ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({ className, ...props }: ComponentProps<typeof DialogPrimitive.Overlay>) {
  return <DialogPrimitive.Overlay data-slot="dialog-overlay" className={cn("dialog-overlay", className)} {...props} />;
}

/** A usable focus target: still in the document, enabled and not inside a closed dialog. */
function focusable(el: HTMLElement | null | undefined): el is HTMLElement {
  return !!el && el.isConnected && el !== document.body && !el.matches(":disabled") && !el.closest("[inert]");
}

const OPEN_DIALOG = '[data-slot="dialog-content"][data-state="open"]';

interface DialogContentProps extends ComponentProps<typeof DialogPrimitive.Content> {
  /** Small mono label in the header bar, e.g. "Confirm restart". */
  eyebrow?: ReactNode;
  showCloseButton?: boolean;
  size?: "default" | "wide";
  /** Focused on open instead of the first focusable element (the close button). */
  initialFocus?: RefObject<HTMLElement | null>;
  /**
   * Focused on close. Otherwise focus returns to whatever had it when the dialog
   * opened (or the DialogTrigger), falling back to the <main> landmark.
   */
  returnFocus?: RefObject<HTMLElement | null>;
}

function DialogContent({
  className,
  children,
  eyebrow,
  showCloseButton = true,
  size = "default",
  initialFocus,
  returnFocus,
  onOpenAutoFocus,
  onCloseAutoFocus,
  ...props
}: DialogContentProps) {
  const openedFrom = useRef<HTMLElement | null>(null);

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn("dialog", size === "wide" && "dialog--wide", className)}
        onOpenAutoFocus={(event) => {
          // Still the element that opened the dialog: Radix hasn't moved focus yet.
          const active = document.activeElement;
          openedFrom.current = active instanceof HTMLElement && active !== document.body ? active : null;
          onOpenAutoFocus?.(event);
          if (!event.defaultPrevented && focusable(initialFocus?.current)) {
            event.preventDefault();
            initialFocus.current.focus();
          }
        }}
        onCloseAutoFocus={(event) => {
          onCloseAutoFocus?.(event);
          if (event.defaultPrevented) return;
          // Another dialog opened as this one closed (e.g. preview → results): it owns focus now.
          if (document.querySelector(OPEN_DIALOG)) {
            event.preventDefault();
            return;
          }
          // preventScroll: the scroll lock kept the page where it was; don't jump.
          const target = [returnFocus?.current, openedFrom.current].find(focusable);
          if (target) {
            event.preventDefault();
            target.focus({ preventScroll: true });
            return;
          }
          // Let Radix focus the DialogTrigger, if there is one; otherwise use <main>.
          queueMicrotask(() => {
            if (document.activeElement === document.body && !document.querySelector(OPEN_DIALOG)) {
              document.getElementById("main")?.focus({ preventScroll: true });
            }
          });
        }}
        {...props}
      >
        {(eyebrow || showCloseButton) && (
          <div data-slot="dialog-bar" className="dialog__head">
            <span className="label">{eyebrow}</span>
            {showCloseButton && (
              <DialogPrimitive.Close className="btn btn--ghost btn--icon" aria-label="Close">
                <CloseIcon />
              </DialogPrimitive.Close>
            )}
          </div>
        )}
        {children}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

/** Scrollable middle section holding the header and any content (project addition). */
function DialogBody({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="dialog-body" className={cn("dialog__body", className)} {...props} />;
}

function DialogHeader({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="dialog-header" className={cn("dialog__header", className)} {...props} />;
}

function DialogFooter({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="dialog-footer" className={cn("dialog__foot", className)} {...props} />;
}

function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title data-slot="dialog-title" className={cn("dialog__title", className)} {...props} />;
}

/** Rendered as a <div> so it can hold paragraphs and lists. */
function DialogDescription({ className, children, ...props }: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description asChild data-slot="dialog-description" {...props}>
      <div className={cn("dialog__text", className)}>{children}</div>
    </DialogPrimitive.Description>
  );
}

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
