// The Luau generator: a Blockly CodeGenerator laid out like Blockly's own language generators.
// This class holds the language-wide rules (indenting, names, chaining steps, what an empty slot
// becomes); the per-block functions live in one file per toolbox category; module.ts puts the
// pieces into a Stores module.

import { Blockly } from "../blockly";
import {
  CHECK_HAT,
  HAT_TYPES,
  type HatType,
  ONLY_IN,
} from "../blocks/contexts";
import { cased } from "../casing";
import {
  isName,
  LUAU_GLOBALS,
  LUAU_KEYWORDS,
  moduleNames,
} from "../luau-names";
import type { BlockProblem } from "../problem";
import {
  type DataField,
  FIELD_TYPES,
  type FieldType,
  fieldByUid,
  type Project,
} from "../project";
import { stepEnds } from "./flow";
import { Order } from "./order";
import { luauString } from "./strings";

type Block = Blockly.Block;

export type ValueType = "Number" | "String" | "Boolean";

// What an empty or switched-off slot becomes, so the module still type-checks.
const FALLBACK: Record<ValueType, string> = {
  Number: "0",
  String: '""',
  Boolean: "false",
};

function misplaced(block: Block): boolean {
  const places = ONLY_IN[block.type];
  const root = block.getRootBlock().type;
  return (
    places !== undefined &&
    HAT_TYPES.includes(root) &&
    !places.includes(root as HatType)
  );
}

// The field the data type uses for a name: the first one, when two share it.
export function firstNamed(
  project: Project,
  name: string,
): DataField | undefined {
  return project.fields.find((field) => field.name === name);
}

// .Name, or ["Some name"] when it isn't a plain name.
export function accessor(name: string): string {
  return isName(name) ? `.${name}` : `[${luauString(name)}]`;
}

// The names a for each gives its body. "_" for one the body never reads.
export type LoopNames = { name: string; count: string; item: string };

export class LuauGenerator extends Blockly.CodeGenerator {
  readonly project: Project;
  readonly problems: BlockProblem[] = [];
  // SCREAMING_CASE constants the module declares, such as RECEIPTS_KEPT.
  readonly constants = new Map<string, number>();
  // Each op block's handler name, given out before any body is made.
  readonly handlerNames = new Map<string, string>();
  readonly loops = new Map<string, LoopNames>();

  constructor(project: Project) {
    super("Luau");
    this.project = project;
    this.INDENT = "\t";
    this.addReservedWords(
      [
        ...LUAU_KEYWORDS,
        ...LUAU_GLOBALS,
        ...moduleNames(project.store.casing),
      ].join(","),
    );
  }

  // One of the module's own names (Data, New, Op…) in the project's naming style.
  id(name: string): string {
    return cased(name, this.project.store.casing);
  }

  override init(_workspace: Blockly.Workspace): void {
    this.nameDB_ = new Blockly.Names(this.RESERVED_WORDS_);
    this.isInitialized = true;
  }

  // Keeps names the module declares at the top out of every local.
  reserve(names: string[]): void {
    this.addReservedWords(names.join(","));
    this.nameDB_ = new Blockly.Names(this.RESERVED_WORDS_);
  }

  // Each hat is its own function, so its locals start fresh.
  startHat(): void {
    this.nameDB_ = new Blockly.Names(this.RESERVED_WORDS_);
    this.loops.clear();
  }

  // A local's name in the project's naming style, distinct from every other name in the hat.
  local(name: string): string {
    return this.distinct(this.id(name));
  }

  // A name as given, made distinct; for required modules, which keep their own casing.
  distinct(name: string): string {
    if (!this.nameDB_) {
      throw new Error("LuauGenerator.init was never called");
    }
    return this.nameDB_.getDistinctName(name, Blockly.Names.NameType.VARIABLE);
  }

  problem(block: Block, message: string): void {
    this.problems.push({ kind: "block", blockId: block.id, message });
  }

  // An input's code, or a typed stand-in and a problem when it's empty.
  value(block: Block, input: string, order: number, type: ValueType): string {
    const code = this.valueToCode(block, input, order);
    if (code) {
      return code;
    }
    const target = block.getInputTargetBlock(input);
    this.problem(
      block,
      target && !target.isEnabled()
        ? "A block in a slot here is turned off."
        : "Fill in the empty slot.",
    );
    return FALLBACK[type];
  }

  // The data field a block's FIELD dropdown points at, if it still exists and fits.
  field(block: Block, kinds: readonly FieldType[]): DataField | null {
    const uid: string = block.getFieldValue("FIELD");
    const field = uid ? fieldByUid(this.project, uid) : undefined;
    if (!field) {
      this.problem(
        block,
        uid ? "Its field was removed. Pick another." : "Pick a field.",
      );
      return null;
    }
    // With two fields of one name, only the first is in the data type.
    if (firstNamed(this.project, field.name) !== field) {
      this.problem(block, `Two fields are called ${field.name}. Rename one.`);
      return null;
    }
    if (!kinds.includes(field.type)) {
      this.problem(
        block,
        `${field.name} isn't a ${kinds.map((kind) => FIELD_TYPES[kind].label).join(" or ")} field any more.`,
      );
      return null;
    }
    return field;
  }

  // The table a block reads and writes: Data in checks, New in ops and migrations.
  base(block: Block): string {
    if (block.getRootBlock().type === CHECK_HAT) {
      return this.id("Data");
    }
    return this.id("New");
  }

  // Where a field lives, like New.Gold, or null after reporting why there's none.
  path(block: Block, kinds: readonly FieldType[]): string | null {
    const field = this.field(block, kinds);
    return field ? `${this.base(block)}${accessor(field.name)}` : null;
  }

  // A constant's name. The same name with another value gets a number on the end.
  constant(name: string, value: number): string {
    let candidate = name;
    for (
      let count = 2;
      this.constants.has(candidate) && this.constants.get(candidate) !== value;
      count++
    ) {
      candidate = `${name}_${count}`;
    }
    this.constants.set(candidate, value);
    return candidate;
  }

  // A block in the wrong hat makes no code (problems.ts reports it): a value becomes a typed
  // stand-in and a step is skipped, so the module still type-checks.
  override blockToCode(
    block: Block | null,
    thisOnly?: boolean,
  ): string | [string, number] {
    if (block && misplaced(block)) {
      if (block.outputConnection) {
        const check = block.outputConnection.getCheck()?.[0] as ValueType;
        return [FALLBACK[check] ?? "nil", Order.ATOMIC];
      }
      return thisOnly ? "" : this.blockToCode(block.getNextBlock());
    }
    return super.blockToCode(block, thisOnly);
  }

  // Adds a step's comment, then the steps after it, stopping after one that always returns.
  override scrub_(block: Block, code: string, thisOnly?: boolean): string {
    let out = code;
    const comment = block.outputConnection ? null : block.getCommentText();
    if (comment && out) {
      out = `${this.prefixLines(comment, "-- ")}\n${out}`;
    }
    if (thisOnly) {
      return out;
    }
    const next = block.getNextBlock();
    if (!next) {
      return out;
    }
    if (stepEnds(block)) {
      this.problem(next, "This never runs: the step above always refuses.");
      return out;
    }
    return out + this.blockToCode(next);
  }

  override scrubNakedValue(_line: string): string {
    throw new Error("Loose values are never generated: hats hold every block");
  }
}
