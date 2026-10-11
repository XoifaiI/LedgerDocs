// The test that refuses: "not X", turned around where that reads better, so only if Gold >= Price
// becomes "if Gold < Price then return nil", the way the docs write it.

import type { Blockly } from "../blockly";
import type { LuauGenerator } from "./generator";
import { Order } from "./order";

type Block = Blockly.Block;

const FLIPPED: Record<string, string> = {
  LT: ">=",
  LTE: ">",
  GT: "<=",
  GTE: "<",
  EQ: "~=",
  NEQ: "==",
};

export function refusalTest(
  block: Block,
  input: string,
  generator: LuauGenerator,
): string {
  const target = block.getInputTargetBlock(input);
  if (target?.isEnabled()) {
    if (target.type === "logic_negate") {
      return generator.value(target, "BOOL", Order.NONE, "Boolean");
    }
    if (target.type === "ledger_compare") {
      const left = generator.value(target, "A", Order.RELATIONAL, "Number");
      const right = generator.value(target, "B", Order.RELATIONAL, "Number");
      return `${left} ${FLIPPED[target.getFieldValue("OP")]} ${right}`;
    }
    if (target.type === "ledger_text_is") {
      const left = generator.value(target, "A", Order.RELATIONAL, "String");
      const right = generator.value(target, "B", Order.RELATIONAL, "String");
      return `${left} ${FLIPPED[target.getFieldValue("OP")]} ${right}`;
    }
  }
  return `not ${generator.value(block, input, Order.UNARY, "Boolean")}`;
}
