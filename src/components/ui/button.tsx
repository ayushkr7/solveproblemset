"use client";

/**
 * shadcn/ui Button on Base UI. Same API shape as shadcn's `components/ui/button`
 * (`variant`, `size`, `buttonVariants` for links), styled by the `.btn` classes
 * in globals.css instead of Tailwind.
 *
 * Base UI handles disabled semantics: `focusableWhenDisabled` keeps a busy
 * button in the tab order (aria-disabled) so focus is never dropped.
 */
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "primary" | "ghost" | "danger" | "danger-solid" | "bare";
type Size = "default" | "sm" | "lg" | "icon";

interface VariantProps {
  /** `bare` renders no `.btn` styling, for buttons styled entirely by a CSS module. */
  variant?: Variant;
  size?: Size;
  block?: boolean;
  className?: string;
}

function buttonVariants({ variant = "default", size = "default", block = false, className }: VariantProps = {}): string {
  if (variant === "bare") return className ?? "";
  return cn(
    "btn",
    variant !== "default" && `btn--${variant}`,
    size !== "default" && `btn--${size}`,
    block && "btn--block",
    className,
  );
}

function Button({
  variant,
  size,
  block,
  className,
  type = "button",
  ...props
}: ComponentProps<typeof ButtonPrimitive> & Omit<VariantProps, "className"> & { className?: string }) {
  return (
    <ButtonPrimitive
      data-slot="button"
      type={type}
      className={buttonVariants({ variant, size, block, className })}
      {...props}
    />
  );
}

export { Button, buttonVariants };
