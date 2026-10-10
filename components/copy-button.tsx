"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/button";

export function CopyButton({
  onCopy,
  label = "Copy",
}: {
  onCopy: () => Promise<void>;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  return (
    <div className="flex flex-col items-end gap-3xs">
      <Button
        type="button"
        variant={copied ? "brand" : "outline"}
        aria-label={copied ? "Copied" : label}
        onClick={async () => {
          setError(null);
          try {
            await onCopy();
            setCopied(true);
          } catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") return;
            setError("Could not copy");
          }
        }}
      >
        <span className="relative inline-flex size-4">
          <Copy
            aria-hidden
            className={`absolute inset-0 size-4 transition-[opacity,filter,transform] duration-300 [transition-timing-function:cubic-bezier(0.2,0,0,1)] ${
              copied ? "scale-50 opacity-0 blur-[4px]" : "scale-100 opacity-100 blur-0"
            }`}
            strokeWidth={1.5}
          />
          <Check
            aria-hidden
            className={`absolute inset-0 size-4 transition-[opacity,filter,transform] duration-300 [transition-timing-function:cubic-bezier(0.2,0,0,1)] ${
              copied ? "scale-100 opacity-100 blur-0" : "scale-50 opacity-0 blur-[4px]"
            }`}
            strokeWidth={1.5}
          />
        </span>
        {copied ? "Copied" : label}
      </Button>
      {error ? (
        <p className="text-caption text-danger" role="status">
          {error}
        </p>
      ) : null}
    </div>
  );
}
