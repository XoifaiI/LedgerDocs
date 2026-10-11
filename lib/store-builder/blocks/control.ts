// Rules and loops: what decides whether an op goes ahead, and repeating over a table field.

const STEP = { previousStatement: "Step", nextStatement: "Step" };

export const CONTROL_BLOCKS = [
  {
    type: "ledger_only_if",
    message0: "only if %1",
    args0: [{ type: "input_value", name: "COND", check: "Boolean" }],
    ...STEP,
    style: "control_blocks",
    tooltip:
      "Refuses the op unless this is true. A refused op changes nothing.",
  },
  {
    type: "ledger_if",
    message0: "if %1",
    args0: [{ type: "input_value", name: "COND", check: "Boolean" }],
    message1: "%1",
    args1: [{ type: "input_statement", name: "THEN", check: "Step" }],
    message2: "else %1",
    args2: [{ type: "input_statement", name: "ELSE", check: "Step" }],
    ...STEP,
    style: "control_blocks",
  },
  {
    type: "ledger_refuse",
    message0: "refuse",
    previousStatement: "Step",
    style: "control_blocks",
    tooltip: "Refuses the op. Nothing changes.",
  },
  {
    type: "ledger_for_counts",
    message0: "for each name and count in %1",
    args0: [{ type: "field_ledger", name: "FIELD", kinds: ["counts"] }],
    message1: "%1",
    args1: [{ type: "input_statement", name: "DO", check: "Step" }],
    ...STEP,
    style: "control_blocks",
  },
  {
    type: "ledger_for_set",
    message0: "for each name in %1",
    args0: [{ type: "field_ledger", name: "FIELD", kinds: ["set"] }],
    message1: "%1",
    args1: [{ type: "input_statement", name: "DO", check: "Step" }],
    ...STEP,
    style: "control_blocks",
  },
  {
    type: "ledger_for_list",
    message0: "for each item in %1",
    args0: [{ type: "field_ledger", name: "FIELD", kinds: ["list"] }],
    message1: "%1",
    args1: [{ type: "input_statement", name: "DO", check: "Step" }],
    ...STEP,
    style: "control_blocks",
  },
  {
    type: "ledger_each_name",
    message0: "name",
    output: "String",
    style: "control_blocks",
    tooltip: "The name the for each is on.",
  },
  {
    type: "ledger_each_count",
    message0: "count",
    output: "Number",
    style: "control_blocks",
    tooltip: "The count the for each is on.",
  },
  {
    type: "ledger_each_item",
    message0: "item",
    output: "String",
    style: "control_blocks",
    tooltip: "The item the for each is on.",
  },
];
