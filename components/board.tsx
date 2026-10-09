"use client";

import { useCallback, useEffect, useRef, useState, type ClipboardEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/button";
import { CopyButton } from "@/components/copy-button";
import type { ClipDto } from "@/lib/clips";
import { CLIP_LIST_LIMIT, POLL_INTERVAL_MS, truncateDisplayText } from "@/lib/constants";
import {
  copyImage,
  copyText,
  draftFromClipboardData,
  validateText,
  type Draft,
} from "@/lib/clipboard";

function formatRelative(iso: string) {
  const deltaSeconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (Math.abs(deltaSeconds) < 60) return formatter.format(-deltaSeconds, "second");
  const minutes = Math.round(deltaSeconds / 60);
  if (Math.abs(minutes) < 60) return formatter.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(-hours, "hour");
  return formatter.format(-Math.round(hours / 24), "day");
}

async function readError(response: Response) {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? "Something went wrong";
  } catch {
    return "Something went wrong";
  }
}

export function Board({ email, initialClips }: { email: string; initialClips: ClipDto[] }) {
  const router = useRouter();
  const wellRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [clips, setClips] = useState<ClipDto[]>(initialClips);
  const newestId = clips[0]?.id;

  const replaceDraft = useCallback((next: Draft | null) => {
    setDraft((current) => {
      if (current?.kind === "image") URL.revokeObjectURL(current.previewUrl);
      return next;
    });
  }, []);

  const applyClipboard = useCallback(
    (data: DataTransfer | null) => {
      const result = draftFromClipboardData(data);
      if (!result) {
        setError("Nothing to paste");
        return;
      }
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setError(null);
      replaceDraft(result);
    },
    [replaceDraft],
  );

  useEffect(() => {
    return () => {
      if (draft?.kind === "image") URL.revokeObjectURL(draft.previewUrl);
    };
  }, [draft]);

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return;
      }
      event.preventDefault();
      applyClipboard(event.clipboardData);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [applyClipboard]);

  const refresh = useCallback(async (after?: string) => {
    const response = await fetch(after ? `/api/clips?after=${after}` : "/api/clips");
    if (!response.ok) return;
    const data = (await response.json()) as { clips: ClipDto[]; replace: boolean };
    setClips((current) => {
      if (data.replace || !after) return data.clips;
      if (data.clips.length === 0) return current;
      const seen = new Set(data.clips.map((clip) => clip.id));
      return [...data.clips, ...current.filter((clip) => !seen.has(clip.id))].slice(
        0,
        CLIP_LIST_LIMIT,
      );
    });
  }, []);

  useEffect(() => {
    const tick = () => {
      if (document.hidden) return;
      void refresh(newestId);
    };
    const interval = window.setInterval(tick, POLL_INTERVAL_MS);
    const onVisibility = () => {
      if (!document.hidden) void refresh(newestId);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [newestId, refresh]);

  async function onPasteClick() {
    setError(null);
    try {
      if (navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imageType = item.types.find((type) => type.startsWith("image/"));
          if (imageType) {
            const blob = await item.getType(imageType);
            const file = new File([blob], "paste", { type: blob.type });
            applyClipboard(objectToDataTransfer(file));
            return;
          }
          if (item.types.includes("text/plain")) {
            const text = await (await item.getType("text/plain")).text();
            applyClipboard(textToDataTransfer(text));
            return;
          }
        }
      }
      const text = await navigator.clipboard.readText();
      applyClipboard(textToDataTransfer(text));
    } catch {
      setError("Use Ctrl+V to paste an image, or copy text and try again");
    }
  }

  async function onSend() {
    if (!draft || sending) return;
    setSending(true);
    setError(null);
    const id = crypto.randomUUID();
    try {
      if (draft.kind === "text") {
        const invalid = validateText(draft.text);
        if (invalid) {
          setError(invalid);
          return;
        }
        const response = await fetch("/api/clips", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, kind: "text", text: draft.text }),
        });
        if (!response.ok) {
          setError(await readError(response));
          return;
        }
      } else {
        const urlResponse = await fetch("/api/clips/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contentType: draft.file.type,
            byteSize: draft.file.size,
          }),
        });
        if (!urlResponse.ok) {
          setError(await readError(urlResponse));
          return;
        }
        const { objectKey, uploadUrl } = (await urlResponse.json()) as {
          objectKey: string;
          uploadUrl: string;
        };
        const uploaded = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": draft.file.type },
          body: draft.file,
        });
        if (!uploaded.ok) {
          setError("Could not upload the image");
          return;
        }
        const confirm = await fetch("/api/clips", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id,
            kind: "image",
            objectKey,
            contentType: draft.file.type,
            byteSize: draft.file.size,
          }),
        });
        if (!confirm.ok) {
          setError(await readError(confirm));
          return;
        }
      }
      replaceDraft(null);
      await refresh();
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[42rem] flex-col px-s-m py-l">
      <div className="theme-inverse flex flex-col rounded-[var(--radius-well)] border border-transparent bg-page p-l text-ink shadow-[var(--shadow-border)]">
        <div
          aria-hidden="true"
          className="mb-s h-1 w-12 rounded-full bg-brand"
        />
        <header className="flex flex-wrap items-center justify-between gap-s">
          <h1 className="text-title font-semibold tracking-[-0.015em] text-balance">
            X Board
          </h1>
          <div className="flex min-w-0 items-center gap-xs">
            <p className="truncate text-caption text-muted">{email}</p>
            <Button
              type="button"
              variant="ghost"
              onClick={async () => {
                await authClient.signOut();
                router.replace("/sign-in");
                router.refresh();
              }}
            >
              Sign out
            </Button>
          </div>
        </header>

      <section className="mt-l flex flex-col gap-s">
        <h2 className="text-section font-medium">Paste</h2>
        <div
          ref={wellRef}
          tabIndex={0}
          onDragOver={(event) => {
            event.preventDefault();
          }}
          onDrop={(event) => {
            event.preventDefault();
            applyClipboard(event.dataTransfer);
          }}
          className="flex min-h-40 flex-col justify-center rounded-[var(--radius-well)] border border-border bg-surface p-s"
        >
          {draft?.kind === "text" ? (
            <p
              className="max-w-[65ch] whitespace-pre-wrap break-words text-pretty text-body"
              onCopy={(event) => copyStoredText(event, draft.text)}
            >
              {truncateDisplayText(draft.text)}
            </p>
          ) : draft?.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={draft.previewUrl}
              alt="Pasted image ready to send"
              className="max-h-80 w-max max-w-full rounded-[6px] outline outline-offset-[-1px] outline-[var(--color-image-outline)]"
            />
          ) : (
            <p className="text-body text-muted">Ctrl+V to place text or an image.</p>
          )}
        </div>
        {error ? (
          <p className="text-body text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-xs">
          <Button type="button" variant="outline" onClick={() => void onPasteClick()}>
            Paste
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={!draft || sending}
            onClick={() => void onSend()}
          >
            {sending ? "Sending" : "Send"}
          </Button>
        </div>
      </section>

      <section className="mt-l flex flex-col gap-s">
        <h2 className="text-section font-medium">Board</h2>
        {clips.length === 0 ? (
          <p className="text-body text-muted">
            Nothing on the board yet. Send from the other machine, or paste above.
          </p>
        ) : (
          <ul className="flex flex-col">
            {clips.map((clip, index) => (
              <li
                key={clip.id}
                className={`flex items-start justify-between gap-s py-s ${
                  index === 0 ? "" : "border-t border-border"
                }`}
              >
                <div className="min-w-0 flex-1">
                  {clip.kind === "text" && clip.text ? (
                    <p
                      className="max-w-[65ch] whitespace-pre-wrap break-words text-pretty text-body"
                      onCopy={(event) => copyStoredText(event, clip.text)}
                    >
                      {truncateDisplayText(clip.text)}
                    </p>
                  ) : clip.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={clip.imageUrl}
                      alt="Shared clip"
                      className="max-h-64 w-max max-w-full rounded-[6px] outline outline-offset-[-1px] outline-[var(--color-image-outline)]"
                    />
                  ) : null}
                  <p className="mt-2xs text-caption text-muted tabular-nums">
                    {formatRelative(clip.createdAt)} · {clip.createdByEmail}
                  </p>
                </div>
                <CopyButton
                  onCopy={async () => {
                    if (clip.kind === "text" && clip.text) {
                      await copyText(clip.text);
                      return;
                    }
                    if (clip.kind === "image") {
                      await copyImage(`/api/clips/${clip.id}/file`);
                    }
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
      </div>
    </div>
  );
}

function copyStoredText(event: ClipboardEvent<HTMLParagraphElement>, text: string) {
  event.preventDefault();
  event.clipboardData.setData("text/plain", text);
}

function textToDataTransfer(text: string) {
  const data = new DataTransfer();
  data.setData("text/plain", text);
  return data;
}

function objectToDataTransfer(file: File) {
  const data = new DataTransfer();
  data.items.add(file);
  return data;
}
