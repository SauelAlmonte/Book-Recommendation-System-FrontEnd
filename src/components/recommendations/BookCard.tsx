import Image from "next/image";
import type { ReactElement } from "react";

import { cn } from "@/lib/cn";
import type { Book } from "@/types/book";

type BookCardProps = {
  book: Book;
  className?: string;
  onClick?: () => void;
};

function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function BookCard({ book, className, onClick }: BookCardProps): ReactElement {
  const showImage = isSafeHttpUrl(book.thumbnail_url);

  return (
    <article className={cn("h-full", className)}>
      <button
        type="button"
        onClick={onClick}
        className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-stone-200 bg-card text-left shadow-sm transition hover:border-stone-400 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:border-stone-800 dark:hover:border-stone-600"
      >
        <div className="relative h-[clamp(10rem,18vw,14rem)] w-full bg-stone-100 dark:bg-stone-900">
          {showImage ? (
            <Image
              src={book.thumbnail_url}
              alt={`Cover image for ${book.title}`}
              fill
              className="object-contain p-1"
              sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw"
              unoptimized
            />
          ) : (
            <p className="flex h-full w-full items-center justify-center px-3 text-center text-xs text-muted">
              Cover unavailable
            </p>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1 p-2.5 sm:p-3">
          <h3 className="line-clamp-1 text-xs font-semibold leading-snug text-foreground sm:line-clamp-2 sm:text-sm">
            {book.title}
          </h3>
          <p className="line-clamp-1 text-xs text-muted">{book.authors}</p>
          {book.isbn13 !== null ? (
            <p className="text-[10px] font-mono text-muted sm:text-xs">ISBN-13: {String(book.isbn13)}</p>
          ) : null}
          <p className="line-clamp-1 text-[11px] leading-relaxed text-foreground/90 sm:line-clamp-2 sm:text-xs">
            {book.description_preview}
          </p>
        </div>
      </button>
    </article>
  );
}
