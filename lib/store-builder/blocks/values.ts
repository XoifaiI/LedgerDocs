// Numbers, text and logic. The plain values (number, text, true/false, and, or, not) are Blockly's
// own blocks; these are the ones whose built-in versions would let a reducer break: / and ^ make
// numbers that aren't whole, and the built-in compare takes any two types.

const VALUE = { inputsInline: true, style: "values_blocks" };

const number = (name: string) => ({
  type: "input_value",
  name,
  check: "Number",
});

export const VALUE_BLOCKS = [
  {
    type: "ledger_arithmetic",
    message0: "%1 %2 %3",
    args0: [
      number("A"),
      {
        type: "field_dropdown",
        name: "OP",
        options: [
          ["+", "ADD"],
          ["−", "SUBTRACT"],
          ["×", "MULTIPLY"],
          ["÷", "DIVIDE"],
          ["remainder", "MODULO"],
        ],
      },
      number("B"),
    ],
    output: "Number",
    ...VALUE,
    tooltip: "÷ rounds down to a whole number, so balances stay whole.",
  },
  {
    type: "ledger_math_single",
    message0: "%1 %2",
    args0: [
      {
        type: "field_dropdown",
        name: "OP",
        options: [
          ["round", "ROUND"],
          ["round up", "CEIL"],
          ["round down", "FLOOR"],
          ["absolute", "ABS"],
        ],
      },
      number("X"),
    ],
    output: "Number",
    ...VALUE,
  },
  {
    type: "ledger_min_max",
    message0: "%1 of %2 and %3",
    args0: [
      {
        type: "field_dropdown",
        name: "OP",
        options: [
          ["smaller", "MIN"],
          ["bigger", "MAX"],
        ],
      },
      number("A"),
      number("B"),
    ],
    output: "Number",
    ...VALUE,
  },
  {
    type: "ledger_clamp",
    message0: "keep %1 between %2 and %3",
    args0: [number("X"), number("LOW"), number("HIGH")],
    output: "Number",
    ...VALUE,
  },
  {
    type: "ledger_join",
    message0: "join %1 %2",
    args0: [
      { type: "input_value", name: "A", check: ["String", "Number"] },
      { type: "input_value", name: "B", check: ["String", "Number"] },
    ],
    output: "String",
    ...VALUE,
  },
  {
    type: "ledger_text_length",
    message0: "length of %1",
    args0: [{ type: "input_value", name: "TEXT", check: "String" }],
    output: "Number",
    ...VALUE,
    tooltip: "The text's length in bytes.",
  },
  {
    type: "ledger_compare",
    message0: "%1 %2 %3",
    args0: [
      number("A"),
      {
        type: "field_dropdown",
        name: "OP",
        options: [
          ["<", "LT"],
          ["≤", "LTE"],
          [">", "GT"],
          ["≥", "GTE"],
          ["=", "EQ"],
          ["≠", "NEQ"],
        ],
      },
      number("B"),
    ],
    output: "Boolean",
    ...VALUE,
  },
  {
    type: "ledger_text_is",
    message0: "%1 %2 %3",
    args0: [
      { type: "input_value", name: "A", check: "String" },
      {
        type: "field_dropdown",
        name: "OP",
        options: [
          ["is", "EQ"],
          ["isn't", "NEQ"],
        ],
      },
      { type: "input_value", name: "B", check: "String" },
    ],
    output: "Boolean",
    ...VALUE,
  },
];
