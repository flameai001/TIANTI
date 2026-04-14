"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";

interface UnsavedChangesGuard {
  isDirty: boolean;
  message?: string;
}

interface AdminUnsavedChangesContextValue {
  guard: UnsavedChangesGuard | null;
  setGuard: (guard: UnsavedChangesGuard | null) => void;
  confirmNavigation: () => boolean;
}

const DEFAULT_MESSAGE = "当前页面还有未保存的修改，离开后会丢失。确定继续吗？";

const AdminUnsavedChangesContext = createContext<AdminUnsavedChangesContextValue | null>(null);

export function AdminUnsavedChangesProvider({ children }: { children: ReactNode }) {
  const [guard, setGuard] = useState<UnsavedChangesGuard | null>(null);

  useEffect(() => {
    if (!guard?.isDirty) {
      return undefined;
    }

    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = guard.message ?? DEFAULT_MESSAGE;
      return event.returnValue;
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [guard]);

  const value = useMemo<AdminUnsavedChangesContextValue>(
    () => ({
      guard,
      setGuard,
      confirmNavigation: () => !guard?.isDirty || window.confirm(guard.message ?? DEFAULT_MESSAGE)
    }),
    [guard]
  );

  return <AdminUnsavedChangesContext.Provider value={value}>{children}</AdminUnsavedChangesContext.Provider>;
}

export function useAdminUnsavedChanges() {
  const context = useContext(AdminUnsavedChangesContext);

  if (!context) {
    throw new Error("useAdminUnsavedChanges must be used within AdminUnsavedChangesProvider");
  }

  return context;
}
