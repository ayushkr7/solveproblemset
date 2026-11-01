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
import { AlertIcon, CheckIcon } from "@/components/Icons";
import { cn } from "@/lib/utils";

/** One message at a time: a new toast replaces the current one. */
function ToastProvider({ children }: { children: React.ReactNode }) {
  return <ToastPrimitive.Provider limit={1}>{children}</ToastPrimitive.Provider>;
}

function Toaster() {
  const { toasts } = ToastPrimitive.useToastManager();
  return (
    <ToastPrimitive.Portal>
      <ToastPrimitive.Viewport data-slot="toast-viewport" className="toast-viewport">
        {toasts.map((t) => (
          <ToastPrimitive.Root key={t.id} toast={t} data-slot="toast" className={cn("toast", t.type === "error" && "toast--error")}>
            {t.type === "error" ? <AlertIcon width={16} height={16} /> : <CheckIcon width={16} height={16} />}
            <ToastPrimitive.Title data-slot="toast-title" className="toast__title" />
          </ToastPrimitive.Root>
        ))}
      </ToastPrimitive.Viewport>
    </ToastPrimitive.Portal>
  );
}

/** `toast.success(message)` / `toast.error(message)`. */
function useToast() {
  const manager = ToastPrimitive.useToastManager();
  return useMemo(
    () => ({
      success: (title: string) => manager.add({ title, type: "success", timeout: 3200 }),
      error: (title: string) => manager.add({ title, type: "error", timeout: 6000, priority: "high" }),
    }),
    [manager],
  );
}

export { ToastProvider, Toaster, useToast };
