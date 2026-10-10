"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IMAGE_TYPE_ERROR, draftFromFile } from "@/lib/clipboard";
import { sendDraft } from "@/lib/send-clip";
import { takeSharePayload, textFromShare } from "@/lib/share-payload";

let sending: Promise<string | null> | null = null;

export function ShareReceiver() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!sending) sending = deliverShare();
    void sending.then((error) => {
      if (!error) {
        sending = null;
        router.replace("/");
        router.refresh();
        return;
      }
      sending = null;
      setMessage(error);
    });
  }, [router]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[42rem] flex-col justify-center px-s-m py-l">
      <section className="theme-inverse rounded-[var(--radius-well)] border border-transparent bg-page p-l text-ink shadow-[var(--shadow-border)]">
        <h1 className="text-title font-semibold tracking-[-0.015em]">Shared clip</h1>
        <p className="mt-s text-body text-muted" role={message ? "alert" : undefined}>
          {message ?? "Sending to the board."}
        </p>
        {message ? (
          <p className="mt-l text-body">
            <Link href="/" className="underline">
              Back to the board
            </Link>
          </p>
        ) : null}
      </section>
    </main>
  );
}

async function deliverShare() {
  const payload = await takeSharePayload();
  if (!payload) return "Nothing was shared.";

  const text = textFromShare(payload);
  const hasFile = Boolean(payload.file && payload.file.size > 0);
  if (!text && !hasFile) return "Nothing was shared.";
  if (text) {
    const textError = await sendDraft({ kind: "text", text });
    if (textError) return clipErrorMessage(textError);
  }

  if (hasFile && payload.file) {
    const draft = await draftFromFile(payload.file);
    if ("error" in draft || draft.kind !== "image") {
      return clipErrorMessage("error" in draft ? draft.error : IMAGE_TYPE_ERROR);
    }
    try {
      const imageError = await sendDraft(draft);
      if (imageError) return clipErrorMessage(imageError);
    } finally {
      URL.revokeObjectURL(draft.previewUrl);
    }
  }

  return null;
}

function clipErrorMessage(error: string) {
  if (error === IMAGE_TYPE_ERROR || error === "Use PNG, JPEG, WebP, or GIF") {
    return "This browser cannot read that image. Use PNG, JPEG, WebP, or GIF.";
  }
  return error;
}
