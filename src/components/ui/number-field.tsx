"use client";

/**
 * NumberField on Base UI (shadcn-style parts): a text input that only accepts
 * numbers, with − / + buttons that step and clamp to min/max. Arrow keys,
 * Page Up/Down and Home/End step too. Pass `allowOutOfRange` to let typed
 * values through so the form's own validation can explain the limit.
 */
import { NumberField as NumberFieldPrimitive } from "@base-ui/react/number-field";
import type { ComponentProps } from "react";

type WithClass<T> = Omit<T, "className"> & { className?: string };

function NumberField(props: WithClass<ComponentProps<typeof NumberFieldPrimitive.Root>>) {
  return <NumberFieldPrimitive.Root data-slot="number-field" {...props} />;
}

function NumberFieldGroup(props: WithClass<ComponentProps<typeof NumberFieldPrimitive.Group>>) {
  return <NumberFieldPrimitive.Group data-slot="number-field-group" {...props} />;
}

function NumberFieldInput(props: WithClass<ComponentProps<typeof NumberFieldPrimitive.Input>>) {
  return <NumberFieldPrimitive.Input data-slot="number-field-input" {...props} />;
}

function NumberFieldDecrement(props: WithClass<ComponentProps<typeof NumberFieldPrimitive.Decrement>>) {
  return <NumberFieldPrimitive.Decrement data-slot="number-field-decrement" {...props} />;
}

function NumberFieldIncrement(props: WithClass<ComponentProps<typeof NumberFieldPrimitive.Increment>>) {
  return <NumberFieldPrimitive.Increment data-slot="number-field-increment" {...props} />;
}

export { NumberField, NumberFieldDecrement, NumberFieldGroup, NumberFieldIncrement, NumberFieldInput };
