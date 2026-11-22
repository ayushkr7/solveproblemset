"use client";

import { useRef, useState, type ChangeEvent, type RefObject } from "react";
import type { TransferLocation } from "@/components/sets/TransferMenu";
import { DriveError, pickDriveWorkbook, type PickedFile } from "@/lib/drive/transfer";
import { XLSX_ACCEPT, preloadXlsx } from "@/lib/excel/transfer";

interface WorkbookPickerOptions<R> {
  readFile: (file: File) => Promise<R>;
  readDrive: (file: PickedFile) => Promise<R>;
  onResult: (result: R, fileName: string, source: TransferLocation) => void;
  /** A Google Drive failure. Closing the sign-in window isn't one. */
  onError: (message: string) => void;
  /** Takes focus back if Google Picker leaves it on <body> when it closes. */
  triggerRef: RefObject<HTMLElement | null>;
}

/**
 * Choosing a workbook from this device or Google Drive, one at a time. Render
 * `<input {...inputProps} />` and call `choose` straight from a click, so the
 * file dialog or Google's sign-in popup isn't blocked.
 */
export function useWorkbookPicker<R>({ readFile, readDrive, onResult, onError, triggerRef }: WorkbookPickerOptions<R>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = useRef(false);
  const [reading, setReading] = useState(false);

  async function handleFile(file: File) {
    if (busy.current) return;
    busy.current = true;
    setReading(true);
    try {
      onResult(await readFile(file), file.name, "device");
    } finally {
      busy.current = false;
      setReading(false);
    }
  }

  /** Sign in (popup) → Google Picker → download → validate. */
  async function handleDrive() {
    busy.current = true;
    preloadXlsx();
    try {
      const picked = await pickDriveWorkbook();
      if (document.activeElement === document.body) triggerRef.current?.focus();
      if (!picked) return;
      setReading(true);
      onResult(await readDrive(picked), picked.name, "drive");
    } catch (err) {
      if (!(err instanceof DriveError)) onError("The workbook couldn’t be read from Google Drive. Try again.");
      else if (err.kind !== "cancelled") onError(err.message);
    } finally {
      busy.current = false;
      setReading(false);
    }
  }

  const choose = (source: TransferLocation = "device") => {
    if (busy.current) return;
    if (source === "drive") void handleDrive();
    else inputRef.current?.click();
  };

  const inputProps = {
    ref: inputRef,
    type: "file",
    accept: XLSX_ACCEPT,
    hidden: true,
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = ""; // so choosing the same file again still fires
      if (file) void handleFile(file);
    },
  };

  return { reading, choose, inputProps };
}
