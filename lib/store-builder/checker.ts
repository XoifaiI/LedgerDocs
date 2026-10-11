// Stops a drag that would put a block where it can't work: a change inside a check, a must inside
// an op, a loop's count outside that loop. It only judges drags, never loading, so a saved
// workspace always opens and luau/problems.ts reports anything out of place.

import { Blockly } from "./blockly";
import {
  HAT_TYPES,
  type HatType,
  LOOP_READS,
  ONLY_IN,
} from "./blocks/contexts";
import { nearestAround } from "./luau/flow";

export const CHECKER = "ledger";

// The blocks that would sit around a block dropped on connection b, innermost first.
function aroundDrop(b: Blockly.Connection): Blockly.Block[] {
  const target = b.getSourceBlock();
  const isInput = target.inputList.some((input) => input.connection === b);
  const around: Blockly.Block[] = [];
  for (
    let block = isInput ? target : target.getSurroundParent();
    block;
    block = block.getSurroundParent()
  ) {
    around.push(block);
  }
  return around;
}

export class LedgerChecker extends Blockly.ConnectionChecker {
  override doDragChecks(
    a: Blockly.RenderedConnection,
    b: Blockly.RenderedConnection,
    distance: number,
  ): boolean {
    if (!super.doDragChecks(a, b, distance)) {
      return false;
    }
    const root = b.getSourceBlock().getRootBlock();
    // A loose stack can hold anything; it does nothing until it's under a hat.
    if (!HAT_TYPES.includes(root.type)) {
      return true;
    }
    const around = aroundDrop(b);
    for (const block of a.getSourceBlock().getDescendants(false)) {
      const places = ONLY_IN[block.type];
      if (places && !places.includes(root.type as HatType)) {
        return false;
      }
      const loops = LOOP_READS[block.type];
      if (
        loops &&
        !nearestAround(block, loops) &&
        !around.some((candidate) => loops.includes(candidate.type))
      ) {
        return false;
      }
    }
    return true;
  }
}
