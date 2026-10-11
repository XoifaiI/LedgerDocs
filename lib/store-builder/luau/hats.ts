// Generators for the three hats and the blocks that belong to one. A hat makes the body of one
// function; module.ts wraps them into the reducer's handlers, Schema and Migrations.

import type { Blockly } from "../blockly";
import { OP_READS, TABLE_WRITES } from "../blocks/contexts";
import { enclosingOp, NOTHING_PICKED, paramsOf } from "../fields/ledger-field";
import { fieldByUid } from "../project";
import { defaultValue } from "./defaults";
import { chainEnds } from "./flow";
import { accessor, type LuauGenerator } from "./generator";
import { Order } from "./order";
import { refusalTest } from "./refusal";
import { luauString } from "./strings";

type Block = Blockly.Block;

const ALL_KINDS = [
  "number",
  "string",
  "boolean",
  "counts",
  "set",
  "list",
  "luau",
] as const;

// The table fields an op writes, so its handler clones them before changing them.
function writtenTables(op: Block, generator: LuauGenerator): string[] {
  const names = new Set<string>();
  for (const block of op.getDescendants(false)) {
    if (TABLE_WRITES.includes(block.type) && block.isEnabled()) {
      const field = fieldByUid(generator.project, block.getFieldValue("FIELD"));
      if (field) {
        names.add(field.name);
      }
    }
  }
  return [...names];
}

export function ledger_op(block: Block, generator: LuauGenerator): string {
  generator.startHat();
  const kind: string = block.getFieldValue("NAME");
  const handler = generator.handlerNames.get(block.id) ?? kind;
  const dataType = generator.project.store.dataType;
  const steps = block.getInputTargetBlock("DO");
  if (!steps) {
    generator.problem(block, "This op does nothing yet. Add steps under does.");
  }
  const body = generator.statementToCode(block, "DO");
  const ends = chainEnds(steps);
  const indent = generator.INDENT;

  let code = `local function ${handler}(Data: ${dataType}, Op: Op<${luauString(kind)}>): ${dataType}?\n`;
  if (!ends || generator.usesNew) {
    code += `${indent}local New = table.clone(Data)\n`;
    for (const name of writtenTables(block, generator)) {
      const path = `New${accessor(name)}`;
      code += `${indent}${path} = table.clone(${path})\n`;
    }
  }
  code += body;
  if (!ends) {
    code += `${indent}return New\n`;
  }
  return `${code}end`;
}

// Params become the op's type, not code.
export function ledger_param(): string {
  return "";
}

function opRead(block: Block, generator: LuauGenerator): [string, number] {
  const name: string = block.getFieldValue("PARAM");
  const type = OP_READS[block.type];
  const op = enclosingOp(block);
  const param = op
    ? paramsOf(op).find((candidate) => candidate.name === name)
    : undefined;
  if (name === NOTHING_PICKED) {
    generator.problem(block, "Pick which param to read.");
  } else if (op && !param) {
    generator.problem(block, `This op doesn't take ${name}.`);
  } else if (param && param.type !== type) {
    generator.problem(block, `${name} isn't a ${type} any more.`);
  }
  if (!param || param.type !== type) {
    return [
      type === "number" ? "0" : type === "string" ? '""' : "false",
      Order.ATOMIC,
    ];
  }
  return [`Op${accessor(name)}`, Order.HIGH];
}

export const ledger_op_number = opRead;
export const ledger_op_text = opRead;
export const ledger_op_flag = opRead;

export function ledger_check(block: Block, generator: LuauGenerator): string {
  generator.startHat();
  if (!block.getInputTargetBlock("DO")) {
    generator.problem(block, "This check has no rules yet. Add a must.");
  }
  return generator.statementToCode(block, "DO");
}

export function ledger_must(block: Block, generator: LuauGenerator): string {
  const test = refusalTest(block, "COND", generator);
  const message = generator.value(block, "MESSAGE", Order.NONE, "String");
  const indent = generator.INDENT;
  return `if ${test} then\n${indent}return false, ${message}\nend\n`;
}

export function ledger_migration(
  block: Block,
  generator: LuauGenerator,
): string {
  generator.startHat();
  if (!block.getInputTargetBlock("DO")) {
    generator.problem(block, "This migration changes nothing yet.");
  }
  return generator.statementToCode(block, "DO");
}

export function ledger_migrate_add(
  block: Block,
  generator: LuauGenerator,
): string {
  const field = generator.field(block, ALL_KINDS);
  if (!field) {
    return "";
  }
  return `New${accessor(field.name)} = ${defaultValue(field)}\n`;
}

function oldName(block: Block, generator: LuauGenerator): string | null {
  const name: string = block.getFieldValue("OLD").trim();
  if (name === "") {
    generator.problem(block, "Name the old field.");
    return null;
  }
  return name;
}

export function ledger_migrate_rename(
  block: Block,
  generator: LuauGenerator,
): string {
  const old = oldName(block, generator);
  const field = generator.field(block, ALL_KINDS);
  if (!old || !field) {
    return "";
  }
  if (old === field.name) {
    generator.problem(block, "The old and new names are the same.");
    return "";
  }
  return `New${accessor(field.name)} = New${accessor(old)}\nNew${accessor(old)} = nil\n`;
}

export function ledger_migrate_remove(
  block: Block,
  generator: LuauGenerator,
): string {
  const old = oldName(block, generator);
  return old ? `New${accessor(old)} = nil\n` : "";
}

function migrateSet(
  block: Block,
  generator: LuauGenerator,
  kind: "number" | "string" | "boolean",
  type: "Number" | "String" | "Boolean",
): string {
  const field = generator.field(block, [kind]);
  const value = generator.value(block, "VALUE", Order.NONE, type);
  return field ? `New${accessor(field.name)} = ${value}\n` : "";
}

export function ledger_migrate_set_number(
  block: Block,
  generator: LuauGenerator,
): string {
  return migrateSet(block, generator, "number", "Number");
}

export function ledger_migrate_set_text(
  block: Block,
  generator: LuauGenerator,
): string {
  return migrateSet(block, generator, "string", "String");
}

export function ledger_migrate_set_flag(
  block: Block,
  generator: LuauGenerator,
): string {
  return migrateSet(block, generator, "boolean", "Boolean");
}

// Old data isn't typed, so a saved read checks the type and falls back.
function saved(
  block: Block,
  generator: LuauGenerator,
): { path: string } | null {
  const name: string = block.getFieldValue("NAME").trim();
  if (name === "") {
    generator.problem(block, "Name the old field.");
    return null;
  }
  return { path: `New${accessor(name)}` };
}

export function ledger_saved_number(
  block: Block,
  generator: LuauGenerator,
): [string, number] {
  const read = saved(block, generator);
  if (!read) {
    return ["0", Order.ATOMIC];
  }
  return [
    `if type(${read.path}) == "number" then ${read.path} else 0`,
    Order.IF_ELSE,
  ];
}

export function ledger_saved_text(
  block: Block,
  generator: LuauGenerator,
): [string, number] {
  const read = saved(block, generator);
  if (!read) {
    return ['""', Order.ATOMIC];
  }
  return [
    `if type(${read.path}) == "string" then ${read.path} else ""`,
    Order.IF_ELSE,
  ];
}

export function ledger_saved_flag(
  block: Block,
  generator: LuauGenerator,
): [string, number] {
  const read = saved(block, generator);
  if (!read) {
    return ["false", Order.ATOMIC];
  }
  return [`${read.path} == true`, Order.RELATIONAL];
}
