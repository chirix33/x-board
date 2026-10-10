import { DevelopedBy } from "@/components/developed-by";
import { SignInForm } from "@/components/sign-in-form";
import { safeNext } from "@/lib/safe-next";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.next) ? params.next[0] : params.next;
  const nextPath = safeNext(raw);
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[42rem] flex-col items-center justify-center px-s-m py-l">
      <section className="theme-inverse w-full max-w-[26rem] rounded-[var(--radius-well)] border border-transparent bg-page p-l text-ink shadow-[var(--shadow-border)]">
        <div
          aria-hidden="true"
          className="mb-s h-1 w-12 rounded-full bg-brand"
        />
        <header className="flex flex-col gap-2xs">
          <h1 className="text-title font-semibold tracking-[-0.015em] text-balance">
            X Board
          </h1>
          <p className="max-w-[65ch] text-body text-muted">
            Sign in to send and copy from the shared board.
          </p>
        </header>
        <div className="mt-l">
          <SignInForm nextPath={nextPath} />
        </div>
      </section>
      <div className="mt-l">
        <DevelopedBy />
      </div>
    </main>
  );
}
