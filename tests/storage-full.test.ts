import { test } from "node:test";
import assert from "node:assert/strict";

test("a full quota leaves old keys in place, so nothing is lost", async () => {
  const map = new Map([["blueprint-dsa:set:a", '{"id":"a"}']]);
  const ls = {
    get length() {
      return map.size;
    },
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: () => {
      throw new Error("QuotaExceededError");
    },
    removeItem: (k: string) => void map.delete(k),
  };
  (globalThis as { window?: unknown }).window = { localStorage: ls };

  const { readRaw, STORAGE_KEYS } = await import("../src/lib/storage");
  assert.equal(readRaw(STORAGE_KEYS.set("a")), null);
  assert.equal(map.get("blueprint-dsa:set:a"), '{"id":"a"}', "not removed when the copy couldn't be written");
});
