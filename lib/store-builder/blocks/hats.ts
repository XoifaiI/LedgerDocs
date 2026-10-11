// The three hats, and the blocks that only make sense under one: op params and op fields, the
// must rule of a check, and migration steps. Definitions use Blockly's JSON format.

const PARAM_TYPES = [
  ["number", "number"],
  ["text", "string"],
  ["true/false", "boolean"],
];

export const HAT_BLOCKS = [
  {
    type: "ledger_op",
    message0: "op %1",
    args0: [{ type: "field_input", name: "NAME", text: "NewOp" }],
    message1: "takes %1",
    args1: [{ type: "input_statement", name: "PARAMS", check: "Param" }],
    message2: "does %1",
    args2: [{ type: "input_statement", name: "DO", check: "Step" }],
    style: "ops_hat",
    tooltip:
      "One kind of change your game can send. What it carries goes under takes, what it does under does.",
  },
  {
    type: "ledger_param",
    message0: "%1 %2",
    args0: [
      { type: "field_input", name: "NAME", text: "Amount" },
      { type: "field_dropdown", name: "TYPE", options: PARAM_TYPES },
    ],
    previousStatement: "Param",
    nextStatement: "Param",
    style: "ops_blocks",
    tooltip: "Something the op carries, like the price of an item.",
  },
  {
    type: "ledger_op_number",
    message0: "op %1",
    args0: [{ type: "field_ledger_param", name: "PARAM", param: "number" }],
    output: "Number",
    style: "ops_blocks",
    tooltip: "A number the op carries.",
  },
  {
    type: "ledger_op_text",
    message0: "op %1",
    args0: [{ type: "field_ledger_param", name: "PARAM", param: "string" }],
    output: "String",
    style: "ops_blocks",
    tooltip: "A text the op carries.",
  },
  {
    type: "ledger_op_flag",
    message0: "op %1",
    args0: [{ type: "field_ledger_param", name: "PARAM", param: "boolean" }],
    output: "Boolean",
    style: "ops_blocks",
    tooltip: "A true/false the op carries.",
  },
  {
    type: "ledger_check",
    message0: "every op's result %1",
    args0: [{ type: "input_dummy" }],
    message1: "%1",
    args1: [{ type: "input_statement", name: "DO", check: "Step" }],
    style: "checks_hat",
    tooltip:
      "Rules for the data your ops make. A result that breaks one is refused. Balance ops and migrations skip these.",
  },
  {
    type: "ledger_must",
    message0: "must %1 or refuse saying %2",
    args0: [
      { type: "input_value", name: "COND", check: "Boolean" },
      { type: "input_value", name: "MESSAGE", check: "String" },
    ],
    previousStatement: "Step",
    nextStatement: "Step",
    inputsInline: true,
    style: "checks_blocks",
    tooltip:
      "Refuses the result unless this is true. Ledger warns with the message.",
  },
  {
    type: "ledger_migration",
    message0: "migration %1",
    args0: [
      { type: "field_number", name: "INDEX", value: 1, min: 1, precision: 1 },
    ],
    message1: "%1",
    args1: [{ type: "input_statement", name: "DO", check: "MigrationStep" }],
    style: "migrations_hat",
    tooltip:
      "One change to the data's shape. Number them 1, 2, 3 in the order they shipped, and never change one that has.",
  },
  {
    type: "ledger_migrate_add",
    message0: "add field %1",
    args0: [
      {
        type: "field_ledger",
        name: "FIELD",
        kinds: ["number", "string", "boolean", "counts", "set", "list", "luau"],
      },
    ],
    previousStatement: "MigrationStep",
    nextStatement: "MigrationStep",
    style: "migrations_blocks",
    tooltip: "Gives old data a new field, starting at its Default.",
  },
  {
    type: "ledger_migrate_rename",
    message0: "rename %1 to %2",
    args0: [
      { type: "field_input", name: "OLD", text: "OldName" },
      {
        type: "field_ledger",
        name: "FIELD",
        kinds: ["number", "string", "boolean", "counts", "set", "list", "luau"],
      },
    ],
    previousStatement: "MigrationStep",
    nextStatement: "MigrationStep",
    style: "migrations_blocks",
    tooltip: "Moves an old field's value to a field you have now.",
  },
  {
    type: "ledger_migrate_remove",
    message0: "remove %1",
    args0: [{ type: "field_input", name: "OLD", text: "OldName" }],
    previousStatement: "MigrationStep",
    nextStatement: "MigrationStep",
    style: "migrations_blocks",
    tooltip: "Drops a field the data no longer has.",
  },
  {
    type: "ledger_migrate_set_number",
    message0: "set %1 to %2",
    args0: [
      { type: "field_ledger", name: "FIELD", kinds: ["number"] },
      { type: "input_value", name: "VALUE", check: "Number" },
    ],
    previousStatement: "MigrationStep",
    nextStatement: "MigrationStep",
    inputsInline: true,
    style: "migrations_blocks",
  },
  {
    type: "ledger_migrate_set_text",
    message0: "set %1 to %2",
    args0: [
      { type: "field_ledger", name: "FIELD", kinds: ["string"] },
      { type: "input_value", name: "VALUE", check: "String" },
    ],
    previousStatement: "MigrationStep",
    nextStatement: "MigrationStep",
    inputsInline: true,
    style: "migrations_blocks",
  },
  {
    type: "ledger_migrate_set_flag",
    message0: "set %1 to %2",
    args0: [
      { type: "field_ledger", name: "FIELD", kinds: ["boolean"] },
      { type: "input_value", name: "VALUE", check: "Boolean" },
    ],
    previousStatement: "MigrationStep",
    nextStatement: "MigrationStep",
    inputsInline: true,
    style: "migrations_blocks",
  },
  {
    type: "ledger_saved_number",
    message0: "saved number %1",
    args0: [{ type: "field_input", name: "NAME", text: "Gold" }],
    output: "Number",
    style: "migrations_blocks",
    tooltip: "A number in the old data, or 0 if it isn't a number.",
  },
  {
    type: "ledger_saved_text",
    message0: "saved text %1",
    args0: [{ type: "field_input", name: "NAME", text: "Name" }],
    output: "String",
    style: "migrations_blocks",
    tooltip: 'A text in the old data, or "" if it isn\'t a text.',
  },
  {
    type: "ledger_saved_flag",
    message0: "saved %1 is true",
    args0: [{ type: "field_input", name: "NAME", text: "Flag" }],
    output: "Boolean",
    style: "migrations_blocks",
    tooltip: "Whether a field in the old data is true.",
  },
];
