"use client";

/**
 * shadcn/ui Progress on Base UI. Base UI renders role="progressbar" with
 * aria-valuenow/min/max and a formatted aria-valuetext ("75%"), and sizes the
 * indicator; styled by `.progress` (globals.css). Give it an `aria-label`.
 */
import { Progress as ProgressPrimitive } from "@base-ui/react/progress";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function Progress({ className, ...props }: Omit<ComponentProps<typeof ProgressPrimitive.Root>, "className"> & { className?: string }) {
  return (
    <ProgressPrimitive.Root data-slot="progress" className={cn("progress", className)} {...props}>
      <ProgressPrimitive.Track data-slot="progress-track" className="progress__track">
        <ProgressPrimitive.Indicator data-slot="progress-indicator" className="progress__fill" />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  );
}

export { Progress };
