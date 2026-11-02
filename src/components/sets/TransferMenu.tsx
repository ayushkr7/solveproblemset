"use client";

import { useState, type ReactNode, type Ref } from "react";
import { ChevronDownIcon } from "@/components/Icons";
import { Button, buttonVariants } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DRIVE_ENABLED, preloadDrive } from "@/lib/drive/transfer";

export type TransferLocation = "device" | "drive";

interface TransferMenuProps {
  /** The button's content (icon and label). */
  children: ReactNode;
  /** Menu items, in this order. */
  deviceItem: ReactNode;
  driveItem: ReactNode;
  onSelect: (location: TransferLocation) => void;
  /** Warm up libraries on hover/focus. Google's are always preloaded. */
  onPreload?: () => void;
  /** Nothing to transfer: natively disabled. */
  disabled?: boolean;
  /** A transfer is running: stays focusable (so focus isn't lost) but can't be used. */
  busy?: boolean;
  /** This button's own transfer is running. */
  pending?: boolean;
  triggerRef?: Ref<HTMLButtonElement>;
  className?: string;
  size?: "sm";
  variant?: "ghost";
  "aria-label"?: string;
}

/**
 * An import/export button. With Google Drive configured it opens a menu:
 * this device or Google Drive. Without it, it's a plain button for this device.
 */
export function TransferMenu({
  children,
  deviceItem,
  driveItem,
  onSelect,
  onPreload,
  disabled = false,
  busy = false,
  pending = false,
  triggerRef,
  className,
  size,
  variant,
  "aria-label": ariaLabel,
}: TransferMenuProps) {
  const [open, setOpen] = useState(false);

  if (!DRIVE_ENABLED) {
    return (
      <Button
        ref={triggerRef}
        className={className}
        size={size}
        variant={variant}
        onClick={() => onSelect("device")}
        onPointerEnter={onPreload}
        onFocus={onPreload}
        disabled={disabled || busy}
        focusableWhenDisabled={!disabled}
        aria-busy={pending || undefined}
        aria-label={ariaLabel}
      >
        {children}
      </Button>
    );
  }

  const preload = () => {
    onPreload?.();
    preloadDrive();
  };
  return (
    <DropdownMenu open={open && !busy} onOpenChange={(next) => setOpen(next && !busy)}>
      <DropdownMenuTrigger
        ref={triggerRef}
        className={buttonVariants({ variant, size, className })}
        onPointerEnter={preload}
        onFocus={preload}
        disabled={disabled}
        aria-disabled={busy || undefined}
        aria-busy={pending || undefined}
        aria-label={ariaLabel}
      >
        {children}
        <ChevronDownIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => onSelect("device")}>{deviceItem}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSelect("drive")}>{driveItem}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
