// What an op changes, one block per kind of field so a value of the wrong type can't snap in.

const STEP = {
  previousStatement: "Step",
  nextStatement: "Step",
  inputsInline: true,
  style: "changes_blocks",
};

const field = (kind: string) => ({
  type: "field_ledger",
  name: "FIELD",
  kinds: [kind],
});

export const CHANGE_BLOCKS = [
  {
    type: "ledger_add",
    message0: "add %1 to %2",
    args0: [
      { type: "input_value", name: "VALUE", check: "Number" },
      field("number"),
    ],
    ...STEP,
  },
  {
    type: "ledger_subtract",
    message0: "subtract %1 from %2",
    args0: [
      { type: "input_value", name: "VALUE", check: "Number" },
      field("number"),
    ],
    ...STEP,
    tooltip: "Takes the amount away. Check they have it with only if first.",
  },
  {
    type: "ledger_set_number",
    message0: "set %1 to %2",
    args0: [
      field("number"),
      { type: "input_value", name: "VALUE", check: "Number" },
    ],
    ...STEP,
  },
  {
    type: "ledger_set_text",
    message0: "set %1 to %2",
    args0: [
      field("string"),
      { type: "input_value", name: "VALUE", check: "String" },
    ],
    ...STEP,
  },
  {
    type: "ledger_set_flag",
    message0: "set %1 to %2",
    args0: [
      field("boolean"),
      { type: "input_value", name: "VALUE", check: "Boolean" },
    ],
    ...STEP,
  },
  {
    type: "ledger_count_add",
    message0: "add %1 of %2 to %3",
    args0: [
      { type: "input_value", name: "AMOUNT", check: "Number" },
      { type: "input_value", name: "KEY", check: "String" },
      field("counts"),
    ],
    ...STEP,
  },
  {
    type: "ledger_count_take",
    message0: "take %1 of %2 from %3",
    args0: [
      { type: "input_value", name: "AMOUNT", check: "Number" },
      { type: "input_value", name: "KEY", check: "String" },
      field("counts"),
    ],
    ...STEP,
    tooltip:
      "Refuses the op if there aren't that many. Removes the name when it reaches 0.",
  },
  {
    type: "ledger_set_put",
    message0: "put %1 in %2",
    args0: [
      { type: "input_value", name: "KEY", check: "String" },
      field("set"),
    ],
    ...STEP,
  },
  {
    type: "ledger_set_take",
    message0: "take %1 out of %2",
    args0: [
      { type: "input_value", name: "KEY", check: "String" },
      field("set"),
    ],
    ...STEP,
  },
  {
    type: "ledger_list_push",
    message0: "add %1 to %2 keep last %3",
    args0: [
      { type: "input_value", name: "VALUE", check: "String" },
      field("list"),
      { type: "field_number", name: "KEEP", value: 1000, min: 0, precision: 1 },
    ],
    ...STEP,
    tooltip:
      "Adds to the end. Keep last forgets the oldest past that many, so the list can't grow forever. 0 keeps them all.",
  },
  {
    type: "ledger_list_remove",
    message0: "remove %1 from %2",
    args0: [
      { type: "input_value", name: "VALUE", check: "String" },
      field("list"),
    ],
    ...STEP,
  },
];
