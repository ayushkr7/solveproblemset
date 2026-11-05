"use client";

/**
 * shadcn/ui-style toasts on Base UI. Wrap the page in <ToastProvider>, render
 * one <Toaster />, and call `useToast()` to show a message.
 *
 * Base UI renders the toasts in a "Notifications" landmark (F6 jumps to it)
 * that is a polite live region; errors are high priority and announced as
 * alerts. Timers pause while a toast is hovered or focused, or the window is
 * in the background.
 */
import { Toast as ToastPrimitive } from "@base-ui/react/toast";
import { useMemo } from "react";
import { AlertIcon, CheckIcon, ExternalIcon } from "@/components/Icons";
import { cn } from "@/lib/utils";

/** An optional link after the message, opened in a new tab. */
interface ToastData {
  link?: { href: string; label: string };
}

/** One message at a time: a new toast replaces the current one. */
function ToastProvider({ children }: { children: React.ReactNode }) {
  return <ToastPrimitive.Provider limit={1}>{children}</ToastPrimitive.Provider>;
}

function Toaster() {
  const { toasts } = ToastPrimitive.useToastManager<ToastData>();
  return (
    <ToastPrimitive.Portal>
      <ToastPrimitive.Viewport data-slot="toast-viewport" className="toast-viewport">
        {toasts.map((t) => (
          <ToastPrimitive.Root
            key={t.id}
            toast={t}
            data-slot="toast"
            className={cn("toast", t.type === "error" && "toast--error")}
          >
            {t.type === "error" ? <AlertIcon width={16} height={16} /> : <CheckIcon width={16} height={16} />}
            <ToastPrimitive.Title data-slot="toast-title" className="toast__title" />
            {t.data?.link && (
              <a className="toast__link" href={t.data.link.href} target="_blank" rel="noopener noreferrer">
                {t.data.link.label} <ExternalIcon width={14} height={14} />
                <span className="visually-hidden"> (opens in a new tab)</span>
              </a>
            )}
          </ToastPrimitive.Root>
        ))}
      </ToastPrimitive.Viewport>
    </ToastPrimitive.Portal>
  );
}

/** `toast.success(message, link?)` / `toast.error(message)`. A toast with a link stays up longer, so there's time to use it. */
function useToast() {
  const manager = ToastPrimitive.useToastManager<ToastData>();
  return useMemo(
    () => ({
      success: (title: string, link?: ToastData["link"]) =>
        manager.add({ title, type: "success", timeout: link ? 8000 : 3200, data: link ? { link } : undefined }),
      error: (title: string) => manager.add({ title, type: "error", timeout: 6000, priority: "high" }),
    }),
    [manager],
  );
}

export { ToastProvider, Toaster, useToast };
