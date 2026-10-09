import { SignInForm } from "@/components/sign-in-form";

export default function SignInPage() {
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
          <SignInForm />
        </div>
      </section>
    </main>
  );
}
