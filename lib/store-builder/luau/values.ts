// Generators for numbers, text and logic, including Blockly's own value blocks.

import type { Blockly } from "../blockly";
import type { LuauGenerator } from "./generator";
import { Order } from "./order";
import { interpolatedText, luauNumber, luauString } from "./strings";

type Block = Blockly.Block;

export function math_number(block: Block): [string, number] {
  const value = Number(block.getFieldValue("NUM"));
  const code = luauNumber(value);
  return [code, code.startsWith("-") ? Order.UNARY : Order.ATOMIC];
}

const ARITHMETIC: Record<string, [string, number]> = {
  ADD: ["+", Order.ADDITIVE],
  SUBTRACT: ["-", Order.ADDITIVE],
  MULTIPLY: ["*", Order.MULTIPLICATIVE],
  DIVIDE: ["//", Order.MULTIPLICATIVE],
  MODULO: ["%", Order.MULTIPLICATIVE],
};

export function ledger_arithmetic(
  block: Block,
  generator: LuauGenerator,
): [string, number] {
  const [operator, order] = ARITHMETIC[block.getFieldValue("OP")];
  const left = generator.value(block, "A", order, "Number");
  const right = generator.value(block, "B", order, "Number");
  return [`${left} ${operator} ${right}`, order];
}

export function ledger_math_single(
  block: Block,
  generator: LuauGenerator,
): [string, number] {
  const op: string = block.getFieldValue("OP");
  if (op === "ROUND") {
    const x = generator.value(block, "X", Order.ADDITIVE, "Number");
    return [`math.floor(${x} + 0.5)`, Order.HIGH];
  }
  const x = generator.value(block, "X", Order.NONE, "Number");
  const name = { CEIL: "ceil", FLOOR: "floor", ABS: "abs" }[op] ?? "floor";
  return [`math.${name}(${x})`, Order.HIGH];
}

export function ledger_min_max(
  block: Block,
  generator: LuauGenerator,
): [string, number] {
  const name = block.getFieldValue("OP") === "MIN" ? "min" : "max";
  const a = generator.value(block, "A", Order.NONE, "Number");
  const b = generator.value(block, "B", Order.NONE, "Number");
  return [`math.${name}(${a}, ${b})`, Order.HIGH];
}

// math.clamp throws when the bounds cross, which would refuse the op; min and max don't.
export function ledger_clamp(
  block: Block,
  generator: LuauGenerator,
): [string, number] {
  const x = generator.value(block, "X", Order.NONE, "Number");
  const low = generator.value(block, "LOW", Order.NONE, "Number");
  const high = generator.value(block, "HIGH", Order.NONE, "Number");
  return [`math.min(math.max(${x}, ${low}), ${high})`, Order.HIGH];
}

export function text(block: Block): [string, number] {
  return [luauString(block.getFieldValue("TEXT")), Order.ATOMIC];
}

// A join's pieces: plain text and numbers as they are, nested joins flattened, and anything else
// as code for an interpolated string's {...}.
type Piece = { text: string } | { code: string };

function joinPieces(
  block: Block,
  input: string,
  generator: LuauGenerator,
): Piece[] {
  const target = block.getInputTargetBlock(input);
  if (target?.isEnabled() && target.type === "text") {
    return [{ text: target.getFieldValue("TEXT") }];
  }
  if (target?.isEnabled() && target.type === "math_number") {
    return [{ text: luauNumber(Number(target.getFieldValue("NUM"))) }];
  }
  if (target?.isEnabled() && target.type === "ledger_join") {
    return [
      ...joinPieces(target, "A", generator),
      ...joinPieces(target, "B", generator),
    ];
  }
  return [{ code: generator.value(block, input, Order.NONE, "String") }];
}

export function ledger_join(
  block: Block,
  generator: LuauGenerator,
): [string, number] {
  const pieces = [
    ...joinPieces(block, "A", generator),
    ...joinPieces(block, "B", generator),
  ];
  if (pieces.every((piece) => "text" in piece)) {
    return [
      luauString(
        pieces.map((piece) => ("text" in piece ? piece.text : "")).join(""),
      ),
      Order.ATOMIC,
    ];
  }
  const inside = pieces
    .map((piece) =>
      "text" in piece ? interpolatedText(piece.text) : `{${piece.code}}`,
    )
    .join("");
  return [`\`${inside}\``, Order.ATOMIC];
}

export function ledger_text_length(
  block: Block,
  generator: LuauGenerator,
): [string, number] {
  const value = generator.value(block, "TEXT", Order.UNARY, "String");
  return [`#${value}`, Order.UNARY];
}

const COMPARE: Record<string, string> = {
  LT: "<",
  LTE: "<=",
  GT: ">",
  GTE: ">=",
  EQ: "==",
  NEQ: "~=",
};

export function ledger_compare(
  block: Block,
  generator: LuauGenerator,
): [string, number] {
  const left = generator.value(block, "A", Order.RELATIONAL, "Number");
  const right = generator.value(block, "B", Order.RELATIONAL, "Number");
  return [
    `${left} ${COMPARE[block.getFieldValue("OP")]} ${right}`,
    Order.RELATIONAL,
  ];
}

export function ledger_text_is(
  block: Block,
  generator: LuauGenerator,
): [string, number] {
  const left = generator.value(block, "A", Order.RELATIONAL, "String");
  const right = generator.value(block, "B", Order.RELATIONAL, "String");
  return [
    `${left} ${COMPARE[block.getFieldValue("OP")]} ${right}`,
    Order.RELATIONAL,
  ];
}

export function logic_boolean(block: Block): [string, number] {
  return [
    block.getFieldValue("BOOL") === "TRUE" ? "true" : "false",
    Order.ATOMIC,
  ];
}

export function logic_negate(
  block: Block,
  generator: LuauGenerator,
): [string, number] {
  return [
    `not ${generator.value(block, "BOOL", Order.UNARY, "Boolean")}`,
    Order.UNARY,
  ];
}

// Each side is passed as AND, so an and inside an or gets brackets: a and b or c reads like an
// if-else in Lua, which it isn't here.
export function logic_operation(
  block: Block,
  generator: LuauGenerator,
): [string, number] {
  const isAnd = block.getFieldValue("OP") === "AND";
  const left = generator.value(block, "A", Order.AND, "Boolean");
  const right = generator.value(block, "B", Order.AND, "Boolean");
  return [
    `${left} ${isAnd ? "and" : "or"} ${right}`,
    isAnd ? Order.AND : Order.OR,
  ];
}
