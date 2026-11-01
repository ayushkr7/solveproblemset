"use client";

/**
 * shadcn/ui Field and Fieldset on Base UI. Field wires its label, control
 * (an <Input> or other Base UI control inside it), description and error
 * together: ids, `for`, `aria-describedby` and `aria-invalid` are set for you.
 * Styled by the `.field*` classes in globals.css.
 */
import { Field as FieldPrimitive } from "@base-ui/react/field";
import { Fieldset as FieldsetPrimitive } from "@base-ui/react/fieldset";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type WithClass<T> = Omit<T, "className"> & { className?: string };

function Field({ className, ...props }: WithClass<ComponentProps<typeof FieldPrimitive.Root>>) {
  return <FieldPrimitive.Root data-slot="field" className={cn("field", className)} {...props} />;
}

function FieldLabel({ className, ...props }: WithClass<ComponentProps<typeof FieldPrimitive.Label>>) {
  return <FieldPrimitive.Label data-slot="field-label" className={cn("field__label", className)} {...props} />;
}

function FieldDescription({ className, ...props }: WithClass<ComponentProps<typeof FieldPrimitive.Description>>) {
  return <FieldPrimitive.Description data-slot="field-description" className={cn("field__hint", className)} {...props} />;
}

/**
 * Shown while `message` is set (the form's own validation decides), announced
 * as an alert. Rendered as a <p> with the ✕ marker used across the app.
 */
function FieldError({ message, className, ...props }: WithClass<Omit<ComponentProps<typeof FieldPrimitive.Error>, "children" | "match">> & { message?: ReactNode }) {
  return (
    <FieldPrimitive.Error
      data-slot="field-error"
      match={!!message}
      render={<p role="alert" />}
      className={cn("field__error", className)}
      {...props}
    >
      <span aria-hidden="true">✕</span> {message}
    </FieldPrimitive.Error>
  );
}

function Fieldset({ className, ...props }: WithClass<ComponentProps<typeof FieldsetPrimitive.Root>>) {
  return <FieldsetPrimitive.Root data-slot="fieldset" className={className} {...props} />;
}

function FieldsetLegend({ className, ...props }: WithClass<ComponentProps<typeof FieldsetPrimitive.Legend>>) {
  return <FieldsetPrimitive.Legend data-slot="fieldset-legend" className={className} {...props} />;
}

export { Field, FieldDescription, FieldError, FieldLabel, Fieldset, FieldsetLegend };
