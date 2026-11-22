"use client";

import { useId, useRef, useState, type ReactElement, type RefObject } from "react";
import { AlertIcon, CloudIcon, PlusIcon, UploadIcon } from "@/components/Icons";
import { SheetGuide, WorkbookErrorsDialog, type InvalidWorkbook } from "@/components/sets/SetTransfer";
import guideStyles from "@/components/sets/SetTransfer.module.css";
import { TransferMenu } from "@/components/sets/TransferMenu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useWorkbookPicker } from "@/hooks/useWorkbookPicker";
import { buildCustomSheet, saveCustomSheet } from "@/lib/custom-sheets";
import { DRIVE_ENABLED, readDriveCustomSheet } from "@/lib/drive/transfer";
import { nameTaken, suggestName } from "@/lib/excel/import";
import { CUSTOM_SHEET, MAX_CUSTOM_PROBLEMS, MAX_FILE_BYTES, XLSX_EXTENSION } from "@/lib/excel/schema";
import { preloadXlsx, readCustomSheetFile, type CustomSheetResult } from "@/lib/excel/transfer";
import { plural } from "@/lib/format";
import { NAME_MAX, countByDifficulty } from "@/lib/generate";
import { StorageWriteError } from "@/lib/storage";
import { DIFFICULTIES, DIFFICULTY_LABEL, type CatalogProblem, type CustomSheet } from "@/lib/types";
import styles from "./CreateSetForm.module.css";

/** Explains the workbook layout. Opened by `trigger`, or from the errors dialog. */
export function CustomSheetFormatDialog({
  open,
  onOpenChange,
  trigger,
  returnFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactElement;
  returnFocus: RefObject<HTMLElement | null>;
}) {
  const notesId = useId();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent size="wide" eyebrow="Custom sheet" returnFocus={returnFocus}>
        <DialogBody>
          <DialogHeader>
            <DialogTitle>Custom sheet format</DialogTitle>
            <DialogDescription>
              <p>
                A custom sheet is your own list of LeetCode and Codeforces problems in an Excel workbook (
                {XLSX_EXTENSION}), laid out like Striver&rsquo;s A2Z sheet. Add it once and it stays in this browser as
                a source you can create sets from.
              </p>
            </DialogDescription>
          </DialogHeader>

          <SheetGuide spec={CUSTOM_SHEET} />

          <section className={guideStyles.section} aria-labelledby={notesId}>
            <h3 id={notesId} className={guideStyles.sectionTitle}>
              Good to know
            </h3>
            <ul className="dialog__list">
              <li>
                Headers go in row 1. Capitals, spaces and punctuation in them don&rsquo;t matter, so “S. No.” and
                “LeetCode URL” work too. Column order doesn&rsquo;t matter, and extra columns are ignored.
              </li>
              <li>
                A row with a CodeforcesURL is a Codeforces problem and needs a Rating; any other row is a LeetCode
                problem and needs a Difficulty. When a row has both links, its title opens Codeforces and LeetCode is
                shown beside it.
              </li>
              <li>
                When you create a set, LeetCode problems are picked by difficulty and Codeforces problems by rating
                range. A sheet with both lets you take some of each in one set.
              </li>
              <li>
                A link cell works as a URL: if its text isn&rsquo;t a web address, the address it links to is used.
              </li>
              <li>
                The whole sheet is checked before it&rsquo;s added. If any row has a problem you&rsquo;ll see each issue
                with its row number, and nothing is added.
              </li>
              <li>
                Up to {MAX_CUSTOM_PROBLEMS.toLocaleString("en-US")} problems per sheet; files up to{" "}
                {MAX_FILE_BYTES / 1024 / 1024} MB. Blank rows are skipped.
              </li>
              <li>The sheet is saved in this browser. Removing it later keeps any sets you created from it.</li>
              {DRIVE_ENABLED && (
                <li>
                  From Google Drive you can add an {XLSX_EXTENSION} workbook or a Google Sheet laid out the same way.
                  This app can only see the files you pick.
                </li>
              )}
            </ul>
          </section>
        </DialogBody>
        <DialogFooter>
          <DialogClose render={<Button />}>Close</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** A free name from the file's: "Graphs.xlsx" → "Graphs", or "Graphs (2)" if that's taken. */
function defaultSheetName(fileName: string, sheets: readonly CustomSheet[]): string {
  const base =
    fileName
      .replace(/\.xlsx$/i, "")
      .trim()
      .slice(0, NAME_MAX)
      .trimEnd() || "Custom sheet";
  return nameTaken(base, sheets) ? suggestName(base, sheets) : base;
}

interface Preview {
  fileName: string;
  problems: CatalogProblem[];
}

/**
 * The "Add a custom sheet" card and its flow: file (this device or Google
 * Drive) → validate → name it → save. `onAdded` gets the saved sheet.
 * `returnFocus` is where the name step sends focus when it closes: the card,
 * unless the caller points it at the new sheet.
 */
export function AddCustomSheet({
  sheets,
  triggerRef,
  returnFocus,
  onAdded,
  onShowFormat,
  onError,
}: {
  sheets: readonly CustomSheet[];
  triggerRef: RefObject<HTMLButtonElement | null>;
  returnFocus: RefObject<HTMLElement | null>;
  onAdded: (sheet: CustomSheet) => void;
  onShowFormat: () => void;
  /** A Google Drive failure, or `null` when a new attempt starts. */
  onError: (message: string | null) => void;
}) {
  const nameRef = useRef<HTMLInputElement>(null);
  const [invalid, setInvalid] = useState<InvalidWorkbook | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);

  const { reading, choose, inputProps } = useWorkbookPicker<CustomSheetResult>({
    readFile: readCustomSheetFile,
    readDrive: readDriveCustomSheet,
    triggerRef,
    onError,
    onResult: (result, fileName, source) => {
      if (result.ok) {
        returnFocus.current = triggerRef.current;
        setPreview({ fileName, problems: result.problems });
      } else {
        setInvalid({ fileName, errors: result.errors, source });
      }
    },
  });

  return (
    <>
      <TransferMenu
        triggerRef={triggerRef}
        className={styles.addSheet}
        variant="bare"
        aria-label="Add a custom sheet"
        onSelect={(source) => {
          onError(null);
          choose(source);
        }}
        onPreload={preloadXlsx}
        busy={reading || preview !== null}
        pending={reading}
        deviceItem={
          <>
            <UploadIcon /> From this device…
          </>
        }
        driveItem={
          <>
            <CloudIcon /> From Google Drive…
          </>
        }
      >
        <span className={styles.addIcon}>
          {reading ? <span className="spinner" aria-hidden="true" /> : <PlusIcon />}
        </span>
        <span className={styles.sheetName}>{reading ? "Reading…" : "Add a custom sheet"}</span>
        <span className={styles.sheetDesc}>
          Use your own problems, from an Excel file on this device{DRIVE_ENABLED ? " or in Google Drive" : ""}.
        </span>
      </TransferMenu>
      <input {...inputProps} />
      <span className="visually-hidden" role="status">
        {reading ? "Reading workbook…" : ""}
      </span>

      <WorkbookErrorsDialog
        invalid={invalid}
        eyebrow="Custom sheet"
        title="This sheet can’t be added"
        intro={(fileName) => <>Nothing was added. Fix the issues below in {fileName}, then add it again.</>}
        returnFocus={triggerRef}
        onClose={() => setInvalid(null)}
        onShowFormat={onShowFormat}
        onRetry={choose}
      />

      <Dialog open={preview !== null} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent eyebrow="Custom sheet" initialFocus={nameRef} returnFocus={returnFocus}>
          {preview && (
            <NameSheetPanel
              preview={preview}
              sheets={sheets}
              nameRef={nameRef}
              onAdded={(sheet) => {
                setPreview(null);
                onAdded(sheet);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function NameSheetPanel({
  preview,
  sheets,
  nameRef,
  onAdded,
}: {
  preview: Preview;
  sheets: readonly CustomSheet[];
  nameRef: RefObject<HTMLInputElement | null>;
  onAdded: (sheet: CustomSheet) => void;
}) {
  const [name, setName] = useState(() => defaultSheetName(preview.fileName, sheets));
  const [saveError, setSaveError] = useState<string | null>(null);
  const counts = countByDifficulty(preview.problems);
  const rated = preview.problems.filter((p) => p.rating !== undefined).length;
  const nameError = !name.trim()
    ? "Give the sheet a name."
    : nameTaken(name, sheets)
      ? "You already have a sheet with this name."
      : undefined;

  const add = () => {
    if (nameError) return;
    try {
      const sheet = buildCustomSheet({ name, fileName: preview.fileName, problems: preview.problems });
      saveCustomSheet(sheet);
      onAdded(sheet);
    } catch (err) {
      setSaveError(err instanceof StorageWriteError ? err.message : "The sheet couldn’t be saved. Try again.");
    }
  };

  return (
    <>
      <DialogBody>
        <DialogHeader>
          <DialogTitle>Add this sheet?</DialogTitle>
          <DialogDescription>
            <p>
              <strong className={guideStyles.fileName}>{preview.fileName}</strong> is valid and has{" "}
              {plural(preview.problems.length, "problem")}.
            </p>
          </DialogDescription>
        </DialogHeader>
        <dl className={guideStyles.resultStats}>
          {DIFFICULTIES.map((d) => (
            <div key={d}>
              <dt className="label">{DIFFICULTY_LABEL[d]}</dt>
              <dd className="mono tabular">{counts[d]}</dd>
            </div>
          ))}
          {rated > 0 && (
            <div>
              <dt className="label">Rated</dt>
              <dd className="mono tabular">{rated}</dd>
            </div>
          )}
        </dl>
        <Field invalid={!!nameError}>
          <FieldLabel>Sheet name</FieldLabel>
          <Input
            ref={nameRef}
            className="input"
            type="text"
            value={name}
            maxLength={NAME_MAX}
            autoComplete="off"
            onChange={(e) => {
              setName(e.target.value);
              setSaveError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
          <FieldDescription>Shown on its source card and on sets you create from it.</FieldDescription>
          <FieldError message={nameError} />
        </Field>
        {saveError && (
          <div className="notice notice--error" role="alert">
            <AlertIcon /> <span>{saveError}</span>
          </div>
        )}
      </DialogBody>
      <DialogFooter>
        <DialogClose render={<Button />}>Cancel</DialogClose>
        <Button variant="primary" onClick={add} disabled={!!nameError}>
          <PlusIcon /> Add sheet
        </Button>
      </DialogFooter>
    </>
  );
}
