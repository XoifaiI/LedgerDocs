// Generators for what an op changes. The op has already cloned New, and every table field it
// writes, so these change New in place.

import type { Blockly } from "../blockly";
import type { LuauGenerator } from "./generator";
import { Order } from "./order";
import { screamingCase } from "./strings";

type Block = Blockly.Block;

// Code that's safe to write twice: a name, a field path, a string or a number.
const SIMPLE =
  /^(?:[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*|"(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?)$/;

// A key used more than once: the code itself when that's safe, otherwise a local.
function keyOf(
  block: Block,
  input: string,
  generator: LuauGenerator,
): { key: string; setup: string } {
  const code = generator.value(block, input, Order.NONE, "String");
  if (SIMPLE.test(code)) {
    return { key: code, setup: "" };
  }
  const key = generator.local("Key");
  return { key, setup: `${generator.INDENT}local ${key} = ${code}\n` };
}

function write(
  block: Block,
  generator: LuauGenerator,
  kind: "number" | "string" | "boolean",
  operator: string,
  type: "Number" | "String" | "Boolean",
): string {
  const path = generator.path(block, [kind]);
  const value = generator.value(block, "VALUE", Order.NONE, type);
  return path ? `${path} ${operator} ${value}\n` : "";
}

export function ledger_add(block: Block, generator: LuauGenerator): string {
  return write(block, generator, "number", "+=", "Number");
}

export function ledger_subtract(
  block: Block,
  generator: LuauGenerator,
): string {
  return write(block, generator, "number", "-=", "Number");
}

export function ledger_set_number(
  block: Block,
  generator: LuauGenerator,
): string {
  return write(block, generator, "number", "=", "Number");
}

export function ledger_set_text(
  block: Block,
  generator: LuauGenerator,
): string {
  return write(block, generator, "string", "=", "String");
}

export function ledger_set_flag(
  block: Block,
  generator: LuauGenerator,
): string {
  return write(block, generator, "boolean", "=", "Boolean");
}

export function ledger_count_add(
  block: Block,
  generator: LuauGenerator,
): string {
  const path = generator.path(block, ["counts"]);
  const amount = generator.value(block, "AMOUNT", Order.ADDITIVE, "Number");
  const { key, setup } = keyOf(block, "KEY", generator);
  if (!path) {
    return "";
  }
  const line = `${path}[${key}] = (${path}[${key}] or 0) + ${amount}\n`;
  return setup ? `do\n${setup}${generator.INDENT}${line}end\n` : line;
}

export function ledger_count_take(
  block: Block,
  generator: LuauGenerator,
): string {
  const path = generator.path(block, ["counts"]);
  const amount = generator.value(block, "AMOUNT", Order.ADDITIVE, "Number");
  const { key, setup } = keyOf(block, "KEY", generator);
  if (!path) {
    return "";
  }
  const indent = generator.INDENT;
  const left = generator.local("Left");
  return (
    `do\n${setup}` +
    `${indent}local ${left} = (${path}[${key}] or 0) - ${amount}\n` +
    `${indent}if ${left} < 0 then\n` +
    `${indent}${indent}return nil -- not enough\n` +
    `${indent}end\n` +
    `${indent}${path}[${key}] = if ${left} == 0 then nil else ${left}\n` +
    "end\n"
  );
}

export function ledger_set_put(block: Block, generator: LuauGenerator): string {
  const path = generator.path(block, ["set"]);
  const key = generator.value(block, "KEY", Order.NONE, "String");
  return path ? `${path}[${key}] = true\n` : "";
}

export function ledger_set_take(
  block: Block,
  generator: LuauGenerator,
): string {
  const path = generator.path(block, ["set"]);
  const key = generator.value(block, "KEY", Order.NONE, "String");
  return path ? `${path}[${key}] = nil\n` : "";
}

export function ledger_list_push(
  block: Block,
  generator: LuauGenerator,
): string {
  const field = generator.field(block, ["list"]);
  const value = generator.value(block, "VALUE", Order.NONE, "String");
  if (!field) {
    return "";
  }
  const path = generator.path(block, ["list"]);
  let code = `table.insert(${path}, ${value})\n`;
  const keep = Number(block.getFieldValue("KEEP")) || 0;
  if (keep > 0) {
    const kept = generator.constant(`${screamingCase(field.name)}_KEPT`, keep);
    code +=
      `while #${path} > ${kept} do\n` +
      `${generator.INDENT}table.remove(${path}, 1) -- forget the oldest\n` +
      "end\n";
  }
  return code;
}

export function ledger_list_remove(
  block: Block,
  generator: LuauGenerator,
): string {
  const path = generator.path(block, ["list"]);
  const value = generator.value(block, "VALUE", Order.NONE, "String");
  if (!path) {
    return "";
  }
  const indent = generator.INDENT;
  const index = generator.local("Index");
  return (
    "do\n" +
    `${indent}local ${index} = table.find(${path}, ${value})\n` +
    `${indent}if ${index} then\n` +
    `${indent}${indent}table.remove(${path}, ${index})\n` +
    `${indent}end\n` +
    "end\n"
  );
}
