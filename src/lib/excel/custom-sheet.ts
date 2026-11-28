/**
 * Workbook data → the problems of a custom sheet. Like every import, the file
 * is untrusted and validation is all-or-nothing: all issues are collected with
 * their row, and one invalid row rejects the sheet. Nothing is saved here.
 */
import { urlKey } from "../generate";
import { CF_RATING_MAX, CF_RATING_MIN, ratingDifficulty } from "../sources/codeforces";
import type { CatalogProblem } from "../types";
import {
  cellNumber,
  cellText,
  cellUrl,
  importFailure,
  isBlank,
  lookup,
  readTable,
  show,
  type ImportFailure,
  type Rec,
} from "./import";
import {
  CUSTOM_SHEET,
  DIFFICULTY_VALUE,
  MAX_CUSTOM_PROBLEMS,
  PROBLEM_NAME_MAX,
  orList,
  type SheetTable,
} from "./schema";

export type CustomSheetResult = { ok: true; problems: CatalogProblem[] } | ImportFailure;

/**
 * A custom sheet's Codeforces problems (picked by rating) versus its LeetCode
 * ones (picked by difficulty). A Codeforces row's title opens Codeforces, so
 * its link differs from its LeetCode one; a LeetCode row's two are the same.
 */
export function isCodeforcesRow(p: Pick<CatalogProblem, "url" | "leetCodeUrl">): boolean {
  return p.url !== p.leetCodeUrl;
}

type Key = (typeof CUSTOM_SHEET.columns)[number]["key"];

/** Capitals, spaces and punctuation don't matter: "S. No." is SNo, "LeetCode URL" is LeetCodeURL. */
const headerKey = (header: string) => header.toLowerCase().replace(/[^a-z0-9]/g, "");

function parseRow(rec: Rec<Key>, errors: string[]): CatalogProblem | null {
  const before = errors.length;

  const leetCodeCell = rec.get("leetCodeUrl");
  const leetCodeUrl = isBlank(leetCodeCell) ? null : cellUrl(leetCodeCell);
  if (!isBlank(leetCodeCell) && !leetCodeUrl) {
    errors.push(
      `${rec.at("leetCodeUrl")}: LeetCodeURL ${show(leetCodeCell)} isn't a valid web address. Use a full link starting with https://, or leave it blank.`,
    );
  }

  const codeforcesCell = rec.get("codeforcesUrl");
  const codeforcesUrl = isBlank(codeforcesCell) ? null : cellUrl(codeforcesCell);
  if (!isBlank(codeforcesCell) && !codeforcesUrl) {
    errors.push(
      `${rec.at("codeforcesUrl")}: CodeforcesURL ${show(codeforcesCell)} isn't a valid web address. Use a full link starting with https://, or leave it blank.`,
    );
  }
  if (isBlank(leetCodeCell) && isBlank(codeforcesCell)) {
    errors.push(`${rec.at("leetCodeUrl")}: add a LeetCodeURL or a CodeforcesURL.`);
  }

  const sNoCell = rec.get("sNo");
  const sNo = cellNumber(sNoCell);
  if (sNo === "blank") errors.push(`${rec.at("sNo")}: SNo is required.`);
  else if (sNo === "invalid" || !Number.isSafeInteger(sNo) || sNo < 1) {
    errors.push(`${rec.at("sNo")}: SNo ${show(sNoCell)} must be a whole number of 1 or more.`);
  }

  const titleCell = rec.get("title");
  const title = cellText(titleCell);
  if (title === null) errors.push(`${rec.at("title")}: Problem must be text, not ${show(titleCell)}.`);
  else if (!title) errors.push(`${rec.at("title")}: Problem is required.`);
  else if (title.length > PROBLEM_NAME_MAX) {
    errors.push(`${rec.at("title")}: Problem is longer than ${PROBLEM_NAME_MAX} characters.`);
  }

  const ratingCell = rec.get("rating");
  const rating = cellNumber(ratingCell);
  if (
    rating !== "blank" &&
    (rating === "invalid" || !Number.isSafeInteger(rating) || rating < CF_RATING_MIN || rating > CF_RATING_MAX)
  ) {
    errors.push(
      `${rec.at("rating")}: Rating ${show(ratingCell)} must be a whole number from ${CF_RATING_MIN} to ${CF_RATING_MAX}, or blank.`,
    );
  }

  // Codeforces problems are picked by rating, LeetCode ones by difficulty.
  if (codeforcesUrl && rating === "blank") {
    errors.push(`${rec.at("rating")}: add a Rating - Codeforces problems are picked by rating.`);
  }
  const diffCell = rec.get("difficulty");
  const difficulty = lookup(diffCell, DIFFICULTY_VALUE);
  if (isBlank(diffCell)) {
    if (isBlank(codeforcesCell) && leetCodeUrl) {
      errors.push(`${rec.at("difficulty")}: add a Difficulty - LeetCode problems are picked by difficulty.`);
    }
  } else if (!difficulty) {
    errors.push(
      `${rec.at("difficulty")}: Difficulty ${show(diffCell)} isn't valid. Use ${orList(Object.values(DIFFICULTY_VALUE))}.`,
    );
  }

  if (errors.length > before) return null;
  // With both links the title opens Codeforces, and LeetCode is offered beside it.
  const url = (codeforcesUrl ?? leetCodeUrl)!;
  return {
    // From the link, so ids stay the same if the sheet is reordered or added again.
    id: `custom-${urlKey(url)}`,
    title: title!,
    url,
    leetCodeUrl,
    difficulty: difficulty ?? ratingDifficulty(rating as number),
    topic: "",
    order: sNo as number,
    ...(rating === "blank" ? {} : { rating: rating as number }),
  };
}

/** Validate the first worksheet and build the sheet's problems, in SNo order. */
export function parseCustomSheet(tables: readonly SheetTable[]): CustomSheetResult {
  const table = tables[0];
  if (!table) return importFailure("This workbook has no worksheets.");

  const errors: string[] = [];
  const recs = readTable(table, CUSTOM_SHEET, errors, headerKey);
  if (errors.length > 0 || !recs) return importFailure(...errors);

  const sheetName = table.name.trim();
  // One message for the whole sheet, rather than the same one on every row.
  const headers = new Set(table.rows[0]!.cells.map((c) => headerKey(cellText(c) ?? "")));
  const has = (header: string) => headers.has(headerKey(header));
  if (!has("LeetCodeURL") && !has("CodeforcesURL"))
    errors.push(`${sheetName}: add a LeetCodeURL or CodeforcesURL column.`);
  if (!has("Difficulty") && !has("Rating")) errors.push(`${sheetName}: add a Difficulty or Rating column.`);
  if (errors.length > 0) return importFailure(...errors);

  if (recs.length === 0) {
    return importFailure(`${sheetName}: there are no problems. Add one row per problem below the headers.`);
  }
  if (recs.length > MAX_CUSTOM_PROBLEMS) {
    return importFailure(
      `${sheetName}: found ${recs.length.toLocaleString("en-US")} problems; ` +
        `a custom sheet can hold at most ${MAX_CUSTOM_PROBLEMS.toLocaleString("en-US")}.`,
    );
  }

  const problems: CatalogProblem[] = [];
  const orderRows = new Map<number, number>();
  const urlRows = new Map<string, number>();
  for (const rec of recs) {
    const problem = parseRow(rec, errors);
    if (!problem) continue;

    const sameOrder = orderRows.get(problem.order);
    if (sameOrder !== undefined) {
      errors.push(`${rec.at("sNo")}: SNo ${problem.order} is already used in row ${sameOrder}.`);
    } else {
      orderRows.set(problem.order, rec.row);
    }

    const key = urlKey(problem.url);
    const sameUrl = urlRows.get(key);
    if (sameUrl !== undefined) {
      const column = problem.url === problem.leetCodeUrl ? "LeetCodeURL" : "CodeforcesURL";
      errors.push(`${rec.at("leetCodeUrl")}: this ${column} is already used in row ${sameUrl}.`);
    } else {
      urlRows.set(key, rec.row);
    }

    problems.push(problem);
  }

  if (errors.length > 0) return importFailure(...errors);
  return { ok: true, problems: problems.sort((a, b) => a.order - b.order) };
}
