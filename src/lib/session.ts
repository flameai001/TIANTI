import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verify } from "@node-rs/argon2";
import { getContentRepository } from "@/modules/repository";

const SESSION_COOKIE_NAME = "tianti_session";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function verifyPassword(passwordHash: string, password: string) {
  return verify(passwordHash, password);
}

export async function createEditorSession(editorId: string) {
  const repository = getContentRepository();
  const token = randomUUID();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

  await repository.createSession({
    id: randomUUID(),
    editorId,
    tokenHash,
    expiresAt: expiresAt.toISOString(),
    createdAt: new Date().toISOString()
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt
  });
}

export async function destroyEditorSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    await getContentRepository().deleteSessionByTokenHash(hashToken(token));
  }

  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0)
  });
}

export async function getAuthenticatedEditor() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  const repository = getContentRepository();
  const session = await repository.getSessionByTokenHash(hashToken(token));
  if (!session || Date.parse(session.expiresAt) < Date.now()) {
    return null;
  }

  const state = await repository.getState();
  return state.editors.find((editor) => editor.id === session.editorId) ?? null;
}

export async function requireAuthenticatedEditor() {
  const editor = await getAuthenticatedEditor();
  if (!editor) {
    redirect("/admin/login");
  }

  return editor;
}
