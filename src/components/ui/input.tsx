"use client";

/**
 * shadcn/ui Input on Base UI. A native <input> that joins a surrounding Field
 * (label, description and error wiring); pass the `.input` class for the
 * standard look.
 */
import { Input as InputPrimitive } from "@base-ui/react/input";
import type { ComponentProps } from "react";

function Input({ className, ...props }: Omit<ComponentProps<typeof InputPrimitive>, "className"> & { className?: string }) {
  return <InputPrimitive data-slot="input" className={className} {...props} />;
}

export { Input };
