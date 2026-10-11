"use client";

// The Luau tab: what to fix, each one a link to its block or input, then the module itself.

import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import { buttonVariants } from "fumadocs-ui/components/ui/button";
import {
  Blocks,
  Download,
  SlidersHorizontal,
  TriangleAlert,
} from "lucide-react";
import { type ComponentProps, memo, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import type { Problem, SectionId } from "@/lib/store-builder/problem";

export const SECTION_TITLES: Record<SectionId, string> = {
  store: "Store",
  data: "Data",
  balances: "Balances",
  totals: "Totals",
  quantities: "Quantities",
  players: "Players",
  timing: "Timing & testing",
};

export type ProblemPlace = (problem: Problem) => string;

function DownloadButton({ code }: { code: string }) {
  return (
    <button
      type="button"
      aria-label="Download Stores.luau"
      title="Download Stores.luau"
      className={cn(
        buttonVariants({ color: "ghost", size: "icon-xs" }),
        "[&_svg]:size-3.5",
      )}
      onClick={() => {
        const url = URL.createObjectURL(
          new Blob([code], { type: "text/plain" }),
        );
        const link = document.createElement("a");
        link.href = url;
        link.download = "Stores.luau";
        link.click();
        // Once the download has its copy.
        setTimeout(() => URL.revokeObjectURL(url));
      }}
    >
      <Download />
    </button>
  );
}

// Highlighting a big module takes a while, so the code shown catches up once edits pause.
const SETTLE_DELAY = 150;

function useSettled(value: string): string {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    if (value === settled) {
      return;
    }
    const timer = setTimeout(() => setSettled(value), SETTLE_DELAY);
    return () => clearTimeout(timer);
  }, [value, settled]);
  return settled;
}

function LuauPanelView({
  code,
  problems,
  placeOf,
  onGo,
}: {
  code: string;
  problems: Problem[];
  placeOf: ProblemPlace;
  onGo: (problem: Problem) => void;
}) {
  const shown = useSettled(code);
  const codeblock = useMemo(
    () => ({
      title: "Stores.luau",
      className: "my-0 flex min-h-0 flex-1 flex-col",
      viewportProps: { className: "max-h-none! min-h-0 flex-1" },
      Actions: ({ className, children }: ComponentProps<"div">) => (
        <div className={cn("flex items-center gap-0.5", className)}>
          <DownloadButton code={shown} />
          {children}
        </div>
      ),
    }),
    [shown],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 rounded-xl bg-fd-background p-3 sm:p-4">
      {problems.length > 0 ? (
        <div className="flex max-h-56 shrink-0 flex-col overflow-hidden rounded-xl border bg-fd-card">
          <p className="flex items-center gap-2 border-b px-3 py-2 text-sm font-medium [&_svg]:size-4 [&_svg]:text-amber-500">
            <TriangleAlert />
            {problems.length === 1
              ? "1 thing to fix"
              : `${problems.length} things to fix`}
            <span className="font-normal text-fd-muted-foreground">
              before you use this
            </span>
          </p>
          <ul className="overflow-y-auto p-1">
            {problems.map((problem, index) => {
              const Icon =
                problem.kind === "block" ? Blocks : SlidersHorizontal;
              return (
                // Problems have no ids, and the same message can show twice.
                // biome-ignore lint/suspicious/noArrayIndexKey: the list is rebuilt whole each time
                <li key={index}>
                  <button
                    type="button"
                    onClick={() => onGo(problem)}
                    className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-start text-sm transition-colors hover:bg-fd-accent [&_svg]:mt-0.5 [&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:text-fd-muted-foreground"
                  >
                    <Icon />
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{placeOf(problem)}</span>
                      <span className="text-fd-muted-foreground">
                        {" "}
                        · {problem.message}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      <DynamicCodeBlock lang="luau" code={shown} codeblock={codeblock} />
    </div>
  );
}

export const LuauPanel = memo(LuauPanelView);
