"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/button";

export function SignUpForm({ token }: { token: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [createdWithoutSession, setCreatedWithoutSession] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setCreatedWithoutSession(false);
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email, password }),
      });
      if (!response.ok) {
        setError(await readError(response));
        return;
      }

      const { error: signInError } = await authClient.signIn.email({ email, password });
      if (signInError) {
        setCreatedWithoutSession(true);
        return;
      }
      router.replace("/");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  const errorId = "sign-up-error";

  async function pasteInto(setValue: (value: string) => void) {
    setError(null);
    setCreatedWithoutSession(false);
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (!text) {
        setError("Nothing to paste");
        return;
      }
      setValue(text);
    } catch {
      setError("Tap Allow Paste at the top of the screen, then press Paste again.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-s">
      <div className="flex flex-col gap-2xs">
        <div className="flex items-center justify-between gap-s">
          <label className="text-body" htmlFor="sign-up-email">
            Email
          </label>
          <Button type="button" variant="ghost" onClick={() => void pasteInto(setEmail)}>
            Paste
          </Button>
        </div>
        <input
          id="sign-up-email"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="min-h-11 rounded-[var(--radius-control)] border border-border bg-surface px-xs text-body text-ink"
        />
      </div>
      <div className="flex flex-col gap-2xs">
        <div className="flex items-center justify-between gap-s">
          <label className="text-body" htmlFor="sign-up-password">
            Password
          </label>
          <Button type="button" variant="ghost" onClick={() => void pasteInto(setPassword)}>
            Paste
          </Button>
        </div>
        <input
          id="sign-up-password"
          type="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="min-h-11 rounded-[var(--radius-control)] border border-border bg-surface px-xs text-body text-ink"
        />
      </div>
      <div className="flex flex-col gap-2xs">
        <div className="flex items-center justify-between gap-s">
          <label className="text-body" htmlFor="sign-up-confirm">
            Confirm password
          </label>
          <Button type="button" variant="ghost" onClick={() => void pasteInto(setConfirmPassword)}>
            Paste
          </Button>
        </div>
        <input
          id="sign-up-confirm"
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="min-h-11 rounded-[var(--radius-control)] border border-border bg-surface px-xs text-body text-ink"
        />
      </div>
      {createdWithoutSession ? (
        <p id={errorId} className="text-body text-danger" role="alert">
          Account created. Sign in failed.{" "}
          <Link href="/sign-in" className="underline">
            Use the sign-in page
          </Link>
          .
        </p>
      ) : error ? (
        <p id={errorId} className="text-body text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? "Creating account" : "Create account"}
      </Button>
    </form>
  );
}

async function readError(response: Response) {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? "Something went wrong";
  } catch {
    return "Something went wrong";
  }
}
