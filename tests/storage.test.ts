import { test } from "node:test";
import assert from "node:assert/strict";

/** Minimal in-memory Storage. */
class MemoryStorage {
  map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null;
  }
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
}

test("keys saved under the old app name move to the new prefix on first access", async () => {
  const ls = new MemoryStorage();
  ls.map.set("blueprint-dsa:set:a", '{"id":"a"}');
  ls.map.set("blueprint-dsa:set:b", '{"id":"b"}');
  ls.map.set("blueprint-dsa:theme", "dark");
  ls.map.set("solve-problemset:set:b", '{"id":"b","newer":true}'); // already migrated: kept
  ls.map.set("unrelated", "x");
  (globalThis as { window?: unknown }).window = { localStorage: ls };

  const { STORAGE_KEYS, keysWithPrefix, readRaw } = await import("../src/lib/storage");
  assert.equal(STORAGE_KEYS.setPrefix, "solve-problemset:set:");
  assert.deepEqual(keysWithPrefix(STORAGE_KEYS.setPrefix).sort(), ["solve-problemset:set:a", "solve-problemset:set:b"]);
  assert.equal(readRaw(STORAGE_KEYS.set("a")), '{"id":"a"}');
  assert.equal(readRaw(STORAGE_KEYS.set("b")), '{"id":"b","newer":true}', "an existing new key is never overwritten");
  assert.equal(readRaw(STORAGE_KEYS.theme), "dark");
  assert.deepEqual([...ls.map.keys()].filter((k) => k.startsWith("blueprint-dsa:")), [], "old keys removed");
  assert.equal(ls.getItem("unrelated"), "x");

  // Runs once per page load: keys written under the old prefix later are left alone.
  ls.map.set("blueprint-dsa:set:c", "{}");
  readRaw("anything");
  assert.equal(ls.getItem("blueprint-dsa:set:c"), "{}");
});
