// Problems with where blocks sit and what they're called, found without making any code. Works on a
// headless workspace too, so the Node checks see the same problems as the page.

import type { Blockly } from "../blockly";
import {
  ADD_STEPS,
  BREAKING_STEPS,
  HAT_TYPES,
  type HatType,
  LOOP_READS,
  MIGRATION_HAT,
  ONLY_IN,
  OP_HAT,
  placeText,
} from "../blocks/contexts";
import { paramsOf } from "../fields/ledger-field";
import { nameProblem } from "../luau-names";
import type { BlockProblem } from "../problem";
import { balanceKinds, type Project } from "../project";
import { kindProblem } from "../validate";
import { nearestAround } from "./flow";

export function migrationIndex(block: Blockly.Block): number {
  return Number(block.getFieldValue("INDEX")) || 0;
}

export function blockProblems(
  workspace: Blockly.Workspace,
  project: Project,
): BlockProblem[] {
  const problems: BlockProblem[] = [];
  const add = (block: Blockly.Block, message: string) =>
    problems.push({ kind: "block", blockId: block.id, message });

  for (const block of workspace.getAllBlocks(false)) {
    const root = block.getRootBlock();
    // A loose block does nothing; the canvas greys it out.
    if (!block.isEnabled() || !HAT_TYPES.includes(root.type)) {
      continue;
    }
    const places = ONLY_IN[block.type];
    if (places && !places.includes(root.type as HatType)) {
      add(block, `This only works inside ${placeText(places)}.`);
    }
    const loops = LOOP_READS[block.type];
    if (loops && !nearestAround(block, loops)) {
      add(block, "Put this inside a for each that has it.");
    }
  }

  const balanceKindNames = new Set(
    balanceKinds(project).map((entry) => entry.kind.kind),
  );
  const opNames = new Set<string>();
  for (const op of workspace.getBlocksByType(OP_HAT, true)) {
    const name: string = op.getFieldValue("NAME");
    const problem = kindProblem(name);
    if (problem) {
      add(op, problem);
    } else if (opNames.has(name)) {
      add(op, `Another op is called ${name}.`);
    } else if (balanceKindNames.has(name)) {
      add(
        op,
        `${name} is a balance kind, and Ledger applies those itself. Rename this op.`,
      );
    }
    opNames.add(name);

    const params = new Set<string>();
    for (const param of paramsOf(op)) {
      const paramProblem =
        param.name === "Kind"
          ? "Kind is taken: every op uses it for its kind."
          : nameProblem(param.name, "param");
      if (paramProblem) {
        add(param.block, paramProblem);
      } else if (params.has(param.name)) {
        add(param.block, `This op already takes ${param.name}.`);
      }
      params.add(param.name);
    }
  }

  const migrations = workspace.getBlocksByType(MIGRATION_HAT, true);
  const indexes = new Set<number>();
  for (const migration of migrations) {
    const index = migrationIndex(migration);
    if (indexes.has(index)) {
      add(migration, `Two migrations are number ${index}.`);
    }
    indexes.add(index);

    let adds = false;
    let breaking = false;
    for (
      let step = migration.getInputTargetBlock("DO");
      step;
      step = step.getNextBlock()
    ) {
      if (step.isEnabled()) {
        adds ||= ADD_STEPS.includes(step.type);
        breaking ||= BREAKING_STEPS.includes(step.type);
      }
    }
    if (adds && breaking) {
      add(
        migration,
        "New fields and other changes go in separate migrations. Ledger runs them differently.",
      );
    }
  }
  for (let index = 1; index <= migrations.length; index++) {
    if (!indexes.has(index)) {
      add(
        migrations[migrations.length - 1],
        `There's no migration ${index}. Number them 1, 2, 3 with no gaps.`,
      );
      break;
    }
  }

  return problems;
}
