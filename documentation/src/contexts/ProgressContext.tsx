import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface ProgressContextType {
  completedPaths: Set<string>;
  toggleComplete: (path: string) => void;
  isCompleted: (path: string) => boolean;
}

const ProgressContext = createContext<ProgressContextType | undefined>(undefined);

const STORAGE_KEY = 'sc-tutorial-progress';

export function ProgressProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [completedPaths, setCompletedPaths] = useState<Set<string>>(new Set());
  const [isMounted, setIsMounted] = useState(false);

  // Initialize from localStorage only on client-side to prevent hydration mismatches
  useEffect(() => {
    setIsMounted(true);
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const pathsArray = JSON.parse(stored);
        if (Array.isArray(pathsArray)) {
          setCompletedPaths(new Set(pathsArray));
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const toggleComplete = (path: string) => {
    setCompletedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }

      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
      } catch {
        // Ignore storage errors
      }

      return next;
    });
  };

  const isCompleted = (path: string) => completedPaths.has(path);

  // Provide an empty set until mounted to match server rendering (hydration safe)
  const value = {
    completedPaths: isMounted ? completedPaths : new Set<string>(),
    toggleComplete,
    isCompleted: isMounted ? isCompleted : () => false,
  };

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressContextType {
  const context = useContext(ProgressContext);
  if (context === undefined) {
    throw new Error('useProgress must be used within a ProgressProvider');
  }
  return context;
}
