// Reads of the saved data, typed by the field so they only snap where that type fits.

const READ = { inputsInline: true, style: "data_blocks" };

const field = (kind: string) => ({
  type: "field_ledger",
  name: "FIELD",
  kinds: [kind],
});

export const DATA_BLOCKS = [
  {
    type: "ledger_get_number",
    message0: "%1",
    args0: [field("number")],
    output: "Number",
    ...READ,
  },
  {
    type: "ledger_get_text",
    message0: "%1",
    args0: [field("string")],
    output: "String",
    ...READ,
  },
  {
    type: "ledger_get_flag",
    message0: "%1",
    args0: [field("boolean")],
    output: "Boolean",
    ...READ,
  },
  {
    type: "ledger_count_of",
    message0: "count of %1 in %2",
    args0: [
      { type: "input_value", name: "KEY", check: "String" },
      field("counts"),
    ],
    output: "Number",
    ...READ,
    tooltip: "How many of that name there are. 0 when there are none.",
  },
  {
    type: "ledger_set_has",
    message0: "%1 has %2",
    args0: [
      field("set"),
      { type: "input_value", name: "KEY", check: "String" },
    ],
    output: "Boolean",
    ...READ,
  },
  {
    type: "ledger_list_has",
    message0: "%1 contains %2",
    args0: [
      field("list"),
      { type: "input_value", name: "VALUE", check: "String" },
    ],
    output: "Boolean",
    ...READ,
  },
  {
    type: "ledger_list_size",
    message0: "size of %1",
    args0: [field("list")],
    output: "Number",
    ...READ,
  },
];
