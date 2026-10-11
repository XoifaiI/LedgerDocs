// Ledger.New runs Schema on Default, and on Default with each balance field at every Min and Max
// a kind declares, and throws if one fails (Api/Validate/Cross.luau: BoundsPassSchema). So a check
// that Default breaks would stop the server at startup. The check blocks are a small language with
// a known start state, so they're run here, in JS, against those same states. A value this can't
// work out (a block in the wrong place, an empty slot) is unknown, and a must that rests on one is
// skipped rather than guessed.

import type { Blockly } from "../blockly";
import { CHECK_HAT } from "../blocks/contexts";
import { WHOLE_MOST } from "../limits";
import type { BlockProblem } from "../problem";
import { type DataField, fieldByUid, type Project } from "../project";
import { parseWhole } from "../validate";
import { firstNamed } from "./generator";

type Block = Blockly.Block;
type Value = number | string | boolean | Record<string, unknown> | unknown[];
type State = Record<string, Value>;
// The names each for each is on, by loop block id.
type Loops = Map<string, { name?: string; count?: number; item?: string }>;

const UNKNOWN = undefined;

// The start value of a field the blocks can read; tables start empty.
function startValue(field: DataField): Value | undefined {
  switch (field.type) {
    case "number": {
      const value = field.def.trim() === "" ? 0 : Number(field.def);
      return Number.isFinite(value) ? value : UNKNOWN;
    }
    case "string":
      return field.def;
    case "boolean":
      return field.def === "true";
    case "counts":
    case "set":
      return {};
    case "list":
      return [];
    default:
      return UNKNOWN;
  }
}

function fieldOf(
  block: Block,
  project: Project,
  kinds: DataField["type"][],
): DataField | null {
  const field = fieldByUid(project, block.getFieldValue("FIELD") ?? "");
  if (!field || !kinds.includes(field.type)) {
    return null;
  }
  return firstNamed(project, field.name) === field ? field : null;
}

function luauFloorMod(a: number, b: number): number {
  return a - Math.floor(a / b) * b;
}

function evaluate(
  block: Block | null,
  state: State,
  project: Project,
  loops: Loops,
): Value | undefined {
  if (!block?.isEnabled()) {
    return UNKNOWN;
  }
  const input = (name: string) =>
    evaluate(block.getInputTargetBlock(name), state, project, loops);
  const number = (name: string) => {
    const value = input(name);
    return typeof value === "number" ? value : UNKNOWN;
  };
  const text = (name: string) => {
    const value = input(name);
    return typeof value === "string" ? value : UNKNOWN;
  };
  const read = (kinds: DataField["type"][]) => {
    const field = fieldOf(block, project, kinds);
    return field ? state[field.name] : UNKNOWN;
  };
  const loop = () => {
    for (
      let around = block.getSurroundParent();
      around;
      around = around.getSurroundParent()
    ) {
      const names = loops.get(around.id);
      if (names) {
        return names;
      }
    }
    return UNKNOWN;
  };

  switch (block.type) {
    case "math_number": {
      const value = Number(block.getFieldValue("NUM"));
      return Number.isFinite(value) ? value : 0;
    }
    case "text":
      return block.getFieldValue("TEXT");
    case "logic_boolean":
      return block.getFieldValue("BOOL") === "TRUE";
    case "logic_negate": {
      const value = input("BOOL");
      return typeof value === "boolean" ? !value : UNKNOWN;
    }
    case "logic_operation": {
      const a = input("A");
      const b = input("B");
      const isAnd = block.getFieldValue("OP") === "AND";
      // Short-circuit where one side already decides it.
      if (isAnd && (a === false || b === false)) return false;
      if (!isAnd && (a === true || b === true)) return true;
      return typeof a === "boolean" && typeof b === "boolean"
        ? isAnd
          ? a && b
          : a || b
        : UNKNOWN;
    }
    case "ledger_compare": {
      const a = number("A");
      const b = number("B");
      if (a === UNKNOWN || b === UNKNOWN) return UNKNOWN;
      return {
        LT: a < b,
        LTE: a <= b,
        GT: a > b,
        GTE: a >= b,
        EQ: a === b,
        NEQ: a !== b,
      }[block.getFieldValue("OP") as string];
    }
    case "ledger_text_is": {
      const a = text("A");
      const b = text("B");
      if (a === UNKNOWN || b === UNKNOWN) return UNKNOWN;
      return block.getFieldValue("OP") === "EQ" ? a === b : a !== b;
    }
    case "ledger_arithmetic": {
      const a = number("A");
      const b = number("B");
      if (a === UNKNOWN || b === UNKNOWN) return UNKNOWN;
      switch (block.getFieldValue("OP")) {
        case "ADD":
          return a + b;
        case "SUBTRACT":
          return a - b;
        case "MULTIPLY":
          return a * b;
        case "DIVIDE":
          return Math.floor(a / b);
        default:
          return luauFloorMod(a, b);
      }
    }
    case "ledger_math_single": {
      const x = number("X");
      if (x === UNKNOWN) return UNKNOWN;
      return {
        ROUND: Math.floor(x + 0.5),
        CEIL: Math.ceil(x),
        FLOOR: Math.floor(x),
        ABS: Math.abs(x),
      }[block.getFieldValue("OP") as string];
    }
    case "ledger_min_max": {
      const a = number("A");
      const b = number("B");
      if (a === UNKNOWN || b === UNKNOWN) return UNKNOWN;
      return block.getFieldValue("OP") === "MIN"
        ? Math.min(a, b)
        : Math.max(a, b);
    }
    case "ledger_clamp": {
      const x = number("X");
      const low = number("LOW");
      const high = number("HIGH");
      if (x === UNKNOWN || low === UNKNOWN || high === UNKNOWN) return UNKNOWN;
      return Math.min(Math.max(x, low), high);
    }
    case "ledger_join": {
      const a = input("A");
      const b = input("B");
      const part = (value: Value | undefined) =>
        typeof value === "string" || typeof value === "number"
          ? String(value)
          : UNKNOWN;
      const left = part(a);
      const right = part(b);
      return left === UNKNOWN || right === UNKNOWN ? UNKNOWN : left + right;
    }
    case "ledger_text_length": {
      const value = text("TEXT");
      return value === UNKNOWN
        ? UNKNOWN
        : new TextEncoder().encode(value).length;
    }
    case "ledger_get_number":
      return read(["number"]);
    case "ledger_get_text":
      return read(["string"]);
    case "ledger_get_flag":
      return read(["boolean"]);
    case "ledger_count_of": {
      const counts = read(["counts"]) as Record<string, number> | undefined;
      const key = text("KEY");
      return counts && key !== UNKNOWN ? (counts[key] ?? 0) : UNKNOWN;
    }
    case "ledger_set_has": {
      const set = read(["set"]) as Record<string, boolean> | undefined;
      const key = text("KEY");
      return set && key !== UNKNOWN ? set[key] === true : UNKNOWN;
    }
    case "ledger_list_has": {
      const list = read(["list"]) as string[] | undefined;
      const value = text("VALUE");
      return list && value !== UNKNOWN ? list.includes(value) : UNKNOWN;
    }
    case "ledger_list_size": {
      const list = read(["list"]) as string[] | undefined;
      return list ? list.length : UNKNOWN;
    }
    case "ledger_each_name":
      return loop()?.name;
    case "ledger_each_count":
      return loop()?.count;
    case "ledger_each_item":
      return loop()?.item;
    default:
      return UNKNOWN;
  }
}

// Runs a chain of check steps; returns the must that fails, if one surely does.
function run(
  first: Block | null,
  state: State,
  project: Project,
  loops: Loops,
): Block | null {
  for (let step = first; step; step = step.getNextBlock()) {
    if (!step.isEnabled()) {
      continue;
    }
    switch (step.type) {
      case "ledger_must": {
        if (
          evaluate(step.getInputTargetBlock("COND"), state, project, loops) ===
          false
        ) {
          return step;
        }
        break;
      }
      case "ledger_if": {
        const condition = evaluate(
          step.getInputTargetBlock("COND"),
          state,
          project,
          loops,
        );
        if (typeof condition !== "boolean") {
          break;
        }
        const failed = run(
          step.getInputTargetBlock(condition ? "THEN" : "ELSE"),
          state,
          project,
          loops,
        );
        if (failed) return failed;
        break;
      }
      case "ledger_for_counts":
      case "ledger_for_set":
      case "ledger_for_list": {
        const kind = {
          ledger_for_counts: "counts",
          ledger_for_set: "set",
          ledger_for_list: "list",
        }[step.type] as DataField["type"];
        const field = fieldOf(step, project, [kind]);
        const table = field ? state[field.name] : UNKNOWN;
        if (!table || typeof table !== "object") {
          break;
        }
        const entries: [string, unknown][] = Array.isArray(table)
          ? table.map((item, index) => [String(index), item])
          : Object.entries(table);
        for (const [key, value] of entries) {
          loops.set(
            step.id,
            kind === "list"
              ? { item: value as string }
              : {
                  name: key,
                  count: typeof value === "number" ? value : UNKNOWN,
                },
          );
          const failed = run(
            step.getInputTargetBlock("DO"),
            state,
            project,
            loops,
          );
          if (failed) return failed;
        }
        loops.delete(step.id);
        break;
      }
    }
  }
  return null;
}

// The states Ledger.New runs Schema on, each with a description for the problem.
function startStates(project: Project): { state: State; where: string }[] {
  const base: State = {};
  for (const field of project.fields) {
    if (firstNamed(project, field.name) !== field) continue;
    const value = startValue(field);
    if (value !== UNKNOWN) base[field.name] = value;
  }
  const states = [{ state: base, where: "Default" }];
  for (const balance of project.balances) {
    const field = fieldByUid(project, balance.field);
    if (field?.type !== "number" || balance.arithmetic !== "") continue;
    for (const kind of [...balance.credit, ...balance.debit]) {
      for (const [label, own, inherited] of [
        ["Min", kind.min, balance.min],
        ["Max", kind.max, balance.max],
      ] as const) {
        const text = own.trim() !== "" ? own : inherited;
        const value = text.trim() === "" ? null : parseWhole(text);
        if (value === null || Math.abs(value) > WHOLE_MOST) continue;
        states.push({
          state: { ...base, [field.name]: value },
          where: `Default with ${field.name} at ${kind.kind}'s ${label} (${value})`,
        });
      }
    }
  }
  return states;
}

export function startupProblems(
  checks: Block[],
  project: Project,
): BlockProblem[] {
  if (checks.length === 0) {
    return [];
  }
  const problems: BlockProblem[] = [];
  const reported = new Set<string>();
  for (const { state, where } of startStates(project)) {
    for (const check of checks) {
      if (check.type !== CHECK_HAT) continue;
      const failed = run(
        check.getInputTargetBlock("DO"),
        state,
        project,
        new Map(),
      );
      if (failed && !reported.has(failed.id)) {
        reported.add(failed.id);
        problems.push({
          kind: "block",
          blockId: failed.id,
          message: `${where} breaks this rule, and Ledger.New checks that when the server starts, so it would throw.`,
        });
      }
    }
  }
  return problems;
}
