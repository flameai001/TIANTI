"use client";

import { useState, useTransition } from "react";
import { StatusNotice } from "@/components/ui/status-notice";
import { useAdminUnsavedChanges } from "@/components/admin/admin-unsaved-changes";

export function SignOutButton() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { confirmNavigation } = useAdminUnsavedChanges();

  function handleSignOut() {
    if (!confirmNavigation()) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const response = await fetch("/api/auth/sign-out", {
        method: "POST"
      });
      if (!response.ok) {
        setError("退出失败，请重试。");
        return;
      }
      window.location.href = "/admin/login";
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button type="button" onClick={handleSignOut} disabled={pending} className="ui-button-secondary px-4 py-2 text-sm">
        {pending ? "退出中..." : "退出登录"}
      </button>
      {error ? <StatusNotice variant="error">{error}</StatusNotice> : null}
    </div>
  );
}
