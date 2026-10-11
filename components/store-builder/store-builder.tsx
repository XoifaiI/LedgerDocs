"use client";

// The store builder: settings in the sidebar, logic as blocks, and the Stores module they make.

import { buttonVariants } from "fumadocs-ui/components/ui/button";
import { RotateCcw } from "lucide-react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/cn";
import { Blockly } from "@/lib/store-builder/blockly";
import { OP_HAT } from "@/lib/store-builder/blocks/contexts";
import { exampleProject } from "@/lib/store-builder/example";
import { generateStores } from "@/lib/store-builder/luau/module";
import { placeOf } from "@/lib/store-builder/luau/places";
import type {
  BlockProblem,
  Problem,
  SectionId,
} from "@/lib/store-builder/problem";
import { Canvas, loadExample } from "./canvas";
import { ProblemsByTarget } from "./controls";
import { LuauPanel } from "./luau-panel";
import { Sidebar } from "./sidebar";
import { readSaved, useProject, writeSaved } from "./use-project";
import "./store-builder.css";

type Tab = "store" | "blocks" | "luau";

const SECTIONS_KEY = "ledger-store-builder:sections";
const FIRST_OPEN: SectionId[] = ["store", "data"];

function readOpen(): Set<SectionId> {
  try {
    const saved = JSON.parse(localStorage.getItem(SECTIONS_KEY) ?? "null");
    if (Array.isArray(saved)) {
      return new Set(saved);
    }
  } catch {}
  return new Set(FIRST_OPEN);
}

function TabButton({
  active,
  onClick,
  className,
  children,
}: {
  active: boolean;
  onClick: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 border-b py-2 text-sm font-medium whitespace-nowrap transition-colors",
        active
          ? "border-fd-primary text-fd-primary"
          : "border-transparent text-fd-muted-foreground hover:text-fd-accent-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}

type Result = { code: string; problems: Problem[]; opKinds: string[] };

const NO_RESULT: Result = { code: "", problems: [], opKinds: [] };

// Saving waits for a pause in editing.
const SAVE_DELAY = 400;

function sameResult(a: Result, b: Result): boolean {
  return (
    a.code === b.code &&
    a.opKinds.join("\n") === b.opKinds.join("\n") &&
    JSON.stringify(a.problems) === JSON.stringify(b.problems)
  );
}

export function StoreBuilder() {
  const [saved] = useState(readSaved);
  const { project, projectRef, update, replace } = useProject(
    () => saved?.project ?? exampleProject(),
  );
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const [result, setResult] = useState<Result>(NO_RESULT);
  const [tab, setTab] = useState<Tab>("blocks");
  const [open, setOpen] = useState(readOpen);
  const [confirmReset, setConfirmReset] = useState(false);
  const frameRef = useRef(0);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  // Saves now if a save is waiting.
  const flush = useCallback(() => {
    if (saveTimerRef.current === undefined) {
      return;
    }
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = undefined;
    const workspace = workspaceRef.current;
    if (workspace) {
      writeSaved({
        project: projectRef.current,
        workspace: Blockly.serialization.workspaces.save(workspace),
      });
    }
  }, [projectRef]);

  const regenerate = useCallback(() => {
    frameRef.current = 0;
    const workspace = workspaceRef.current;
    if (!workspace) {
      return;
    }
    const next: Result = {
      ...generateStores(workspace, projectRef.current),
      opKinds: workspace
        .getBlocksByType(OP_HAT, false)
        .map((block) => block.getFieldValue("NAME") as string),
    };
    // Moving a block changes nothing here; keeping the old result spares a re-render.
    setResult((previous) => (sameResult(previous, next) ? previous : next));
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(flush, SAVE_DELAY);
  }, [projectRef, flush]);

  const schedule = useCallback(() => {
    if (!frameRef.current) {
      frameRef.current = requestAnimationFrame(regenerate);
    }
  }, [regenerate]);

  useEffect(() => {
    if (project) {
      schedule();
    }
  }, [project, schedule]);

  // Leaving the page saves what's waiting; leaving the builder also drops the queued frame.
  useEffect(() => {
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
      flush();
    };
  }, [flush]);

  // The canvas hands over its workspace when it's made, and takes it back just before it's
  // disposed, so a waiting save still reads it.
  const onReady = useCallback(
    (workspace: Blockly.WorkspaceSvg | null) => {
      if (!workspace) {
        flush();
      }
      workspaceRef.current = workspace;
      if (workspace) {
        schedule();
      }
    },
    [schedule, flush],
  );

  const onOpen = useCallback((id: SectionId, isOpen: boolean) => {
    setOpen((current) => {
      const next = new Set(current);
      if (isOpen) {
        next.add(id);
      } else {
        next.delete(id);
      }
      try {
        localStorage.setItem(SECTIONS_KEY, JSON.stringify([...next]));
      } catch {}
      return next;
    });
  }, []);

  const settingProblems = useMemo(
    () => result.problems.filter((problem) => problem.kind === "setting"),
    [result.problems],
  );
  const blockProblems = useMemo(
    () =>
      result.problems.filter(
        (problem): problem is BlockProblem => problem.kind === "block",
      ),
    [result.problems],
  );
  const byTarget = useMemo(() => {
    const map = new Map<string, string>();
    for (const problem of settingProblems) {
      if (!map.has(problem.target)) {
        map.set(problem.target, problem.message);
      }
    }
    return map;
  }, [settingProblems]);
  const sectionsWithProblems = useMemo(
    () => new Set(settingProblems.map((problem) => problem.section)),
    [settingProblems],
  );

  const placeOfProblem = useCallback(
    (problem: Problem) => placeOf(workspaceRef.current, problem),
    [],
  );

  const go = useCallback(
    (problem: Problem) => {
      if (problem.kind === "block") {
        setTab("blocks");
        requestAnimationFrame(() => {
          const workspace = workspaceRef.current;
          const block = workspace?.getBlockById(problem.blockId);
          if (workspace && block) {
            Blockly.svgResize(workspace);
            workspace.centerOnBlock(problem.blockId);
            Blockly.common.setSelected(block);
          }
        });
        return;
      }
      if (!window.matchMedia("(min-width: 768px)").matches) {
        setTab("store");
      }
      onOpen(problem.section, true);
      // After the section has opened.
      requestAnimationFrame(() => {
        const input = document.getElementById(problem.target);
        input?.scrollIntoView({ block: "center", behavior: "smooth" });
        input?.focus({ preventScroll: true });
      });
    },
    [onOpen],
  );

  const reset = () => {
    const workspace = workspaceRef.current;
    replace(exampleProject());
    if (workspace) {
      workspace.clear();
      loadExample(workspace);
    }
    setConfirmReset(false);
  };

  const problemCount = result.problems.length;
  const tabs = (
    <>
      <TabButton
        active={tab === "store"}
        onClick={() => setTab("store")}
        className="md:hidden"
      >
        Store
      </TabButton>
      <TabButton
        active={tab === "blocks"}
        onClick={() => setTab("blocks")}
        className={
          tab === "store"
            ? "md:border-fd-primary md:text-fd-primary"
            : undefined
        }
      >
        Blocks
      </TabButton>
      <TabButton active={tab === "luau"} onClick={() => setTab("luau")}>
        Luau
        {problemCount > 0 ? (
          <span className="rounded-full bg-amber-500/15 px-1.5 text-xs tabular-nums text-amber-700 dark:text-amber-300">
            {problemCount}
          </span>
        ) : null}
      </TabButton>
    </>
  );

  return (
    <div className="ledger-builder isolate flex h-[calc(100dvh-3.5rem)] min-h-[32rem] w-full md:gap-4 md:p-4">
      <aside
        aria-label="Store settings"
        className={cn(
          tab === "store" ? "flex" : "hidden",
          "w-full shrink-0 flex-col overflow-hidden bg-fd-card md:flex md:w-[22rem] md:rounded-xl md:border",
        )}
      >
        <div className="flex gap-3 border-b px-3 md:hidden" role="tablist">
          {tabs}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2 [scrollbar-width:thin]">
          <ProblemsByTarget.Provider value={byTarget}>
            <Sidebar
              project={project}
              update={update}
              opKinds={result.opKinds}
              open={open}
              onOpen={onOpen}
              sectionsWithProblems={sectionsWithProblems}
            />
          </ProblemsByTarget.Provider>
        </div>
      </aside>

      <section
        aria-label="Blocks and Luau"
        className={cn(
          tab === "store" ? "hidden" : "flex",
          "min-w-0 flex-1 flex-col overflow-hidden bg-fd-secondary md:flex md:rounded-xl md:border",
        )}
      >
        <div
          className="flex items-center gap-3 ps-3 pe-2 md:gap-3.5 md:ps-4"
          role="tablist"
        >
          {tabs}
          <div className="ms-auto flex items-center gap-2 py-1">
            {confirmReset ? (
              <>
                <span className="hidden text-xs text-fd-muted-foreground sm:inline">
                  Replace everything with the example?
                </span>
                <button
                  type="button"
                  className={buttonVariants({ color: "primary", size: "sm" })}
                  onClick={reset}
                >
                  Replace
                </button>
                <button
                  type="button"
                  className={buttonVariants({ color: "secondary", size: "sm" })}
                  onClick={() => setConfirmReset(false)}
                >
                  Keep mine
                </button>
              </>
            ) : (
              <button
                type="button"
                className={cn(
                  buttonVariants({ color: "secondary", size: "sm" }),
                  "[&_svg]:size-3.5",
                )}
                onClick={() => setConfirmReset(true)}
                aria-label="Load example"
              >
                <RotateCcw className="sm:hidden" />
                <span className="max-sm:hidden">Load example</span>
              </button>
            )}
          </div>
        </div>

        <Canvas
          projectRef={projectRef}
          project={project}
          initial={saved?.workspace ?? null}
          problems={blockProblems}
          onReady={onReady}
          onChange={schedule}
          hidden={tab === "luau"}
        />
        {tab === "luau" ? (
          <LuauPanel
            code={result.code}
            problems={result.problems}
            placeOf={placeOfProblem}
            onGo={go}
          />
        ) : null}
      </section>
    </div>
  );
}
