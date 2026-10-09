import { SignInForm } from "@/components/sign-in-form";

export default function SignInPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[42rem] flex-col justify-center px-s-m py-l">
      <h1 className="text-title font-semibold tracking-[-0.015em] text-balance">
        X Board
      </h1>
      <p className="mt-2xs max-w-[65ch] text-body text-muted">
        Sign in to send and copy from the shared board.
      </p>
      <div className="mt-l">
        <SignInForm />
      </div>
    </main>
  );
}
