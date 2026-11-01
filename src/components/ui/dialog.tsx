"use client";

/**
 * shadcn/ui Dialog on Base UI. Same parts and API as shadcn's
 * `components/ui/dialog`, styled with this project's design tokens (globals.css)
 * instead of Tailwind classes.
 *
 * Base UI owns all modal behaviour: focus trap, Escape, outside click, scroll
 * lock, and hiding the rest of the page from assistive technology
 * (aria-hidden). The additions here are focus rules for dialogs opened from
 * state rather than a <DialogTrigger> (see `usePopupFocus`).
 */
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { useRef, useState, type ComponentProps, type ReactNode, type RefObject } from "react";
import { CloseIcon } from "@/components/Icons";
import { Button } from "@/components/ui/button";
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

function DialogOverlay({ className, ...props }: ComponentProps<typeof DialogPrimitive.Backdrop> & { className?: string }) {
  return <DialogPrimitive.Backdrop data-slot="dialog-overlay" className={cn("dialog-overlay", className)} {...props} />;
}

// ---------------------------------------------------------------------------
// Focus rules shared with alert-dialog.tsx

/** A usable focus target: still in the document, enabled and not inside an inert (closed or background) region. */
function focusable(el: Element | null | undefined): el is HTMLElement {
  return el instanceof HTMLElement && el.isConnected && el !== document.body && !el.matches(":disabled") && !el.closest("[inert]");
}

const OPEN_POPUP = '[data-slot$="dialog-content"][data-open]';

/** Records the element that had focus when the popup mounted (Base UI moves focus later, in an effect). */
function OpenerCapture({ into }: { into: RefObject<HTMLElement | null> }) {
  useState(() => {
    const active = typeof document === "undefined" ? null : document.activeElement;
    into.current = active instanceof HTMLElement && active !== document.body ? active : null;
  });
  return null;
}

/**
 * `initialFocus` / `finalFocus` for a popup:
 * - opens on `initialFocus` when it can take focus, else Base UI's default (first tabbable);
 * - closes to `returnFocus`, else the element that opened it; if that is gone (e.g. the
 *   card whose Delete opened a confirmation was deleted) to the <main> landmark;
 * - does nothing when another dialog opened as this one closed (preview → results).
 */
function usePopupFocus({
  initialFocus,
  returnFocus,
}: {
  initialFocus?: RefObject<HTMLElement | null>;
  returnFocus?: RefObject<HTMLElement | null>;
}) {
  const opener = useRef<HTMLElement | null>(null);
  const popup = useRef<HTMLDivElement>(null);
  return {
    popup,
    capture: <OpenerCapture into={opener} />,
    initial: () => (focusable(initialFocus?.current) ? initialFocus.current : true),
    final: () => {
      // Opened without a focused element (e.g. a mouse click in Safari): Base UI's default, the trigger.
      if (!returnFocus && !opener.current) return true;
      // Base UI asks while the dialog starts closing, before React commits what
      // the action changed (a deleted card and its button are still in the
      // document), so the target is chosen a frame later.
      requestAnimationFrame(() => {
        const other = [...document.querySelectorAll(OPEN_POPUP)].some((el) => el !== popup.current);
        if (other) return;
        const target = [returnFocus?.current, opener.current].find(focusable) ?? document.getElementById("main");
        target?.focus({ preventScroll: true });
      });
      return false;
    },
  };
}

// ---------------------------------------------------------------------------

interface DialogContentProps extends Omit<ComponentProps<typeof DialogPrimitive.Popup>, "initialFocus" | "finalFocus" | "className"> {
  className?: string;
  /** Small mono label in the header bar, e.g. "Import preview". */
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
  ...props
}: DialogContentProps) {
  const focus = usePopupFocus({ initialFocus, returnFocus });
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        ref={focus.popup}
        data-slot="dialog-content"
        className={cn("dialog", size === "wide" && "dialog--wide", className)}
        initialFocus={focus.initial}
        finalFocus={focus.final}
        {...props}
      >
        {focus.capture}
        {(eyebrow || showCloseButton) && (
          <div data-slot="dialog-bar" className="dialog__head">
            <span className="label">{eyebrow}</span>
            {showCloseButton && (
              <DialogPrimitive.Close render={<Button variant="ghost" size="icon" aria-label="Close" />}>
                <CloseIcon />
              </DialogPrimitive.Close>
            )}
          </div>
        )}
        {children}
      </DialogPrimitive.Popup>
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

function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title> & { className?: string }) {
  return <DialogPrimitive.Title data-slot="dialog-title" className={cn("dialog__title", className)} {...props} />;
}

/** Rendered as a <div> so it can hold paragraphs and lists. */
function DialogDescription({ className, ...props }: ComponentProps<typeof DialogPrimitive.Description> & { className?: string }) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      render={<div />}
      className={cn("dialog__text", className)}
      {...props}
    />
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
  usePopupFocus,
};
