"use client";

import { useSyncExternalStore } from "react";
import { getCustomSheets, subscribeCustomSheets } from "@/lib/custom-sheets";
import type { CustomSheet } from "@/lib/types";

const NONE: CustomSheet[] = [];
const serverList = () => NONE;

/** The person's custom sheets, oldest first. Empty until hydrated on the client. */
export function useCustomSheets(): CustomSheet[] {
  return useSyncExternalStore(subscribeCustomSheets, getCustomSheets, serverList);
}
