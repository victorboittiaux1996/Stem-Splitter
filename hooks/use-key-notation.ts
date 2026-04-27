"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { KeyNotation } from "@/lib/camelot";
import { KEY_NOTATION_VALUES } from "@/lib/camelot";

const STORAGE_KEY = "44stems-preferences";
const EVENT_NAME = "44stems-preferences-change";
const DEFAULT: KeyNotation = "camelot";

function readNotation(): KeyNotation {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw);
    if (KEY_NOTATION_VALUES.includes(parsed?.keyNotation)) return parsed.keyNotation;
  } catch {}
  return DEFAULT;
}

function writeNotation(n: KeyNotation) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const prev = raw ? JSON.parse(raw) : {};
    const next = { ...prev, keyNotation: n };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { keyNotation: n } }));
  } catch {}
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const onCustom = () => callback();
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };
  window.addEventListener(EVENT_NAME, onCustom);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT_NAME, onCustom);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * Globally-synced key notation preference. Uses useSyncExternalStore so the
 * value reads from localStorage on the FIRST client render — no flash from
 * the default to the saved value when navigating between views.
 */
export function useKeyNotation(): [KeyNotation, (n: KeyNotation) => void] {
  const notation = useSyncExternalStore(
    subscribe,
    readNotation,
    () => DEFAULT, // SSR snapshot — never reaches the screen for "use client" pages
  );

  const update = useCallback((n: KeyNotation) => {
    writeNotation(n);
  }, []);

  return [notation, update];
}
