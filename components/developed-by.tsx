import { Github } from "iconoir-react";

export function DevelopedBy() {
  return (
    <a
      href="https://github.com/chirix33/x-board"
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2xs text-caption text-muted underline-offset-2 hover:underline focus-visible:underline"
    >
      <Github aria-hidden width={16} height={16} />
      Developed by Ashraf
    </a>
  );
}
