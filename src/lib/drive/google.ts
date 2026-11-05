/**
 * Google's browser libraries: Identity Services for the sign-in popup and
 * Picker for choosing a file. Both are loaded on first use. Access tokens are
 * kept in memory only, so a reload signs the person out of Drive.
 *
 * Scope: drive.file, which reaches only files this app creates or the person
 * picks in Picker; the rest of their Drive stays out of reach.
 */
import { XLSX_MIME } from "../excel/schema";
import { DRIVE_CONFIG } from "./config";
import { DriveError, GOOGLE_SHEETS_MIME } from "./files";

const GIS_SRC = "https://accounts.google.com/gsi/client";
const GAPI_SRC = "https://apis.google.com/js/api.js";
export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

// Just enough of Google's APIs for this module.
interface TokenResponse {
  access_token?: string;
  expires_in?: number | string;
  error?: string;
}
interface TokenClient {
  requestAccessToken(overrides?: { prompt?: string }): void;
}
interface OAuth2 {
  initTokenClient(config: {
    client_id: string;
    scope: string;
    callback: (res: TokenResponse) => void;
    error_callback?: (err: { type: string }) => void;
  }): TokenClient;
  hasGrantedAllScopes(res: TokenResponse, ...scopes: string[]): boolean;
}
interface PickerDoc {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes?: number | string;
}
interface PickerData {
  action: string;
  docs?: PickerDoc[];
}
interface DocsView {
  setMimeTypes(types: string): DocsView;
  setIncludeFolders(on: boolean): DocsView;
  setMode(mode: string): DocsView;
}
interface Picker {
  setVisible(visible: boolean): void;
  dispose(): void;
}
interface PickerBuilder {
  addView(view: DocsView): PickerBuilder;
  setOAuthToken(token: string): PickerBuilder;
  setDeveloperKey(key: string): PickerBuilder;
  setAppId(id: string): PickerBuilder;
  setTitle(title: string): PickerBuilder;
  setCallback(cb: (data: PickerData) => void): PickerBuilder;
  build(): Picker;
}
interface PickerNamespace {
  DocsView: new (viewId?: string) => DocsView;
  PickerBuilder: new () => PickerBuilder;
  ViewId: { DOCS: string };
  DocsViewMode: { LIST: string };
}
declare global {
  interface Window {
    google?: { accounts?: { oauth2?: OAuth2 }; picker?: PickerNamespace };
    gapi?: {
      load(
        api: string,
        options: { callback: () => void; onerror: () => void; timeout: number; ontimeout: () => void },
      ): void;
    };
  }
}

const LOAD_FAILED =
  "Google Drive couldn't load. Check your connection, or allow accounts.google.com and apis.google.com if a blocker is on, then try again.";

const scripts = new Map<string, Promise<void>>();

function loadScript(src: string): Promise<void> {
  let loading = scripts.get(src);
  if (!loading) {
    loading = new Promise<void>((resolve, reject) => {
      const el = document.createElement("script");
      el.src = src;
      el.async = true;
      el.onload = () => resolve();
      el.onerror = () => {
        el.remove();
        reject(new DriveError(LOAD_FAILED));
      };
      document.head.append(el);
    });
    loading.catch(() => scripts.delete(src)); // let a retry fetch it again
    scripts.set(src, loading);
  }
  return loading;
}

let pickerLoad: Promise<PickerNamespace> | null = null;

function loadPicker(): Promise<PickerNamespace> {
  pickerLoad ??= loadScript(GAPI_SRC).then(
    () =>
      new Promise<PickerNamespace>((resolve, reject) => {
        const fail = () => reject(new DriveError(LOAD_FAILED));
        if (!window.gapi) return fail();
        window.gapi.load("picker", {
          callback: () => (window.google?.picker ? resolve(window.google.picker) : fail()),
          onerror: fail,
          timeout: 15_000,
          ontimeout: fail,
        });
      }),
  );
  pickerLoad.catch(() => (pickerLoad = null));
  return pickerLoad;
}

/** Start fetching Google's libraries early (on hover or focus), so the sign-in popup opens straight from the click. */
export function preloadDrive(): void {
  void loadScript(GIS_SRC).catch(() => {});
  void loadPicker().catch(() => {});
}

let token: { value: string; expiresAt: number } | null = null;

/** Drop the token, e.g. after Drive rejected it. */
export function forgetAccessToken(): void {
  token = null;
}

/**
 * A drive.file access token, from memory or a Google sign-in popup. Call it
 * straight from a click so the popup isn't blocked. Rejects with a DriveError;
 * kind `cancelled` when the person closed the popup.
 */
export async function getAccessToken(): Promise<string> {
  if (token && token.expiresAt > Date.now() + 60_000) return token.value;
  await loadScript(GIS_SRC);
  const oauth2 = window.google?.accounts?.oauth2;
  if (!oauth2) throw new DriveError(LOAD_FAILED);
  // After the first consent, later sign-ins skip the account chooser.
  const signedInBefore = token !== null;

  return new Promise<string>((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: DRIVE_CONFIG.clientId,
      scope: DRIVE_SCOPE,
      callback: (res) => {
        if (res.error === "access_denied") {
          reject(new DriveError("Google Drive access wasn't allowed, so nothing was transferred."));
        } else if (res.error || !res.access_token) {
          reject(new DriveError("Google sign-in failed. Try again."));
        } else if (!oauth2.hasGrantedAllScopes(res, DRIVE_SCOPE)) {
          reject(
            new DriveError(
              "Google Drive access wasn't allowed. Try again and tick the box that lets this app use the Drive files it creates or opens.",
            ),
          );
        } else {
          token = { value: res.access_token, expiresAt: Date.now() + Number(res.expires_in ?? 3600) * 1000 };
          resolve(res.access_token);
        }
      },
      error_callback: (err) => {
        reject(
          err.type === "popup_failed_to_open"
            ? new DriveError("The Google sign-in window was blocked. Allow pop-ups for this site and try again.")
            : new DriveError("Google sign-in was closed.", "cancelled"),
        );
      },
    });
    client.requestAccessToken(signedInBefore ? { prompt: "" } : {});
  });
}

export interface PickedFile {
  id: string;
  name: string;
  mimeType: string;
  /** Unknown for Google Sheets. */
  sizeBytes: number | null;
}

/** Let the person choose an .xlsx or a Google Sheet in their Drive. `null` when they cancel. */
export async function pickWorkbook(accessToken: string): Promise<PickedFile | null> {
  const picker = await loadPicker();
  return new Promise<PickedFile | null>((resolve) => {
    const view = new picker.DocsView(picker.ViewId.DOCS)
      .setMimeTypes(`${XLSX_MIME},${GOOGLE_SHEETS_MIME}`)
      .setIncludeFolders(true)
      .setMode(picker.DocsViewMode.LIST);
    const dialog = new picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(accessToken)
      .setDeveloperKey(DRIVE_CONFIG.apiKey)
      .setAppId(DRIVE_CONFIG.appId)
      .setTitle("Choose a workbook to import")
      .setCallback((data) => {
        if (data.action === "picked") {
          const doc = data.docs?.[0];
          const size = Number(doc?.sizeBytes);
          resolve(
            doc ? { id: doc.id, name: doc.name, mimeType: doc.mimeType, sizeBytes: size > 0 ? size : null } : null,
          );
        } else if (data.action === "cancel") {
          resolve(null);
        } else {
          return; // "loaded" and other progress events
        }
        dialog.dispose();
      })
      .build();
    dialog.setVisible(true);
  });
}
