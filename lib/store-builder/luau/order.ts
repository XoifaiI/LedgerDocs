// Luau's operator precedence for valueToCode, strongest first. It is Lua 5.1's, as in Blockly's own
// Lua generator, with // beside * and if-expressions binding weakest of all.
export const Order = {
  ATOMIC: 0, // literals, names
  HIGH: 1, // calls, indexing
  EXPONENTIATION: 2, // ^
  UNARY: 3, // not # -
  MULTIPLICATIVE: 4, // * / // %
  ADDITIVE: 5, // + -
  CONCATENATION: 6, // ..
  RELATIONAL: 7, // < > <= >= ~= ==
  AND: 8,
  OR: 9,
  IF_ELSE: 10, // if a then b else c
  NONE: 99,
} as const;

export type OrderValue = (typeof Order)[keyof typeof Order];
