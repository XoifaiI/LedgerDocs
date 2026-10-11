"use client";

// The block canvas: injects Blockly, keeps it the page's colours, follows the project's fields,
// and shows each block's problems on the block itself.

import { buttonVariants } from "fumadocs-ui/components/ui/button";
import { LayoutGrid, Maximize, Minus, Plus } from "lucide-react";
import { memo, type RefObject, useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { arrange } from "@/lib/store-builder/arrange";
import { Blockly } from "@/lib/store-builder/blockly";
import { OP_READS } from "@/lib/store-builder/blocks/contexts";
import { CHECKER } from "@/lib/store-builder/checker";
import { exampleWorkspace } from "@/lib/store-builder/example";
import {
  enclosingOp,
  FieldLedger,
  NOTHING_PICKED,
  paramsOf,
  readProjectFrom,
} from "@/lib/store-builder/fields/ledger-field";
import type { BlockProblem } from "@/lib/store-builder/problem";
import type { Project } from "@/lib/store-builder/project";
import { registerAll } from "@/lib/store-builder/register";
import {
  type Mode,
  type PageColours,
  themeFor,
} from "@/lib/store-builder/theme";
import {
  CHANGES_CATEGORY,
  changesFlyout,
  DATA_CATEGORY,
  dataFlyout,
  TOOLBOX,
} from "@/lib/store-builder/toolbox";

// How long field-name redraws wait for typing to pause.
const REDRAW_DELAY = 150;

// Fumadocs' colours as hex: a canvas reads any CSS colour and writes it back as #rrggbb.
function readPage(): PageColours {
  const style = getComputedStyle(document.documentElement);
  const context = document.createElement("canvas").getContext("2d");
  const hex = (name: string) => {
    const value = style.getPropertyValue(name).trim();
    if (!context || !value) {
      return "#808080";
    }
    context.fillStyle = "#000000";
    context.fillStyle = value;
    return context.fillStyle;
  };
  return {
    background: hex("--color-fd-background"),
    card: hex("--color-fd-card"),
    foreground: hex("--color-fd-foreground"),
    mutedForeground: hex("--color-fd-muted-foreground"),
    primary: hex("--color-fd-primary"),
    fontFamily: getComputedStyle(document.body).fontFamily,
  };
}

function pageMode(): Mode {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

// Loads the example and spreads its hats out.
export function loadExample(workspace: Blockly.WorkspaceSvg): void {
  Blockly.serialization.workspaces.load(exampleWorkspace(), workspace);
  arrange(workspace);
}

// Renaming a param renames the op-field blocks in its op that read it.
function followParamRename(
  event: Blockly.Events.Abstract,
  workspace: Blockly.Workspace,
) {
  if (!(event instanceof Blockly.Events.BlockChange)) {
    return;
  }
  if (event.element !== "field" || event.name !== "NAME" || !event.blockId) {
    return;
  }
  const param = workspace.getBlockById(event.blockId);
  const op = param?.type === "ledger_param" ? enclosingOp(param) : null;
  if (!op || typeof event.oldValue !== "string") {
    return;
  }
  for (const block of op.getDescendants(false)) {
    if (
      OP_READS[block.type] &&
      block.getFieldValue("PARAM") === event.oldValue
    ) {
      Blockly.Events.setGroup(event.group);
      block.setFieldValue(String(event.newValue), "PARAM");
      Blockly.Events.setGroup(false);
    }
  }
}

// An op-field block dropped into an op reads that op's first param of its type.
function pickParam(
  event: Blockly.Events.Abstract,
  workspace: Blockly.Workspace,
) {
  if (!(event instanceof Blockly.Events.BlockMove) || !event.blockId) {
    return;
  }
  const moved = workspace.getBlockById(event.blockId);
  for (const block of moved?.getDescendants(false) ?? []) {
    const type = OP_READS[block.type];
    if (!type || block.getFieldValue("PARAM") !== NOTHING_PICKED) {
      continue;
    }
    const op = enclosingOp(block);
    const param =
      op && paramsOf(op).find((candidate) => candidate.type === type);
    if (param) {
      Blockly.Events.setGroup(event.group);
      block.setFieldValue(param.name, "PARAM");
      Blockly.Events.setGroup(false);
    }
  }
}

function CanvasView({
  projectRef,
  project,
  initial,
  problems,
  onReady,
  onChange,
  hidden,
}: {
  projectRef: RefObject<Project>;
  project: Project;
  initial: object | null;
  problems: BlockProblem[];
  onReady: (workspace: Blockly.WorkspaceSvg | null) => void;
  onChange: () => void;
  hidden: boolean;
}) {
  const areaRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const warningsRef = useRef(new Map<string, string>());
  // Each field's name and type as last drawn, by uid.
  const fieldsRef = useRef(new Map<string, string>());
  // Fields changed since the last redraw, and the timer for the next one.
  const staleFieldsRef = useRef(new Set<string>());
  const redrawTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  // The first render's inputs; the canvas is made once.
  const startRef = useRef({ initial, onReady, onChange });

  useEffect(() => {
    let disposed = false;
    const cleanups: (() => void)[] = [];
    const {
      initial: saved,
      onReady: ready,
      onChange: changed,
    } = startRef.current;

    // Blockly measures text once, so wait for the page's font.
    document.fonts.ready.then(() => {
      const host = hostRef.current;
      const area = areaRef.current;
      if (disposed || !host || !area) {
        return;
      }
      registerAll();
      readProjectFrom(() => projectRef.current);

      let mode = pageMode();
      const workspace = Blockly.inject(host, {
        toolbox: TOOLBOX,
        renderer: "zelos",
        theme: themeFor(mode, readPage),
        plugins: { connectionChecker: CHECKER },
        sounds: false,
        trashcan: false,
        zoom: { wheel: true, startScale: 0.75, maxScale: 1.6, minScale: 0.35 },
        grid: {
          spacing: 24,
          length: 2,
          colour: "rgba(127, 127, 127, 0.3)",
          snap: true,
        },
        move: { scrollbars: true, drag: true, wheel: false },
      });
      workspaceRef.current = workspace;
      workspace.registerToolboxCategoryCallback(CHANGES_CATEGORY, () =>
        changesFlyout(projectRef.current),
      );
      workspace.registerToolboxCategoryCallback(DATA_CATEGORY, () =>
        dataFlyout(projectRef.current),
      );
      workspace.addChangeListener(Blockly.Events.disableOrphans);

      let loaded = false;
      if (saved) {
        try {
          Blockly.serialization.workspaces.load(saved, workspace);
          loaded = true;
        } catch {
          workspace.clear();
        }
      }
      if (!loaded) {
        loadExample(workspace);
      }

      workspace.addChangeListener((event) => {
        if (event.isUiEvent) {
          return;
        }
        followParamRename(event, workspace);
        pickParam(event, workspace);
        changed();
      });

      const resize = new ResizeObserver(() => Blockly.svgResize(workspace));
      resize.observe(area);
      const root = document.documentElement;
      const themeWatch = new MutationObserver(() => {
        if (pageMode() !== mode) {
          mode = pageMode();
          workspace.setTheme(themeFor(mode, readPage));
        }
      });
      themeWatch.observe(root, {
        attributes: true,
        attributeFilter: ["class"],
      });
      cleanups.push(
        () => resize.disconnect(),
        () => themeWatch.disconnect(),
        // Hand the workspace back while it can still be saved, then dispose of it.
        () => ready(null),
        () => workspace.dispose(),
        // Blockly 13 reuses one widget div across injects but adds a keydown listener to it on
        // every inject, so each visit would leave one more. Removing it makes the next inject
        // build a fresh one, and lets the old one and its listeners go.
        () => document.querySelector(".blocklyWidgetDiv")?.remove(),
      );
      ready(workspace);
    });

    return () => {
      disposed = true;
      for (const cleanup of cleanups) {
        cleanup();
      }
      workspaceRef.current = null;
      warningsRef.current.clear();
      fieldsRef.current.clear();
      // The menus read the project through this; let the old one go.
      readProjectFrom(() => null);
    };
  }, [projectRef]);

  // Blocks show field names from the project. When a field is renamed, retyped, added or
  // removed, redraw the blocks that point at it, and the open palette. Typing a name changes it
  // on every key, and a big store can have hundreds of blocks using it, so the redraw waits for
  // a pause in typing.
  useEffect(() => {
    const previous = fieldsRef.current;
    const next = new Map(
      project.fields.map((field) => [
        field.uid,
        `${field.name}\n${field.type}`,
      ]),
    );
    fieldsRef.current = next;
    if (!workspaceRef.current) {
      return;
    }
    for (const uid of new Set([...previous.keys(), ...next.keys()])) {
      if (previous.get(uid) !== next.get(uid)) {
        staleFieldsRef.current.add(uid);
      }
    }
    if (staleFieldsRef.current.size === 0) {
      return;
    }
    clearTimeout(redrawTimerRef.current);
    redrawTimerRef.current = setTimeout(() => {
      const workspace = workspaceRef.current;
      const stale = staleFieldsRef.current;
      staleFieldsRef.current = new Set();
      if (!workspace) {
        return;
      }
      for (const block of workspace.getAllBlocks(false)) {
        for (const input of block.inputList) {
          for (const field of input.fieldRow) {
            if (
              field instanceof FieldLedger &&
              stale.has(field.getValue() ?? "")
            ) {
              field.forceRerender();
            }
          }
        }
      }
      workspace.refreshToolboxSelection();
    }, REDRAW_DELAY);
  }, [project]);

  useEffect(() => () => clearTimeout(redrawTimerRef.current), []);

  // Each block's problems, as the warning icon Blockly puts on a block.
  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) {
      return;
    }
    const next = new Map<string, string>();
    for (const problem of problems) {
      const text = next.get(problem.blockId);
      next.set(
        problem.blockId,
        text ? `${text}\n${problem.message}` : problem.message,
      );
    }
    const previous = warningsRef.current;
    Blockly.Events.disable();
    try {
      for (const id of new Set([...previous.keys(), ...next.keys()])) {
        if (previous.get(id) === next.get(id)) {
          continue;
        }
        workspace
          .getBlockById(id)
          ?.setWarningText(next.get(id) ?? null, "ledger");
      }
    } finally {
      Blockly.Events.enable();
    }
    warningsRef.current = next;
  }, [problems]);

  const toolButton = cn(
    buttonVariants({ color: "ghost", size: "icon-sm" }),
    "text-fd-muted-foreground",
  );
  const tools: [string, () => void, typeof Plus][] = [
    ["Zoom out", () => workspaceRef.current?.zoomCenter(-1), Minus],
    ["Zoom in", () => workspaceRef.current?.zoomCenter(1), Plus],
    ["Fit to view", () => workspaceRef.current?.zoomToFit(), Maximize],
    [
      "Tidy up",
      () => {
        if (workspaceRef.current) {
          arrange(workspaceRef.current);
        }
      },
      LayoutGrid,
    ],
  ];

  return (
    <div
      ref={areaRef}
      className={cn(
        "relative min-h-0 flex-1 overflow-hidden rounded-xl bg-fd-background",
        hidden && "hidden",
      )}
    >
      <div ref={hostRef} className="absolute inset-0" />
      <div className="absolute end-5 bottom-5 z-[80] flex gap-0.5 rounded-lg border bg-fd-card/80 p-0.5 shadow-sm backdrop-blur">
        {tools.map(([label, run, Icon]) => (
          <button
            key={label}
            type="button"
            aria-label={label}
            title={label}
            onClick={run}
            className={toolButton}
          >
            <Icon />
          </button>
        ))}
      </div>
    </div>
  );
}

export const Canvas = memo(CanvasView);
