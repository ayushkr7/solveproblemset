"use client";

/**
 * shadcn/ui Checkbox on Base UI. Renders the focusable box (role="checkbox",
 * with a hidden native input for forms); label it by wrapping both in a
 * <label>, as Base UI recommends for its <span> root. Styled by `.checkbox__box`
 * (globals.css) unless another class is given.
 *
 * Base UI exposes the state as data attributes (data-checked,
 * data-indeterminate, data-disabled) and sets aria-checked="mixed" for
 * indeterminate, so screen readers announce it.
 */
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import type { ComponentProps, ReactNode } from "react";
import { CheckIcon, MinusIcon } from "@/components/Icons";
import { cn } from "@/lib/utils";

function Checkbox({
  className,
  children,
  ...props
}: Omit<ComponentProps<typeof CheckboxPrimitive.Root>, "className"> & { className?: string; children?: ReactNode }) {
  return (
    <CheckboxPrimitive.Root data-slot="checkbox" className={cn(className ?? "checkbox__box")} {...props}>
      {children ?? (
        <>
          <CheckIcon className="checkbox__tick" aria-hidden="true" />
          <MinusIcon className="checkbox__dash" aria-hidden="true" />
        </>
      )}
    </CheckboxPrimitive.Root>
  );
}

/** The app's standard checkbox: a 24px box in a 44px hit area, with a visible or screen-reader-only label. */
function LabeledCheckbox({
  label,
  showLabel = false,
  disabled,
  ...props
}: Omit<ComponentProps<typeof Checkbox>, "children" | "className"> & { label: ReactNode; showLabel?: boolean }) {
  return (
    <label className="checkbox" data-disabled={disabled || undefined}>
      <Checkbox disabled={disabled} {...props} />
      <span className={showLabel ? "checkbox__label" : "visually-hidden"}>{label}</span>
    </label>
  );
}

export { Checkbox, LabeledCheckbox };
