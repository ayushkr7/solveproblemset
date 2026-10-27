"use client";

import { useEffect, useRef } from "react";
import { CheckIcon, MinusIcon } from "./Icons";

interface CheckboxProps {
  checked: boolean;
  /** Shown as a dash; announced as "mixed". */
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  /** Show the label next to the box; otherwise it is for screen readers only. */
  showLabel?: boolean;
  disabled?: boolean;
}

/** Native checkbox with a custom 24px box and a 44px hit area. */
export function Checkbox({ checked, indeterminate = false, onChange, label, showLabel = false, disabled }: CheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <label className="checkbox" data-disabled={disabled || undefined}>
      <input
        ref={ref}
        type="checkbox"
        className="checkbox__input"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="checkbox__box" aria-hidden="true">
        <CheckIcon className="checkbox__tick" />
        <MinusIcon className="checkbox__dash" />
      </span>
      <span className={showLabel ? "checkbox__label" : "visually-hidden"}>{label}</span>
    </label>
  );
}
