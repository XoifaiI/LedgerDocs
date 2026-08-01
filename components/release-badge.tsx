"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const KEY = "ledger-seen-release";

function read(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function write(version: string) {
  try {
    window.localStorage.setItem(KEY, version);
  } catch {
    // private mode, or storage is full. the badge is a nicety, so let it go
  }
}

/**
 * How many releases have shipped since the reader last opened the page.
 *
 * Only opening the page records a version, so a reader who has never been there
 * is not marked as having read anything. Until then there is no count, since
 * every release predates them and none of it is news.
 */
export function ReleaseBadge({ versions }: { versions: string[] }) {
  const [unread, setUnread] = useState(0);
  const pathname = usePathname();
  const newest = versions[0];
  const onPage = pathname?.replace(/\/$/, "").endsWith("/docs/releases");

  useEffect(() => {
    if (newest === undefined) {
      return;
    }

    if (onPage) {
      write(newest);
      setUnread(0);
      return;
    }

    const seen = read();
    if (seen === null || !versions.includes(seen)) {
      setUnread(0);
      return;
    }

    setUnread(versions.indexOf(seen));
  }, [newest, onPage, versions]);

  if (unread === 0) {
    return null;
  }

  return (
    <span
      title={`${unread} release${unread === 1 ? "" : "s"} since you last looked`}
      className="ms-auto inline-flex min-w-5 items-center justify-center rounded-full bg-fd-primary px-1.5 text-xs font-medium leading-5 text-fd-primary-foreground"
    >
      {unread}
    </span>
  );
}
