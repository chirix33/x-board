"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/button";

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const { error: signInError } = await authClient.signIn.email({
      email,
      password,
    });
    setPending(false);
    if (signInError) {
      setError("Wrong email or password");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-s">
      <label className="flex flex-col gap-2xs text-body">
        Email
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="min-h-11 rounded-[var(--radius-control)] border border-border bg-page px-xs text-body text-ink"
        />
      </label>
      <label className="flex flex-col gap-2xs text-body">
        Password
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="min-h-11 rounded-[var(--radius-control)] border border-border bg-page px-xs text-body text-ink"
        />
      </label>
      {error ? (
        <p className="text-body text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? "Signing in" : "Sign in"}
      </Button>
    </form>
  );
}
