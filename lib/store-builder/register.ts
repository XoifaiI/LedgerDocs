// Registers everything the builder adds to Blockly, before the first block is made. Runs once per
// page load; each registration also replaces an older copy, so a hot reload swaps them cleanly.

import { Blockly } from "./blockly";
import { CHANGE_BLOCKS } from "./blocks/changes";
import { CONTROL_BLOCKS } from "./blocks/control";
import { DATA_BLOCKS } from "./blocks/data";
import { HAT_BLOCKS } from "./blocks/hats";
import { VALUE_BLOCKS } from "./blocks/values";
import { CHECKER, LedgerChecker } from "./checker";
import { FieldLedger, FieldLedgerParam } from "./fields/ledger-field";

// Toolbox categories show their colour as a dot, like a Fumadocs sidebar, in place of Blockly's
// thick border and filled selection. The CSS draws the dot from --category-colour.
class DotCategory extends Blockly.ToolboxCategory {
  protected override addColourBorder_(colour: string): void {
    this.rowDiv_?.style.setProperty("--category-colour", colour);
  }

  override setSelected(isSelected: boolean): void {
    super.setSelected(isSelected);
    if (this.rowDiv_) {
      this.rowDiv_.style.backgroundColor = "";
    }
  }
}

let registered = false;

export function registerAll(): void {
  if (registered) {
    return;
  }
  registered = true;

  const { registry } = Blockly;
  registry.register(registry.Type.FIELD, "field_ledger", FieldLedger, true);
  registry.register(
    registry.Type.FIELD,
    "field_ledger_param",
    FieldLedgerParam,
    true,
  );
  registry.register(
    registry.Type.CONNECTION_CHECKER,
    CHECKER,
    LedgerChecker,
    true,
  );
  registry.register(
    registry.Type.TOOLBOX_ITEM,
    Blockly.ToolboxCategory.registrationName,
    DotCategory,
    true,
  );

  Blockly.common.defineBlocks(
    Blockly.common.createBlockDefinitionsFromJsonArray([
      ...HAT_BLOCKS,
      ...CONTROL_BLOCKS,
      ...CHANGE_BLOCKS,
      ...DATA_BLOCKS,
      ...VALUE_BLOCKS,
    ]),
  );
}
