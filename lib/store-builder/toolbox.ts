// The toolbox. Changes and Data are dynamic, like Scratch's variables palette: they show blocks
// for the kinds of field the store has, already pointing at those fields.

import type { Blockly } from "./blockly";
import type { FieldType, Project } from "./project";

type Item = Blockly.utils.toolbox.FlyoutItemInfo;

const number = (value: number) => ({
  shadow: { type: "math_number", fields: { NUM: value } },
});
const text = (value: string) => ({
  shadow: { type: "text", fields: { TEXT: value } },
});
const label = (words: string): Item => ({ kind: "label", text: words });
const block = (
  type: string,
  extra: Partial<Blockly.utils.toolbox.BlockInfo> = {},
): Item => ({
  kind: "block",
  type,
  ...extra,
});

export const CHANGES_CATEGORY = "LEDGER_CHANGES";
export const DATA_CATEGORY = "LEDGER_DATA";

export const TOOLBOX = {
  kind: "categoryToolbox",
  contents: [
    {
      kind: "category",
      name: "Ops",
      categorystyle: "ops",
      contents: [
        block("ledger_op"),
        block("ledger_param"),
        block("ledger_param", { fields: { NAME: "Item", TYPE: "string" } }),
        label("Read what the op carries"),
        block("ledger_op_number"),
        block("ledger_op_text"),
        block("ledger_op_flag"),
      ],
    },
    {
      kind: "category",
      name: "Checks",
      categorystyle: "checks",
      contents: [
        block("ledger_check"),
        block("ledger_must", { inputs: { MESSAGE: text("Broke a rule") } }),
      ],
    },
    {
      kind: "category",
      name: "Migrations",
      categorystyle: "migrations",
      contents: [
        block("ledger_migration"),
        label("New fields"),
        block("ledger_migrate_add"),
        label("Breaking changes"),
        block("ledger_migrate_rename"),
        block("ledger_migrate_remove"),
        block("ledger_migrate_set_number", { inputs: { VALUE: number(0) } }),
        block("ledger_migrate_set_text", { inputs: { VALUE: text("") } }),
        block("ledger_migrate_set_flag"),
        label("Read the old data"),
        block("ledger_saved_number"),
        block("ledger_saved_text"),
        block("ledger_saved_flag"),
      ],
    },
    { kind: "sep" },
    {
      kind: "category",
      name: "Control",
      categorystyle: "control",
      contents: [
        block("ledger_only_if"),
        block("ledger_if"),
        block("ledger_refuse"),
        label("Loops"),
        block("ledger_for_counts"),
        block("ledger_for_set"),
        block("ledger_for_list"),
        block("ledger_each_name"),
        block("ledger_each_count"),
        block("ledger_each_item"),
      ],
    },
    {
      kind: "category",
      name: "Changes",
      categorystyle: "changes",
      custom: CHANGES_CATEGORY,
    },
    { kind: "sep" },
    {
      kind: "category",
      name: "Data",
      categorystyle: "data",
      custom: DATA_CATEGORY,
    },
    {
      kind: "category",
      name: "Values",
      categorystyle: "values",
      contents: [
        label("Numbers"),
        block("math_number"),
        block("ledger_arithmetic", { inputs: { A: number(1), B: number(1) } }),
        block("ledger_math_single", { inputs: { X: number(1) } }),
        block("ledger_min_max", { inputs: { A: number(1), B: number(1) } }),
        block("ledger_clamp", {
          inputs: { X: number(1), LOW: number(0), HIGH: number(100) },
        }),
        label("Text"),
        block("text"),
        block("ledger_join", {
          inputs: { A: text("Hello "), B: text("there") },
        }),
        block("ledger_text_length", { inputs: { TEXT: text("") } }),
        label("Logic"),
        block("ledger_compare", { inputs: { A: number(1), B: number(1) } }),
        block("ledger_text_is", { inputs: { A: text(""), B: text("") } }),
        block("logic_operation"),
        block("logic_negate"),
        block("logic_boolean"),
      ],
    },
  ],
};

function fieldsOf(project: Project, type: FieldType) {
  return project.fields.filter((field) => field.type === type && field.name);
}

// The Changes palette: each group shows once the store has a field of its kind.
export function changesFlyout(project: Project): Item[] {
  const items: Item[] = [];
  const group = (
    type: FieldType,
    title: string,
    make: (uid: string) => Item[],
  ) => {
    const fields = fieldsOf(project, type);
    if (fields.length > 0) {
      items.push(label(title), ...make(fields[0].uid));
    }
  };
  group("number", "Numbers", (uid) => [
    block("ledger_add", {
      fields: { FIELD: uid },
      inputs: { VALUE: number(1) },
    }),
    block("ledger_subtract", {
      fields: { FIELD: uid },
      inputs: { VALUE: number(1) },
    }),
    block("ledger_set_number", {
      fields: { FIELD: uid },
      inputs: { VALUE: number(0) },
    }),
  ]);
  group("string", "Text", (uid) => [
    block("ledger_set_text", {
      fields: { FIELD: uid },
      inputs: { VALUE: text("") },
    }),
  ]);
  group("boolean", "True/false", (uid) => [
    block("ledger_set_flag", { fields: { FIELD: uid } }),
  ]);
  group("counts", "Counts", (uid) => [
    block("ledger_count_add", {
      fields: { FIELD: uid },
      inputs: { AMOUNT: number(1) },
    }),
    block("ledger_count_take", {
      fields: { FIELD: uid },
      inputs: { AMOUNT: number(1) },
    }),
  ]);
  group("set", "Sets", (uid) => [
    block("ledger_set_put", { fields: { FIELD: uid } }),
    block("ledger_set_take", { fields: { FIELD: uid } }),
  ]);
  group("list", "Lists", (uid) => [
    block("ledger_list_push", { fields: { FIELD: uid } }),
    block("ledger_list_remove", { fields: { FIELD: uid } }),
  ]);
  return items.length > 0
    ? items
    : [label("Add a field in Data, and its changes show here.")];
}

// The Data palette: one reporter per field, then the reads for tables.
export function dataFlyout(project: Project): Item[] {
  const items: Item[] = [];
  const reads: Item[] = [];
  for (const field of project.fields) {
    if (!field.name) {
      continue;
    }
    const fields = { FIELD: field.uid };
    if (field.type === "number") {
      reads.push(block("ledger_get_number", { fields }));
    } else if (field.type === "string") {
      reads.push(block("ledger_get_text", { fields }));
    } else if (field.type === "boolean") {
      reads.push(block("ledger_get_flag", { fields }));
    }
  }
  if (reads.length > 0) {
    items.push(label("Saved data"), ...reads);
  }
  const tables: Item[] = [];
  const counts = fieldsOf(project, "counts")[0];
  if (counts) {
    tables.push(block("ledger_count_of", { fields: { FIELD: counts.uid } }));
  }
  const set = fieldsOf(project, "set")[0];
  if (set) {
    tables.push(block("ledger_set_has", { fields: { FIELD: set.uid } }));
  }
  const list = fieldsOf(project, "list")[0];
  if (list) {
    tables.push(
      block("ledger_list_has", { fields: { FIELD: list.uid } }),
      block("ledger_list_size", { fields: { FIELD: list.uid } }),
    );
  }
  if (tables.length > 0) {
    items.push(label("Inside tables"), ...tables);
  }
  return items.length > 0
    ? items
    : [label("Add a field in Data, and it shows here.")];
}
