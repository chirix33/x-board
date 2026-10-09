import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "outline" | "ghost" | "brand";

const variants: Record<Variant, string> = {
  primary:
    "border-transparent bg-accent text-on-accent hover:bg-accent-hover",
  outline:
    "border-border bg-transparent text-ink hover:bg-surface",
  ghost:
    "border-transparent bg-transparent text-ink hover:bg-surface",
  brand:
    "border-transparent bg-brand text-on-brand hover:bg-brand-hover",
};

export function Button({
  variant = "outline",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-2xs border border-solid px-s text-body font-medium [text-box:trim-both_cap_alphabetic] transition-[scale,opacity,background-color,color,border-color] duration-150 ease-out enabled:active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:enabled:active:scale-100 rounded-[var(--radius-control)] ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
