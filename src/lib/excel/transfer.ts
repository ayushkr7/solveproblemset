/**
 * Browser-facing import/export entry points. Every failure comes back as a
 * user-readable message; technical details never reach the UI.
 */
import type { ProblemSet } from "../types";
import { buildWorkbook, exportFileName } from "./export";
import { importFailure, parseWorkbook, type ImportResult } from "./import";
import { MAX_FILE_BYTES, XLSX_EXTENSION, XLSX_MIME } from "./schema";
import { readXlsx, writeXlsx } from "./xlsx";

export type { ImportResult, ImportedSet } from "./import";
export { preloadXlsx } from "./xlsx";

/** For the file picker's `accept`. */
export const XLSX_ACCEPT = `${XLSX_EXTENSION},${XLSX_MIME}`;

type FileKind = "zip" | "legacy" | "unknown";

/** .xlsx is a zip container; .xls and encrypted workbooks are OLE compound files. */
function sniff(bytes: Uint8Array): FileKind {
  const starts = (sig: number[]) => sig.every((b, i) => bytes[i] === b);
  if (starts([0x50, 0x4b, 0x03, 0x04])) return "zip";
  if (starts([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return "legacy";
  return "unknown";
}

/** Read, parse and validate an uploaded workbook. Never throws; nothing is saved. */
export async function readWorkbookFile(file: File, now: number = Date.now()): Promise<ImportResult> {
  if (!file.name.toLowerCase().endsWith(XLSX_EXTENSION)) {
    const ext = /\.[^.]+$/.exec(file.name)?.[0];
    return importFailure(
      `${ext ? `${ext} files aren't supported` : "This file type isn't supported"}. ` +
        `Choose an Excel workbook (${XLSX_EXTENSION}). In Excel, use File › Save As › Excel Workbook.`,
    );
  }
  if (file.size === 0) return importFailure("The file is empty.");
  if (file.size > MAX_FILE_BYTES) {
    return importFailure(`The file is ${(file.size / 1024 / 1024).toFixed(1)} MB; the limit is ${MAX_FILE_BYTES / 1024 / 1024} MB.`);
  }

  let data: ArrayBuffer;
  try {
    data = await file.arrayBuffer();
  } catch {
    return importFailure("The file couldn't be read. Check that it's still available and try again.");
  }

  const kind = sniff(new Uint8Array(data, 0, Math.min(8, data.byteLength)));
  if (kind === "legacy") {
    return importFailure(
      "This looks like an older .xls workbook or a password-protected file. " +
        "Remove any password, then save it as an Excel Workbook (.xlsx) and try again.",
    );
  }
  if (kind !== "zip") {
    return importFailure("This file isn't a valid Excel workbook, even though its name ends in .xlsx.");
  }

  try {
    return parseWorkbook(await readXlsx(data), now);
  } catch {
    return importFailure("The workbook couldn't be opened — it may be damaged. Open it in Excel, save it again and retry.");
  }
}

/**
 * Build one workbook holding `sets` and trigger a browser download.
 * `all` names the file as a full backup. Returns the file name.
 */
export async function downloadProblemSets(
  sets: readonly ProblemSet[],
  { all = false, now = Date.now() }: { all?: boolean; now?: number } = {},
): Promise<string> {
  const bytes = await writeXlsx(buildWorkbook(sets, now));
  const fileName = exportFileName(sets, now, all);
  const url = URL.createObjectURL(new Blob([bytes], { type: XLSX_MIME }));
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.rel = "noopener";
    document.body.append(a);
    a.click();
    a.remove();
  } finally {
    // Revoking synchronously can cancel the download in some browsers.
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
  return fileName;
}
