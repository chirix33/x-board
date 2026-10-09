import type { ReactNode } from "react";
import Link from "next/link";
import { DevelopedBy } from "@/components/developed-by";
import { SignUpForm } from "@/components/sign-up-form";
import { getInviteStatus, type InviteStatus } from "@/lib/invites";

export const dynamic = "force-dynamic";

const notices: Record<Exclude<InviteStatus, "valid"> | "missing", { title: string; body: string }> = {
  missing: {
    title: "Sign-up link required",
    body: "Open the full link you were sent. A token is missing from this address.",
  },
  unknown: {
    title: "Sign-up link not valid",
    body: "This link does not match an invite. Ask for a new one.",
  },
  expired: {
    title: "Sign-up link expired",
    body: "This invite is past its time limit. Ask for a new one.",
  },
  exhausted: {
    title: "Sign-up link used up",
    body: "This invite has already created as many accounts as it allows.",
  },
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const params = await searchParams;
  const tokenParam = params.token;
  const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;

  if (!token) {
    return (
      <AuthShell>
        <InviteNotice notice="missing" />
      </AuthShell>
    );
  }

  const status = await getInviteStatus(token);
  if (status !== "valid") {
    return (
      <AuthShell>
        <InviteNotice notice={status} />
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <header className="flex flex-col gap-2xs">
        <h1 className="text-title font-semibold tracking-[-0.015em] text-balance">Create an account</h1>
        <p className="max-w-[65ch] text-body text-muted">
          This invite lets you join the shared board.
        </p>
      </header>
      <div className="mt-l">
        <SignUpForm token={token} />
      </div>
    </AuthShell>
  );
}

function InviteNotice({ notice }: { notice: keyof typeof notices }) {
  const copy = notices[notice];
  return (
    <>
      <header className="flex flex-col gap-2xs">
        <h1 className="text-title font-semibold tracking-[-0.015em] text-balance">{copy.title}</h1>
        <p className="max-w-[65ch] text-body text-muted">{copy.body}</p>
      </header>
      <p className="mt-l text-body">
        <Link href="/sign-in" className="underline">
          Sign in
        </Link>
      </p>
    </>
  );
}

function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[42rem] flex-col items-center justify-center px-s-m py-l">
      <section className="theme-inverse w-full max-w-[26rem] rounded-[var(--radius-well)] border border-transparent bg-page p-l text-ink shadow-[var(--shadow-border)]">
        <div aria-hidden="true" className="mb-s h-1 w-12 rounded-full bg-brand" />
        {children}
      </section>
      <div className="mt-l">
        <DevelopedBy />
      </div>
    </main>
  );
}
