// Where a problem is, in words: the hat a block sits under, or the sidebar section. Shared by the
// Problems list and the list at the top of a module that has problems.

import type { Blockly } from "../blockly";
import { CHECK_HAT, MIGRATION_HAT, OP_HAT } from "../blocks/contexts";
import type { Problem, SectionId } from "../problem";

export const SECTION_TITLES: Record<SectionId, string> = {
  store: "Store",
  data: "Data",
  balances: "Balances",
  totals: "Totals",
  quantities: "Quantities",
  players: "Players",
  timing: "Timing & testing",
};

export function placeOf(
  workspace: Blockly.Workspace | null,
  problem: Problem,
): string {
  if (problem.kind === "setting") {
    return SECTION_TITLES[problem.section];
  }
  const root = workspace?.getBlockById(problem.blockId)?.getRootBlock();
  switch (root?.type) {
    case OP_HAT:
      return `op ${root.getFieldValue("NAME")}`;
    case CHECK_HAT:
      return "Check";
    case MIGRATION_HAT:
      return `Migration ${root.getFieldValue("INDEX")}`;
    default:
      return "Block";
  }
}
