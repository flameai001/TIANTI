"use client";

import { useState, useTransition } from "react";

export function SignOutButton() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSignOut() {
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
      <button
        type="button"
        onClick={handleSignOut}
        disabled={pending}
        className="rounded-full border border-white/12 px-4 py-2 text-sm text-white/70 disabled:opacity-60"
      >
        {pending ? "退出中..." : "退出登录"}
      </button>
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
