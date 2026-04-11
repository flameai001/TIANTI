"use client";

import type { FormEvent } from "react";
import { useState, useTransition } from "react";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    const payload = {
      email: formData.get("email"),
      password: formData.get("password")
    };

    startTransition(async () => {
      const response = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "登录失败，请检查账号或密码。");
        return;
      }

      window.location.href = "/admin";
    });
  }

  return (
    <div className="surface w-full max-w-xl rounded-[2rem] p-8">
      <div className="space-y-4">
        <p className="text-xs uppercase tracking-[0.35em] text-[var(--color-accent)]">Editor Sign In</p>
        <h1 className="text-4xl text-white">进入 TIANTI 后台</h1>
        <p className="text-sm leading-7 text-white/68">
          当前演示账号：`lin@example.com / changeme-one` 和 `yu@example.com / changeme-two`。
        </p>
      </div>
      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-4"
      >
        <input
          name="email"
          type="email"
          placeholder="邮箱"
          className="w-full rounded-[1.2rem] border border-white/12 bg-black/20 px-4 py-3 text-sm outline-none"
        />
        <input
          name="password"
          type="password"
          placeholder="密码"
          className="w-full rounded-[1.2rem] border border-white/12 bg-black/20 px-4 py-3 text-sm outline-none"
        />
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        <button
          disabled={pending}
          className="w-full rounded-[1.2rem] bg-[var(--color-accent)] px-4 py-3 text-sm uppercase tracking-[0.25em] text-black disabled:opacity-60"
        >
          {pending ? "登录中..." : "登录"}
        </button>
      </form>
    </div>
  );
}
