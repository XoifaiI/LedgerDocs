// Where each block may sit. The connection checker refuses a drag that breaks these, and
// luau/problems.ts reports blocks that got there another way, such as a saved workspace.

export const OP_HAT = "ledger_op";
export const CHECK_HAT = "ledger_check";
export const MIGRATION_HAT = "ledger_migration";

export const HAT_TYPES = [OP_HAT, CHECK_HAT, MIGRATION_HAT];

export type HatType = typeof OP_HAT | typeof CHECK_HAT | typeof MIGRATION_HAT;

const IN_OPS: readonly HatType[] = [OP_HAT];
const IN_OPS_AND_CHECKS: readonly HatType[] = [OP_HAT, CHECK_HAT];
const IN_CHECKS: readonly HatType[] = [CHECK_HAT];
const IN_MIGRATIONS: readonly HatType[] = [MIGRATION_HAT];

// Blocks missing here may sit inside any hat that has a matching connection.
export const ONLY_IN: Record<string, readonly HatType[]> = {
  ledger_op_number: IN_OPS,
  ledger_op_text: IN_OPS,
  ledger_op_flag: IN_OPS,
  ledger_only_if: IN_OPS,
  ledger_refuse: IN_OPS,
  ledger_add: IN_OPS,
  ledger_subtract: IN_OPS,
  ledger_set_number: IN_OPS,
  ledger_set_text: IN_OPS,
  ledger_set_flag: IN_OPS,
  ledger_count_add: IN_OPS,
  ledger_count_take: IN_OPS,
  ledger_set_put: IN_OPS,
  ledger_set_take: IN_OPS,
  ledger_list_push: IN_OPS,
  ledger_list_remove: IN_OPS,
  ledger_must: IN_CHECKS,
  ledger_if: IN_OPS_AND_CHECKS,
  ledger_for_counts: IN_OPS_AND_CHECKS,
  ledger_for_set: IN_OPS_AND_CHECKS,
  ledger_for_list: IN_OPS_AND_CHECKS,
  ledger_get_number: IN_OPS_AND_CHECKS,
  ledger_get_text: IN_OPS_AND_CHECKS,
  ledger_get_flag: IN_OPS_AND_CHECKS,
  ledger_count_of: IN_OPS_AND_CHECKS,
  ledger_set_has: IN_OPS_AND_CHECKS,
  ledger_list_has: IN_OPS_AND_CHECKS,
  ledger_list_size: IN_OPS_AND_CHECKS,
  ledger_saved_number: IN_MIGRATIONS,
  ledger_saved_text: IN_MIGRATIONS,
  ledger_saved_flag: IN_MIGRATIONS,
};

const HAT_PLACES: Record<HatType, string> = {
  [OP_HAT]: "an op",
  [CHECK_HAT]: "a check",
  [MIGRATION_HAT]: "a migration",
};

export function placeText(hats: readonly HatType[]): string {
  return hats.map((hat) => HAT_PLACES[hat]).join(" or ");
}

// Reporters that read a loop's names, and the loops that give each one.
export const LOOP_READS: Record<string, readonly string[]> = {
  ledger_each_name: ["ledger_for_counts", "ledger_for_set"],
  ledger_each_count: ["ledger_for_counts"],
  ledger_each_item: ["ledger_for_list"],
};

// Op-field reporters and the param type each reads.
export const OP_READS: Record<string, "number" | "string" | "boolean"> = {
  ledger_op_number: "number",
  ledger_op_text: "string",
  ledger_op_flag: "boolean",
};

// Changes that write a table field, so the op clones that table first.
export const TABLE_WRITES = [
  "ledger_count_add",
  "ledger_count_take",
  "ledger_set_put",
  "ledger_set_take",
  "ledger_list_push",
  "ledger_list_remove",
];

// Migration steps, split by the kind of migration they make.
export const ADD_STEPS = ["ledger_migrate_add"];
export const BREAKING_STEPS = [
  "ledger_migrate_rename",
  "ledger_migrate_remove",
  "ledger_migrate_set_number",
  "ledger_migrate_set_text",
  "ledger_migrate_set_flag",
];
