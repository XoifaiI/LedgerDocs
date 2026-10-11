"use client";

// One collapsible part of the sidebar, built like a folder in the Fumadocs docs sidebar.

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "fumadocs-ui/components/ui/collapsible";
import { ChevronDown, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { SectionId } from "@/lib/store-builder/problem";

export function Section({
  id,
  title,
  icon: Icon,
  count,
  hasProblem,
  open,
  onOpen,
  children,
}: {
  id: SectionId;
  title: string;
  icon: LucideIcon;
  count?: number;
  hasProblem: boolean;
  open: boolean;
  onOpen: (id: SectionId, open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <Collapsible open={open} onOpenChange={(next) => onOpen(id, next)}>
      <CollapsibleTrigger
        className={cn(
          "flex w-full items-center gap-2 rounded-lg p-2 text-start text-sm font-medium transition-colors hover:bg-fd-accent/50 hover:text-fd-accent-foreground [&_svg]:size-4 [&_svg]:shrink-0",
          open ? "text-fd-foreground" : "text-fd-muted-foreground",
        )}
      >
        <Icon />
        <span className="flex-1">{title}</span>
        {hasProblem ? (
          <span
            role="img"
            aria-label="Has a problem"
            className="size-1.5 rounded-full bg-amber-500"
          />
        ) : null}
        {count !== undefined ? (
          <span className="text-xs tabular-nums text-fd-muted-foreground">
            {count}
          </span>
        ) : null}
        <ChevronDown
          className={cn(
            "text-fd-muted-foreground transition-transform",
            !open && "-rotate-90",
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-col gap-3 px-2 pt-1 pb-5">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
