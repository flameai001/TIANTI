"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StatusNotice } from "@/components/ui/status-notice";

interface EditorNameFormProps {
  currentName: string;
}

export function EditorNameForm({ currentName }: EditorNameFormProps) {
  const router = useRouter();
  const [name, setName] = useState(currentName);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    setMessage(null);
    setError(null);

    startTransition(async () => {
      const response = await fetch("/api/admin/editor", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name })
      });
      const data = (await response.json().catch(() => null)) as { error?: string; editor?: { name: string } } | null;

      if (!response.ok || !data?.editor) {
        setError(data?.error ?? "保存失败，请重试。");
        return;
      }

      setName(data.editor.name);
      setMessage("昵称已更新，后台顶部和公开页面会同步刷新。");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={24}
          data-testid="editor-name-input"
          className="ui-input"
          placeholder="编辑者昵称"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={pending || name.trim().length === 0 || name.trim() === currentName}
          data-testid="save-editor-name"
          className="ui-button-primary text-sm disabled:opacity-60"
        >
          {pending ? "保存中..." : "保存昵称"}
        </button>
      </div>
      <p className="text-xs ui-muted">这个昵称会同步显示在后台顶部、公开首页、天梯和详情页里的编辑者视角中。</p>
      {message ? <StatusNotice variant="success">{message}</StatusNotice> : null}
      {error ? <StatusNotice variant="error">{error}</StatusNotice> : null}
    </div>
  );
}
