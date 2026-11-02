import { test } from "node:test";
import assert from "node:assert/strict";
import { buildProblemSet, pickProblems } from "../src/lib/generate";
import { XLSX_MIME } from "../src/lib/excel/schema";
import { buildProblemSetsFile, readWorkbookData } from "../src/lib/excel/transfer";
import {
  DRIVE_FOLDER_NAME,
  DriveError,
  GOOGLE_SHEETS_MIME,
  downloadWorkbook,
  ensureFolder,
  multipartBody,
  uploadWorkbook,
} from "../src/lib/drive/files";
import type { CatalogProblem } from "../src/lib/types";

interface Call {
  url: string;
  init: RequestInit;
}

/** A fetch that records calls and answers from `replies` in order. */
function stubFetch(...replies: (Response | Error)[]) {
  const calls: Call[] = [];
  const fetchImpl = (async (url: string, init: RequestInit = {}) => {
    calls.push({ url, init });
    const reply = replies.shift();
    if (!reply) throw new Error("unexpected fetch");
    if (reply instanceof Error) throw reply;
    return reply;
  }) as typeof fetch;
  return { calls, fetchImpl };
}

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
const fail = (status: number, reason?: string) =>
  new Response(JSON.stringify({ error: { code: status, errors: reason ? [{ reason }] : [] } }), { status });

async function rejects(p: Promise<unknown>, message: RegExp, kind: DriveError["kind"] = "failed") {
  await assert.rejects(p, (err: unknown) => {
    assert.ok(err instanceof DriveError);
    assert.match(err.message, message);
    assert.equal(err.kind, kind);
    return true;
  });
}

const catalog: CatalogProblem[] = [
  { id: "e1", title: "E1", url: "https://leetcode.com/problems/e1/", leetCodeUrl: null, difficulty: "easy", topic: "Arrays", order: 0 },
  { id: "m1", title: "M1", url: "https://leetcode.com/problems/m1/", leetCodeUrl: null, difficulty: "medium", topic: "Graphs", order: 1 },
];
const counts = { easy: 1, medium: 1, hard: 0 };
const set = buildProblemSet({ name: "Week 1", sheetId: "striver-180", counts }, pickProblems(catalog, counts), Date.UTC(2026, 9, 1));

test("export folder: reuses the app's folder, or creates it in My Drive", async () => {
  const found = stubFetch(ok({ files: [{ id: "folder-1" }] }));
  assert.equal(await ensureFolder("tok", found.fetchImpl), "folder-1");
  assert.equal(found.calls.length, 1);
  const q = new URL(found.calls[0]!.url).searchParams.get("q")!;
  assert.match(q, new RegExp(`name='${DRIVE_FOLDER_NAME}'`));
  assert.match(q, /trashed=false/);
  assert.equal((found.calls[0]!.init.headers as Record<string, string>).Authorization, "Bearer tok");

  const created = stubFetch(ok({ files: [] }), ok({ id: "folder-2" }));
  assert.equal(await ensureFolder("tok", created.fetchImpl), "folder-2");
  assert.equal(created.calls[1]!.init.method, "POST");
  assert.deepEqual(JSON.parse(created.calls[1]!.init.body as string), {
    name: DRIVE_FOLDER_NAME,
    mimeType: "application/vnd.google-apps.folder",
    parents: ["root"],
  });
});

test("multipart body: metadata part, then the file bytes", async () => {
  const body = multipartBody({ name: "a.xlsx" }, new Uint8Array([1, 2, 3]), XLSX_MIME, "b0");
  assert.equal(body.type, "multipart/related; boundary=b0");
  const bytes = new Uint8Array(await body.arrayBuffer());
  const text = new TextDecoder().decode(bytes);
  assert.ok(text.startsWith('--b0\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n{"name":"a.xlsx"}\r\n--b0\r\n'));
  assert.ok(text.endsWith("\r\n--b0--\r\n"));
  const start = text.indexOf(`${XLSX_MIME}\r\n\r\n`) + XLSX_MIME.length + 4;
  assert.deepEqual([...bytes.slice(start, start + 3)], [1, 2, 3]);
});

test("upload, then download: the workbook survives the round trip", async () => {
  const file = await buildProblemSetsFile([set], { now: Date.UTC(2026, 9, 2) });
  const { calls, fetchImpl } = stubFetch(
    ok({ files: [{ id: "folder-1" }] }),
    ok({ id: "file-1", name: file.fileName, webViewLink: "https://drive.google.com/file/d/file-1/view" }),
    new Response(file.bytes, { status: 200 }),
  );

  const saved = await uploadWorkbook("tok", file, fetchImpl);
  assert.deepEqual(saved, { id: "file-1", name: file.fileName, webViewLink: "https://drive.google.com/file/d/file-1/view" });
  const upload = calls[1]!;
  assert.match(upload.url, /^https:\/\/www\.googleapis\.com\/upload\/drive\/v3\/files\?uploadType=multipart/);
  const metadata = await (upload.init.body as Blob).text();
  assert.match(metadata, /"parents":\["folder-1"\]/);
  assert.match(metadata, new RegExp(`"name":"${file.fileName}"`));

  const data = await downloadWorkbook("tok", { id: "file-1", mimeType: XLSX_MIME }, fetchImpl);
  assert.equal(calls[2]!.url, "https://www.googleapis.com/drive/v3/files/file-1?alt=media");
  const result = await readWorkbookData(data);
  assert.ok(result.ok);
  assert.equal(result.sets[0]!.set.name, "Week 1");
  assert.equal(result.sets[0]!.set.problems.length, 2);
});

test("Google Sheets are exported as .xlsx", async () => {
  const { calls, fetchImpl } = stubFetch(new Response(new Uint8Array([1]), { status: 200 }));
  await downloadWorkbook("tok", { id: "sheet/1", mimeType: GOOGLE_SHEETS_MIME }, fetchImpl);
  assert.equal(
    calls[0]!.url,
    `https://www.googleapis.com/drive/v3/files/sheet%2F1/export?mimeType=${encodeURIComponent(XLSX_MIME)}`,
  );
});

test("Drive failures become readable messages", async () => {
  const fetchFails = (reply: Response | Error) => downloadWorkbook("tok", { id: "f", mimeType: XLSX_MIME }, stubFetch(reply).fetchImpl);
  await rejects(fetchFails(new TypeError("Failed to fetch")), /Couldn't reach Google Drive/);
  await rejects(fetchFails(fail(401)), /sign-in has expired/, "auth");
  await rejects(fetchFails(fail(403, "storageQuotaExceeded")), /Drive is full/);
  await rejects(fetchFails(fail(403, "userRateLimitExceeded")), /busy/);
  await rejects(fetchFails(fail(403, "exportSizeLimitExceeded")), /too large/);
  await rejects(fetchFails(fail(403)), /denied access/);
  await rejects(fetchFails(fail(404)), /wasn't found/);
  await rejects(fetchFails(new Response("<html>", { status: 502 })), /having problems/);
  await rejects(uploadWorkbook("tok", { fileName: "a.xlsx", bytes: new Uint8Array([1]) }, stubFetch(ok({}), ok({})).fetchImpl), /unexpected response/);
});

test("downloaded bytes get the same checks as local files", async () => {
  const errors = async (bytes: Uint8Array<ArrayBuffer>) => {
    const r = await readWorkbookData(bytes.buffer);
    assert.ok(!r.ok);
    return r.errors.join("\n");
  };
  assert.match(await errors(new Uint8Array(0)), /empty/);
  assert.match(await errors(new TextEncoder().encode("<html>")), /isn't a valid Excel workbook/);
  assert.match(await errors(new Uint8Array(6 * 1024 * 1024)), /limit is 5 MB/);
});
