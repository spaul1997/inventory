import { useEffect, useRef, useState } from "react";

function readState(storageKey, initialFactory, sanitizer) {
  if (!storageKey) return initialFactory();

  try {
    const stored = localStorage.getItem(storageKey);
    const parsed = stored ? JSON.parse(stored) : initialFactory();
    return sanitizer ? sanitizer(parsed, initialFactory) : parsed;
  } catch {
    localStorage.removeItem(storageKey);
    return initialFactory();
  }
}

export function sanitizeEntityCollections(value, initialFactory) {
  const fallback = initialFactory();
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;

  return Object.fromEntries(
    Object.entries(fallback).map(([key, rows]) => [key, Array.isArray(value[key]) ? value[key] : rows])
  );
}

export function useScopedState(storageScope, stateName, initialFactory, sanitizer) {
  const storageKey = storageScope ? `ims:${storageScope}:${stateName}` : null;
  const initialFactoryRef = useRef(initialFactory);
  const sanitizerRef = useRef(sanitizer);
  const [state, setState] = useState(() => readState(storageKey, initialFactoryRef.current, sanitizerRef.current));
  const skipPersistRef = useRef(true);

  useEffect(() => {
    skipPersistRef.current = true;
    setState(readState(storageKey, initialFactoryRef.current, sanitizerRef.current));
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    if (skipPersistRef.current) {
      skipPersistRef.current = false;
      return;
    }

    localStorage.setItem(storageKey, JSON.stringify(state));
  }, [storageKey, state]);

  return [state, setState];
}
