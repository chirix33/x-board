"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent as ReactClipboardEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/button";
import { DevelopedBy } from "@/components/developed-by";
import { CopyButton } from "@/components/copy-button";
import type { ClipDto } from "@/lib/clips";
import { CLIP_LIST_LIMIT, POLL_INTERVAL_MS, truncateDisplayText } from "@/lib/constants";
import {
  IMAGE_TYPE_ERROR,
  copyImage,
  copyOrShareText,
  copyText,
  draftFromClipboardData,
  draftFromFile,
  presentImage,
  type Draft,
} from "@/lib/clipboard";
import { sendDraft } from "@/lib/send-clip";

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

export function Board({
  email,
  initialClips,
  phone,
}: {
  email: string;
  initialClips: ClipDto[];
  phone: boolean;
}) {
  const router = useRouter();
  const wellRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<ReactNode>(null);
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
    async (data: DataTransfer | null) => {
      const result = await draftFromClipboardData(data);
      if (!result) {
        setError("Nothing to paste");
        return;
      }
      if ("error" in result) {
        setError(formatBoardError(result.error));
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
    const onPaste = (event: globalThis.ClipboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return;
      }
      event.preventDefault();
      void applyClipboard(event.clipboardData);
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
            void applyClipboard(objectToDataTransfer(file));
            return;
          }
          if (item.types.includes("text/plain")) {
            const text = await (await item.getType("text/plain")).text();
            void applyClipboard(textToDataTransfer(text));
            return;
          }
        }
      }
      const text = await navigator.clipboard.readText();
      void applyClipboard(textToDataTransfer(text));
    } catch {
      setError(
        <>
          This browser cannot read the clipboard from a button. Paste with{" "}
          <strong>Ctrl+V</strong> or <strong>⌘V</strong> instead.
        </>,
      );
    }
  }

  async function onSend() {
    if (!draft || sending) return;
    setSending(true);
    setError(null);
    try {
      const invalid = await sendDraft(draft);
      if (invalid) {
        setError(formatBoardError(invalid));
        return;
      }
      replaceDraft(null);
      await refresh();
    } finally {
      setSending(false);
    }
  }

  async function onPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const result = await draftFromFile(file);
    if ("error" in result) {
      setError(formatBoardError(result.error));
      return;
    }
    setError(null);
    replaceDraft(result);
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
            void applyClipboard(event.dataTransfer);
          }}
          className="flex min-h-40 flex-col justify-center rounded-[var(--radius-well)] border border-border bg-surface p-s"
        >
          {draft?.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={draft.previewUrl}
              alt="Pasted image ready to send"
              className="max-h-80 w-max max-w-full rounded-[6px] outline outline-offset-[-1px] outline-[var(--color-image-outline)]"
            />
          ) : phone ? (
            <textarea
              value={draft?.kind === "text" ? draft.text : ""}
              placeholder="Paste text here."
              rows={6}
              onChange={(event) => {
                const text = event.target.value;
                if (!text) {
                  replaceDraft(null);
                  return;
                }
                replaceDraft({ kind: "text", text });
              }}
              onPaste={(event) => {
                if (!pasteHasImage(event.clipboardData)) return;
                event.preventDefault();
                void applyClipboard(event.clipboardData);
              }}
              className="min-h-40 w-full resize-none bg-transparent text-body text-ink outline-none placeholder:text-muted"
            />
          ) : draft?.kind === "text" ? (
            <p
              className="max-w-[65ch] whitespace-pre-wrap break-words text-pretty text-body"
              onCopy={(event) => copyStoredText(event, draft.text)}
            >
              {truncateDisplayText(draft.text)}
            </p>
          ) : (
            <p className="text-body text-muted">
              Paste with <strong>Ctrl+V</strong> or <strong>⌘V</strong>.
            </p>
          )}
        </div>
        {error ? (
          <p className="text-body text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-xs">
          {phone ? (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => void onPhoto(event)}
              />
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                Choose photo
              </Button>
            </>
          ) : (
            <Button type="button" variant="outline" onClick={() => void onPasteClick()}>
              Paste
            </Button>
          )}
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
            Nothing on the board yet. <strong>Send</strong> from the other machine, or paste above.
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
                      onCopy={(event) => {
                        const text = clip.text;
                        if (text) copyStoredText(event, text);
                      }}
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
                      if (phone) await copyOrShareText(clip.text);
                      else await copyText(clip.text);
                      return;
                    }
                    if (clip.kind === "image") {
                      if (phone) await presentImage(`/api/clips/${clip.id}/file`);
                      else await copyImage(`/api/clips/${clip.id}/file`);
                    }
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
      </div>
      <div className="mt-auto flex justify-center pt-l">
        <DevelopedBy />
      </div>
    </div>
  );
}

function formatBoardError(message: string): ReactNode {
  if (message === IMAGE_TYPE_ERROR || message === "Use PNG, JPEG, WebP, or GIF") {
    return (
      <>
        This browser cannot read that image. Use <strong>PNG</strong>, <strong>JPEG</strong>,{" "}
        <strong>WebP</strong>, or <strong>GIF</strong>.
      </>
    );
  }
  const sizeMatch = message.match(/^(Text|Image) is (.+); the limit is (.+)$/);
  if (sizeMatch) {
    return (
      <>
        {sizeMatch[1]} is {sizeMatch[2]}; the limit is <strong>{sizeMatch[3]}</strong>.
      </>
    );
  }
  return message;
}

function copyStoredText(event: ReactClipboardEvent<HTMLParagraphElement>, text: string) {
  event.preventDefault();
  event.clipboardData.setData("text/plain", text);
}

function pasteHasImage(data: DataTransfer | null) {
  if (!data) return false;
  if ([...data.items].some((item) => item.type.startsWith("image/"))) return true;
  return [...data.files].some((file) => !file.type || file.type.startsWith("image/"));
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
