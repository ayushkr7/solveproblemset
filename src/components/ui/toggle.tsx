"use client";

/**
 * shadcn/ui Toggle on Base UI: a two-state button with aria-pressed (and
 * data-pressed). Takes the same `variant` / `size` as Button.
 */
import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import type { ComponentProps } from "react";
import { buttonVariants } from "@/components/ui/button";

type ButtonStyle = Parameters<typeof buttonVariants>[0];

function Toggle({
  variant,
  size,
  className,
  ...props
}: Omit<ComponentProps<typeof TogglePrimitive>, "className"> & Omit<NonNullable<ButtonStyle>, "block">) {
  return <TogglePrimitive data-slot="toggle" className={buttonVariants({ variant, size, className })} {...props} />;
}

export { Toggle };
