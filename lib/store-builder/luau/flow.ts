// Which steps always return. Luau allows nothing after a return in the same block, so the
// generator stops a chain there, and an op whose steps always refuse gets no return New.

import type { Blockly } from "../blockly";

export function stepEnds(block: Blockly.Block): boolean {
  if (!block.isEnabled()) {
    return false;
  }
  switch (block.type) {
    case "ledger_refuse":
      return true;
    case "ledger_if":
      return (
        chainEnds(block.getInputTargetBlock("THEN")) &&
        chainEnds(block.getInputTargetBlock("ELSE"))
      );
    default:
      return false;
  }
}

export function chainEnds(first: Blockly.Block | null): boolean {
  for (let block = first; block; block = block.getNextBlock()) {
    if (stepEnds(block)) {
      return true;
    }
  }
  return false;
}

// The nearest block around this one of one of these types.
export function nearestAround(
  block: Blockly.Block,
  types: readonly string[],
): Blockly.Block | null {
  for (
    let current = block.getSurroundParent();
    current;
    current = current.getSurroundParent()
  ) {
    if (types.includes(current.type)) {
      return current;
    }
  }
  return null;
}
