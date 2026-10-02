"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "candidate-catcher:reviewerName";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSnapshot() {
  return window.localStorage.getItem(STORAGE_KEY) ?? "";
}

function getServerSnapshot() {
  return "";
}

/**
 * Plain text input for "who is submitting this score" — there's no auth in this app, so
 * this is just a free-text label, not an account. Remembers the last value typed in this
 * browser (localStorage) purely as a convenience so a repeat reviewer doesn't retype their
 * name every time; it has no effect on access or identity beyond that.
 *
 * Uses useSyncExternalStore (not useState+useEffect) to read localStorage: the server has
 * no localStorage, so the initial value must come from getServerSnapshot ("") to match SSR
 * output exactly, with the real stored value adopted safely once mounted client-side —
 * avoids both a hydration mismatch and a setState-in-effect render.
 */
export function ReviewerNameInput({ className }: { className?: string }) {
  const storedValue = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <input
      key={storedValue}
      name="reviewerName"
      type="text"
      required
      placeholder="Your name"
      defaultValue={storedValue}
      onChange={(e) => {
        window.localStorage.setItem(STORAGE_KEY, e.target.value);
      }}
      className={className}
    />
  );
}
