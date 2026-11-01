"use client";

/**
 * shadcn/ui RadioGroup on Base UI. The group is role="radiogroup" with roving
 * focus (arrow keys move and select); each item is a focusable role="radio"
 * span with a hidden native input, labelled by an enclosing <label>.
 */
import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";
import type { ComponentProps } from "react";

type WithClass<T> = Omit<T, "className"> & { className?: string };

function RadioGroup(props: WithClass<ComponentProps<typeof RadioGroupPrimitive>>) {
  return <RadioGroupPrimitive data-slot="radio-group" {...props} />;
}

/** The radio itself; style its checked state with `[data-checked]`. */
function RadioGroupItem({ children, ...props }: WithClass<ComponentProps<typeof RadioPrimitive.Root>>) {
  return (
    <RadioPrimitive.Root data-slot="radio-group-item" {...props}>
      {children}
    </RadioPrimitive.Root>
  );
}

export { RadioGroup, RadioGroupItem };
