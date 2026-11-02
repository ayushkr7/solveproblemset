/**
 * Google Drive settings, inlined at build time from NEXT_PUBLIC_* variables
 * (see README › Google Drive). Without them the Drive options are hidden and
 * import/export work with local files only.
 */
const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY ?? "";

export const DRIVE_CONFIG = {
  /** OAuth 2.0 web client ID, for the sign-in popup. */
  clientId,
  /** Browser API key, required by Google Picker. */
  apiKey,
  /**
   * Cloud project number. Picker needs it so a picked file is shared with this
   * app under the drive.file scope. A client ID starts with the project number,
   * so it only needs setting if that ever differs.
   */
  appId: process.env.NEXT_PUBLIC_GOOGLE_APP_ID || /^(\d+)-/.exec(clientId)?.[1] || "",
} as const;

export const DRIVE_ENABLED = Boolean(DRIVE_CONFIG.clientId && DRIVE_CONFIG.apiKey && DRIVE_CONFIG.appId);
