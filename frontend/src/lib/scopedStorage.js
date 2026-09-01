import { useEffect, useRef, useState } from "react";

function readState(storageKey, initialFactory) {
  if (!storageKey) return initialFactory();

  try {
    const stored = localStorage.getItem(storageKey);
    return stored ? JSON.parse(stored) : initialFactory();
  } catch {
    localStorage.removeItem(storageKey);
    return initialFactory();
  }
}

export function useScopedState(storageScope, stateName, initialFactory) {
  const storageKey = storageScope ? `ims:${storageScope}:${stateName}` : null;
  const initialFactoryRef = useRef(initialFactory);
  const [state, setState] = useState(() => readState(storageKey, initialFactoryRef.current));
  const skipPersistRef = useRef(true);

  useEffect(() => {
    skipPersistRef.current = true;
    setState(readState(storageKey, initialFactoryRef.current));
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
