import type { Metadata } from "next";
import Link from "next/link";
import { getBlogSeries } from "@/lib/source";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Longer write-ups on how Ledger works and why it's built the way it is.",
};

export default function BlogPage() {
  const series = getBlogSeries();

  return (
    <main className="flex flex-1 flex-col items-center px-4 py-20">
      <div className="w-full max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Blog</h1>
        <p className="mt-4 text-lg text-fd-muted-foreground">
          Longer write-ups on how Ledger works and why it's built the way it is.
        </p>

        <div className="mt-12 flex flex-col gap-4">
          {series.map((item) => (
            <Link
              key={item.url}
              href={item.url}
              className="rounded-xl border bg-fd-card p-5 transition-colors hover:bg-fd-accent/80"
            >
              <h2 className="font-semibold">{item.title}</h2>
              {item.description && (
                <p className="mt-2 text-sm text-fd-muted-foreground">
                  {item.description}
                </p>
              )}
              <p className="mt-3 text-xs text-fd-muted-foreground">
                {item.posts} {item.posts === 1 ? "post" : "posts"}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
