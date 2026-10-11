// Generators for reads of the saved data.

import type { Blockly } from "../blockly";
import type { LuauGenerator } from "./generator";
import { Order } from "./order";

type Block = Blockly.Block;

function read(
  block: Block,
  generator: LuauGenerator,
  kind: "number" | "string" | "boolean",
  fallback: string,
): [string, number] {
  const path = generator.path(block, [kind]);
  return path ? [path, Order.HIGH] : [fallback, Order.ATOMIC];
}

export function ledger_get_number(
  block: Block,
  generator: LuauGenerator,
): [string, number] {
  return read(block, generator, "number", "0");
}

export function ledger_get_text(
  block: Block,
  generator: LuauGenerator,
): [string, number] {
  return read(block, generator, "string", '""');
}

export function ledger_get_flag(
  block: Block,
  generator: LuauGenerator,
): [string, number] {
  return read(block, generator, "boolean", "false");
}

export function ledger_count_of(
  block: Block,
  generator: LuauGenerator,
): [string, number] {
  const path = generator.path(block, ["counts"]);
  const key = generator.value(block, "KEY", Order.NONE, "String");
  return path ? [`${path}[${key}] or 0`, Order.OR] : ["0", Order.ATOMIC];
}

export function ledger_set_has(
  block: Block,
  generator: LuauGenerator,
): [string, number] {
  const path = generator.path(block, ["set"]);
  const key = generator.value(block, "KEY", Order.NONE, "String");
  return path
    ? [`${path}[${key}] == true`, Order.RELATIONAL]
    : ["false", Order.ATOMIC];
}

export function ledger_list_has(
  block: Block,
  generator: LuauGenerator,
): [string, number] {
  const path = generator.path(block, ["list"]);
  const value = generator.value(block, "VALUE", Order.NONE, "String");
  return path
    ? [`table.find(${path}, ${value}) ~= nil`, Order.RELATIONAL]
    : ["false", Order.ATOMIC];
}

export function ledger_list_size(
  block: Block,
  generator: LuauGenerator,
): [string, number] {
  const path = generator.path(block, ["list"]);
  return path ? [`#${path}`, Order.UNARY] : ["0", Order.ATOMIC];
}
