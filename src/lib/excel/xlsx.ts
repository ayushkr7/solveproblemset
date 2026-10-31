/**
 * The only module that touches the xlsx library (ExcelJS). It converts between
 * real .xlsx files and the library-neutral data in schema.ts. ExcelJS is large,
 * so it is loaded on first use rather than shipped with the page.
 */
import type { Workbook as ExcelWorkbook } from "exceljs";
import type { Cell, SheetTable, WorkbookOut } from "./schema";

type WorkbookCtor = new () => ExcelWorkbook;

let workbookCtor: Promise<WorkbookCtor> | null = null;

function loadWorkbook(): Promise<WorkbookCtor> {
  workbookCtor ??= import("exceljs").then((m) => {
    // CJS/UMD interop: the class may sit on the namespace or on `default`.
    const ns = m as unknown as { Workbook?: WorkbookCtor; default?: { Workbook?: WorkbookCtor } };
    const ctor = ns.Workbook ?? ns.default?.Workbook;
    if (!ctor) throw new Error("ExcelJS failed to load");
    return ctor;
  });
  workbookCtor.catch(() => (workbookCtor = null)); // let a retry re-fetch the chunk
  return workbookCtor;
}

/** Start fetching the library early (e.g. when the file picker opens). */
export function preloadXlsx(): void {
  void loadWorkbook().catch(() => {});
}

/** ExcelJS cell value → plain value. Formulas count by their cached result. */
function toCell(v: unknown): Cell {
  if (v === null || v === undefined) return null;
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return v;
  if (v instanceof Date) return v;
  if (typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if ("result" in o) return toCell(o.result);
  if ("formula" in o || "sharedFormula" in o) return null;
  if (Array.isArray(o.richText)) {
    return o.richText.map((r: unknown) => (r && typeof (r as { text?: unknown }).text === "string" ? (r as { text: string }).text : "")).join("");
  }
  if (typeof o.hyperlink === "string") {
    const text = toCell(o.text);
    return { text: text === null || typeof text === "object" ? "" : String(text), href: o.hyperlink };
  }
  if (typeof o.error === "string") return o.error; // "#N/A", "#REF!" … reported as invalid values
  return null;
}

export async function readXlsx(data: ArrayBuffer): Promise<SheetTable[]> {
  const Workbook = await loadWorkbook();
  const wb = new Workbook();
  await wb.xlsx.load(data as never); // typed as Node's Buffer; any ArrayBuffer works
  return wb.worksheets.map((ws) => {
    const rows: SheetTable["rows"] = [];
    ws.eachRow((row, rowNumber) => {
      const values = Array.isArray(row.values) ? row.values.slice(1) : []; // index 0 is unused
      rows.push({ row: rowNumber, cells: Array.from(values, toCell) });
    });
    return { name: ws.name, rows };
  });
}

export async function writeXlsx(book: WorkbookOut): Promise<Uint8Array<ArrayBuffer>> {
  const Workbook = await loadWorkbook();
  const wb = new Workbook();
  wb.creator = "Solve Problemset";
  wb.created = book.created;
  wb.modified = book.created;

  for (const { spec, rows } of book.sheets) {
    const ws = wb.addWorksheet(spec.name, { views: [{ state: "frozen", ySplit: 1 }] });
    ws.columns = spec.columns.map((c) => ({
      header: c.header,
      key: c.key,
      width: c.width,
      style: c.numFmt ? { numFmt: c.numFmt } : {},
    }));
    ws.getRow(1).font = { bold: true };

    for (const values of rows) {
      const row = ws.addRow({});
      spec.columns.forEach((c, i) => {
        const v = values[c.key] ?? null;
        const cell = row.getCell(i + 1);
        if (v !== null && typeof v === "object" && !(v instanceof Date)) {
          cell.value = { text: v.text, hyperlink: v.href };
          cell.font = { color: { argb: "FF1F4FD1" }, underline: true };
        } else {
          cell.value = v;
        }
      });
    }
  }

  return new Uint8Array(await wb.xlsx.writeBuffer());
}
