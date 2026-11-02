/**
 * The Google Drive REST calls (v3), with an access token from google.ts. No
 * browser globals beyond fetch and Blob, so it runs under the unit tests with
 * a stub `fetch`. Every failure is a DriveError with a user-readable message.
 */
import { XLSX_MIME } from "../excel/schema";

const API = "https://www.googleapis.com/drive/v3";
const UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const FOLDER_MIME = "application/vnd.google-apps.folder";
export const GOOGLE_SHEETS_MIME = "application/vnd.google-apps.spreadsheet";

/** Exports go into this folder in My Drive, created on first use. */
export const DRIVE_FOLDER_NAME = "Solve Problemset";

/**
 * - `cancelled`: the person closed the sign-in window; nothing to report.
 * - `auth`: the access token was rejected; signing in again fixes it.
 */
export type DriveErrorKind = "cancelled" | "auth" | "failed";

export class DriveError extends Error {
  constructor(
    message: string,
    readonly kind: DriveErrorKind = "failed",
  ) {
    super(message);
    this.name = "DriveError";
  }
}

export interface DriveFile {
  id: string;
  name: string;
  /** Opens the file in Drive. */
  webViewLink: string | null;
}

type Fetch = typeof fetch;

/** Drive's error reasons → what to tell the person. */
export function driveErrorMessage(status: number, reason: string | undefined): string {
  switch (reason) {
    case "storageQuotaExceeded":
    case "quotaExceeded":
      return "Your Google Drive is full. Free up space and try again.";
    case "rateLimitExceeded":
    case "userRateLimitExceeded":
    case "sharingRateLimitExceeded":
      return "Google Drive is busy right now. Wait a minute and try again.";
    case "exportSizeLimitExceeded":
      return "This Google Sheet is too large to import. Download it as .xlsx and split it into smaller workbooks.";
    case "cannotDownloadAbusiveFile":
      return "Google Drive has blocked downloads of this file.";
  }
  if (status === 401) return "Your Google sign-in has expired. Try again to sign in again.";
  if (status === 403) return "Google Drive denied access to this file. Pick it again, or check that you can still open it in Drive.";
  if (status === 404) return "The file wasn't found in Google Drive. It may have been deleted, or you may no longer have access.";
  if (status === 429) return "Google Drive is busy right now. Wait a minute and try again.";
  if (status >= 500) return "Google Drive is having problems right now. Try again in a few minutes.";
  return "Google Drive couldn't complete the request. Try again.";
}

async function call(fetchImpl: Fetch, token: string, url: string, init: RequestInit = {}): Promise<Response> {
  let res: Response;
  try {
    res = await fetchImpl(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } });
  } catch {
    throw new DriveError("Couldn't reach Google Drive. Check your connection and try again.");
  }
  if (res.ok) return res;
  let reason: string | undefined;
  try {
    const body = (await res.json()) as { error?: { errors?: { reason?: string }[] } };
    reason = body.error?.errors?.[0]?.reason;
  } catch {
    // Not JSON: the status alone decides.
  }
  throw new DriveError(driveErrorMessage(res.status, reason), res.status === 401 ? "auth" : "failed");
}

async function json<T>(res: Response): Promise<T> {
  try {
    return (await res.json()) as T;
  } catch {
    throw new DriveError("Google Drive sent an unexpected response. Try again.");
  }
}

/** Drive query string literal: backslash-escape `\` and `'`. */
function quote(value: string): string {
  return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

/**
 * The export folder's id, creating it if needed. Under the drive.file scope
 * only folders this app created are visible, so a same-named folder of the
 * person's own is never written into.
 */
export async function ensureFolder(token: string, fetchImpl: Fetch = fetch): Promise<string> {
  const q = `mimeType=${quote(FOLDER_MIME)} and name=${quote(DRIVE_FOLDER_NAME)} and 'root' in parents and trashed=false`;
  const params = new URLSearchParams({ q, spaces: "drive", fields: "files(id)", pageSize: "1" });
  const found = await json<{ files?: { id: string }[] }>(await call(fetchImpl, token, `${API}/files?${params}`));
  const existing = found.files?.[0]?.id;
  if (existing) return existing;

  const created = await json<{ id?: string }>(
    await call(fetchImpl, token, `${API}/files?fields=id`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify({ name: DRIVE_FOLDER_NAME, mimeType: FOLDER_MIME, parents: ["root"] }),
    }),
  );
  if (!created.id) throw new DriveError("Google Drive sent an unexpected response. Try again.");
  return created.id;
}

/** A multipart/related upload body: JSON metadata, then the file. */
export function multipartBody(metadata: object, bytes: Uint8Array<ArrayBuffer>, mimeType: string, boundary: string): Blob {
  return new Blob(
    [
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
      `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
      bytes,
      `\r\n--${boundary}--\r\n`,
    ],
    { type: `multipart/related; boundary=${boundary}` },
  );
}

/** Upload an .xlsx into the export folder. A file with the same name is kept, never replaced. */
export async function uploadWorkbook(
  token: string,
  file: { fileName: string; bytes: Uint8Array<ArrayBuffer> },
  fetchImpl: Fetch = fetch,
): Promise<DriveFile> {
  const folderId = await ensureFolder(token, fetchImpl);
  const boundary = `solve-problemset-${crypto.randomUUID()}`;
  const body = multipartBody({ name: file.fileName, mimeType: XLSX_MIME, parents: [folderId] }, file.bytes, XLSX_MIME, boundary);
  const res = await call(fetchImpl, token, `${UPLOAD_API}/files?uploadType=multipart&fields=id,name,webViewLink`, {
    method: "POST",
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
  });
  const out = await json<{ id?: string; name?: string; webViewLink?: string }>(res);
  if (!out.id) throw new DriveError("Google Drive sent an unexpected response. Try again.");
  return { id: out.id, name: out.name ?? file.fileName, webViewLink: out.webViewLink ?? null };
}

/** A workbook's bytes: an .xlsx as stored, or a Google Sheet converted to .xlsx. */
export async function downloadWorkbook(
  token: string,
  file: { id: string; mimeType: string },
  fetchImpl: Fetch = fetch,
): Promise<ArrayBuffer> {
  const id = encodeURIComponent(file.id);
  const url =
    file.mimeType === GOOGLE_SHEETS_MIME
      ? `${API}/files/${id}/export?mimeType=${encodeURIComponent(XLSX_MIME)}`
      : `${API}/files/${id}?alt=media`;
  const res = await call(fetchImpl, token, url);
  try {
    return await res.arrayBuffer();
  } catch {
    throw new DriveError("The download from Google Drive was interrupted. Check your connection and try again.");
  }
}
