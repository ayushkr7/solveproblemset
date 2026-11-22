/**
 * Google Drive import/export, built on the same workbook format and validation
 * as local files. Every failure is a DriveError with a user-readable message.
 */
import {
  buildProblemSetsFile,
  readCustomSheetData,
  readWorkbookData,
  workbookSizeError,
  type CustomSheetResult,
  type ImportResult,
} from "../excel/transfer";
import type { ProblemSet } from "../types";
import { DriveError, downloadWorkbook, uploadWorkbook, type DriveFile } from "./files";
import { forgetAccessToken, getAccessToken, pickWorkbook, type PickedFile } from "./google";

export { DRIVE_ENABLED } from "./config";
export { DRIVE_FOLDER_NAME, DriveError, type DriveFile } from "./files";
export { preloadDrive, type PickedFile } from "./google";

/** A rejected token is forgotten, so the next attempt signs in again. */
async function withToken<T>(run: (token: string) => Promise<T>): Promise<T> {
  const token = await getAccessToken();
  try {
    return await run(token);
  } catch (err) {
    if (err instanceof DriveError && err.kind === "auth") forgetAccessToken();
    throw err;
  }
}

/** Save `sets` as one .xlsx in the export folder. Call from a click: it may open the sign-in popup. */
export async function saveProblemSetsToDrive(
  sets: readonly ProblemSet[],
  options: { all?: boolean; now?: number } = {},
): Promise<DriveFile> {
  // Ask for the token first, while the click still allows a popup; build the file meanwhile.
  const [token, file] = await Promise.all([getAccessToken(), buildProblemSetsFile(sets, options)]);
  try {
    return await uploadWorkbook(token, file);
  } catch (err) {
    if (err instanceof DriveError && err.kind === "auth") forgetAccessToken();
    throw err;
  }
}

/** Sign in if needed and let the person pick a workbook. `null` when they cancel. Call from a click. */
export async function pickDriveWorkbook(): Promise<PickedFile | null> {
  return withToken(pickWorkbook);
}

/** Download a picked workbook and hand it to `read`, skipping files that would be rejected anyway. */
async function readPicked<R>(
  file: PickedFile,
  read: (data: ArrayBuffer) => Promise<R>,
): Promise<R | NonNullable<ReturnType<typeof workbookSizeError>>> {
  const sizeError = file.sizeBytes === null ? null : workbookSizeError(file.sizeBytes);
  if (sizeError) return sizeError;
  return read(await withToken((token) => downloadWorkbook(token, file)));
}

/** Download, parse and validate a picked workbook of problem sets. Nothing is saved. Rejects only for Drive failures. */
export function readDriveWorkbook(file: PickedFile, now: number = Date.now()): Promise<ImportResult> {
  return readPicked(file, (data) => readWorkbookData(data, now));
}

/** Download, parse and validate a picked custom problem sheet. Nothing is saved. Rejects only for Drive failures. */
export function readDriveCustomSheet(file: PickedFile): Promise<CustomSheetResult> {
  return readPicked(file, readCustomSheetData);
}
