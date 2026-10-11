// Lays the canvas's hats out in rows by their drawn size, left to right like reading, so nothing
// overlaps whatever font the page ends up with. A row ends when the next hat wouldn't fit the
// canvas. Used for the example and for Tidy up.

import { Blockly } from "./blockly";

const GAP = 48;
// While the Luau tab is open the canvas has no width; lay out for a common one.
const HIDDEN_WIDTH = 1200;

export function arrange(workspace: Blockly.WorkspaceSvg): void {
  const blocks = workspace.getTopBlocks(true);
  if (blocks.length === 0) {
    return;
  }
  const viewWidth = workspace.getMetrics().viewWidth / workspace.scale;
  const width = viewWidth > 0 ? viewWidth - GAP : HIDDEN_WIDTH;

  Blockly.Events.setGroup(true);
  let x = GAP / 2;
  let y = GAP / 2;
  let rowHeight = 0;
  for (const block of blocks) {
    const size = block.getHeightWidth();
    if (x > GAP / 2 && x + size.width > width) {
      x = GAP / 2;
      y += rowHeight + GAP;
      rowHeight = 0;
    }
    const at = block.getRelativeToSurfaceXY();
    block.moveBy(x - at.x, y - at.y);
    x += size.width + GAP;
    rowHeight = Math.max(rowHeight, size.height);
  }
  Blockly.Events.setGroup(false);
}
