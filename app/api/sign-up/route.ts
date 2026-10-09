import { NextResponse } from "next/server";
import { registerWithInvite } from "@/lib/invites";

export const dynamic = "force-dynamic";

const messages = {
  unknown: "This sign-up link is not valid.",
  expired: "This sign-up link has expired.",
  exhausted: "This sign-up link has already been used.",
  exists: "An account with that email already exists.",
  invalid: "Check the email and use a password of at least 8 characters.",
} as const;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid sign-up" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const token = typeof payload.token === "string" ? payload.token : "";
  const email = typeof payload.email === "string" ? payload.email : "";
  const password = typeof payload.password === "string" ? payload.password : "";

  if (!token || !email || !password) {
    return NextResponse.json({ error: messages.invalid }, { status: 400 });
  }

  const result = await registerWithInvite(token, email, password);
  if (result.ok) return NextResponse.json({ ok: true }, { status: 201 });

  const status =
    result.status === "exists" ? 409 : result.status === "expired" || result.status === "exhausted" ? 410 : 400;
  return NextResponse.json({ error: messages[result.status] }, { status });
}
