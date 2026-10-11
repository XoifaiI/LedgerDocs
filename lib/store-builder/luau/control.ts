// Generators for rules and loops.

import type { Blockly } from "../blockly";
import { LOOP_READS } from "../blocks/contexts";
import { nearestAround } from "./flow";
import type { LuauGenerator } from "./generator";
import { Order } from "./order";
import { refusalTest } from "./refusal";

type Block = Blockly.Block;

export function ledger_only_if(block: Block, generator: LuauGenerator): string {
  const test = refusalTest(block, "COND", generator);
  return `if ${test} then\n${generator.INDENT}return nil\nend\n`;
}

export function ledger_refuse(): string {
  return "return nil\n";
}

export function ledger_if(block: Block, generator: LuauGenerator): string {
  const then = generator.statementToCode(block, "THEN");
  const otherwise = generator.statementToCode(block, "ELSE");
  if (!then && !otherwise) {
    generator.problem(block, "Put a step under if or else.");
    return "";
  }
  if (!then) {
    const test = refusalTest(block, "COND", generator);
    return `if ${test} then\n${otherwise}end\n`;
  }
  const condition = generator.value(block, "COND", Order.NONE, "Boolean");
  return otherwise
    ? `if ${condition} then\n${then}else\n${otherwise}end\n`
    : `if ${condition} then\n${then}end\n`;
}

// Which of the loop's names its body reads.
function readsOf(loop: Block): Set<string> {
  const reads = new Set<string>();
  for (const block of loop.getDescendants(false)) {
    const loops = LOOP_READS[block.type];
    if (loops && block.isEnabled() && nearestAround(block, loops) === loop) {
      reads.add(block.type);
    }
  }
  return reads;
}

function loop(
  block: Block,
  generator: LuauGenerator,
  kind: "counts" | "set" | "list",
): string {
  const reads = readsOf(block);
  const names = {
    name: reads.has("ledger_each_name") ? generator.local("Name") : "_",
    count: reads.has("ledger_each_count") ? generator.local("Count") : "_",
    item: reads.has("ledger_each_item") ? generator.local("Item") : "_",
  };
  generator.loops.set(block.id, names);

  // An empty table of the right type keeps the module checking when the field is gone.
  const empty = {
    counts: "({} :: { [string]: number })",
    set: "({} :: { [string]: boolean })",
    list: "({} :: { string })",
  }[kind];
  const path = generator.path(block, [kind]) ?? empty;

  const body = generator.statementToCode(block, "DO");
  if (!body) {
    generator.problem(block, "This for each has no steps yet.");
    return "";
  }
  const variables = {
    counts: names.count === "_" ? names.name : `${names.name}, ${names.count}`,
    set: names.name,
    list: names.item === "_" ? "_" : `_, ${names.item}`,
  }[kind];
  return `for ${variables} in ${path} do\n${body}end\n`;
}

export function ledger_for_counts(
  block: Block,
  generator: LuauGenerator,
): string {
  return loop(block, generator, "counts");
}

export function ledger_for_set(block: Block, generator: LuauGenerator): string {
  return loop(block, generator, "set");
}

export function ledger_for_list(
  block: Block,
  generator: LuauGenerator,
): string {
  return loop(block, generator, "list");
}

function loopRead(
  block: Block,
  generator: LuauGenerator,
  part: "name" | "count" | "item",
  fallback: string,
): [string, number] {
  const around = nearestAround(block, LOOP_READS[block.type]);
  const names = around ? generator.loops.get(around.id) : undefined;
  if (!names) {
    generator.problem(block, "Put this inside a for each that has it.");
    return [fallback, Order.ATOMIC];
  }
  return [names[part], Order.ATOMIC];
}

export function ledger_each_name(
  block: Block,
  generator: LuauGenerator,
): [string, number] {
  return loopRead(block, generator, "name", '""');
}

export function ledger_each_count(
  block: Block,
  generator: LuauGenerator,
): [string, number] {
  return loopRead(block, generator, "count", "0");
}

export function ledger_each_item(
  block: Block,
  generator: LuauGenerator,
): [string, number] {
  return loopRead(block, generator, "item", '""');
}
