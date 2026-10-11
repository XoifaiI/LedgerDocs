"use client";

// The project the builder edits, plus saving it with the blocks between visits.

import { useCallback, useRef, useState } from "react";
import { exampleProject } from "@/lib/store-builder/example";
import { type Project, withDefaults } from "@/lib/store-builder/project";

export type Update = (change: (draft: Project) => void) => void;

const STORAGE_KEY = "ledger-store-builder:v2";

export type Saved = { project: Project; workspace: object };

export function readSaved(): Saved | null {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (saved?.project?.version === 2 && saved.workspace) {
      return {
        project: withDefaults(saved.project),
        workspace: saved.workspace,
      };
    }
  } catch {}
  return null;
}

export function writeSaved(saved: Saved): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {}
}

export function useProject(initial: () => Project = exampleProject) {
  const [project, setProject] = useState(initial);
  const projectRef = useRef(project);

  const update: Update = useCallback((change) => {
    const next = structuredClone(projectRef.current);
    change(next);
    projectRef.current = next;
    setProject(next);
  }, []);

  const replace = useCallback((next: Project) => {
    projectRef.current = next;
    setProject(next);
  }, []);

  return { project, projectRef, update, replace };
}
