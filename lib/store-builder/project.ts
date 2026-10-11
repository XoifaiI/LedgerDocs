// A builder project: one store. The sidebar edits everything here, and blocks hold the logic
// (ops, checks, migrations). Blocks point at data fields by uid, so renaming a field never breaks
// them. Numbers stay as the text their inputs hold: "" means Ledger's default.

import type { Casing } from "./casing";

export type FieldType =
  | "number"
  | "string"
  | "boolean"
  | "counts"
  | "set"
  | "list"
  | "luau";

export type DataField = {
  uid: string;
  name: string;
  type: FieldType;
  // The starting value: a number, a text, "true"/"false", or for "luau" a Luau expression.
  def: string;
  // Only for "luau": the field's Luau type.
  luauType: string;
};

export type BalanceKind = {
  uid: string;
  kind: string;
  // A kind's own limits, in place of the field's. "" uses the field's.
  min: string;
  max: string;
};

export type Balance = {
  uid: string;
  // The data field's uid.
  field: string;
  credit: BalanceKind[];
  debit: BalanceKind[];
  min: string;
  max: string;
  // A require path for a custom Arithmetic, like ReplicatedStorage.BigNumber. "" is whole numbers.
  arithmetic: string;
};

export type Total = { uid: string; name: string; shards: string };

export type QuantityMode = "Final" | "Open";

export type Quantity = {
  uid: string;
  name: string;
  mode: QuantityMode;
  parts: string;
  // Final only.
  stock: string;
  serials: boolean;
  serialsFirst: string;
  // Balance field uids that a take's Price is paid into.
  proceeds: string[];
  closed: boolean;
};

export type Window = {
  uid: string;
  kind: string;
  timed: string;
  untimed: string;
};

export type Timing = {
  saveInterval: string;
  idleReadInterval: string;
  holdMax: string;
  orphanAge: string;
  cutWindow: string;
  legLimit: string;
  windows: Window[];
};

export type Keys = "Player" | "String";

export type Project = {
  version: 2;
  store: {
    name: string;
    keys: Keys;
    variable: string;
    dataType: string;
    opsType: string;
    mustExist: boolean;
    erasable: boolean;
    // Where the game keeps Ledger, like ReplicatedStorage.Ledger.
    ledgerPath: string;
    // How the module names its own handlers and locals.
    casing: Casing;
  };
  fields: DataField[];
  balances: Balance[];
  totals: Total[];
  quantities: Quantity[];
  // Player stores only.
  players: {
    kick: boolean;
    kickMessage: string;
    warnOnLoadFailed: boolean;
  };
  timing: Timing;
  mock: {
    enabled: boolean;
    studioOnly: boolean;
    path: string;
    players: string;
  };
};

export const FIELD_TYPE_ORDER: FieldType[] = [
  "number",
  "string",
  "boolean",
  "counts",
  "set",
  "list",
  "luau",
];

// Each type's label, its Luau type, and a hint for the ones whose name doesn't say enough.
export const FIELD_TYPES: Record<
  FieldType,
  { label: string; luau: string; hint: string }
> = {
  number: { label: "number", luau: "number", hint: "" },
  string: { label: "text", luau: "string", hint: "" },
  boolean: { label: "true/false", luau: "boolean", hint: "" },
  counts: {
    label: "counts",
    luau: "{ [string]: number }",
    hint: "A number for each name, like an inventory.",
  },
  set: {
    label: "set",
    luau: "{ [string]: boolean }",
    hint: "Names, each one in it once.",
  },
  list: {
    label: "list",
    luau: "{ string }",
    hint: "Texts in order, oldest first.",
  },
  luau: {
    label: "Luau type",
    luau: "",
    hint: "Any Luau type, with a Luau expression to start from. Blocks can't use it.",
  },
};

export function luauTypeOf(field: DataField): string {
  return field.type === "luau" ? field.luauType : FIELD_TYPES[field.type].luau;
}

export function makeUid(): string {
  return crypto.randomUUID().slice(0, 8);
}

export function emptyTiming(): Timing {
  return {
    saveInterval: "",
    idleReadInterval: "",
    holdMax: "",
    orphanAge: "",
    cutWindow: "",
    legLimit: "",
    windows: [],
  };
}

export function emptyProject(): Project {
  return {
    version: 2,
    store: {
      name: "PlayerData",
      keys: "Player",
      variable: "PlayerStore",
      dataType: "PlayerData",
      opsType: "PlayerOps",
      mustExist: false,
      erasable: true,
      ledgerPath: "ReplicatedStorage.Ledger",
      casing: "pascal",
    },
    fields: [],
    balances: [],
    totals: [],
    quantities: [],
    players: { kick: true, kickMessage: "", warnOnLoadFailed: true },
    timing: emptyTiming(),
    mock: {
      enabled: false,
      studioOnly: true,
      path: "ReplicatedStorage.Packages.Mock",
      players: "10",
    },
  };
}

// A saved project with any setting added since it was saved filled in from the defaults.
export function withDefaults(saved: Project): Project {
  const empty = emptyProject();
  return {
    ...empty,
    ...saved,
    store: { ...empty.store, ...saved.store },
    players: { ...empty.players, ...saved.players },
    timing: { ...empty.timing, ...saved.timing },
    mock: { ...empty.mock, ...saved.mock },
  };
}

export function fieldByUid(
  project: Project,
  uid: string,
): DataField | undefined {
  return project.fields.find((field) => field.uid === uid);
}

// Every balance kind, in the order the sidebar lists them.
export function balanceKinds(
  project: Project,
): { kind: BalanceKind; balance: Balance; direction: "Credit" | "Debit" }[] {
  return project.balances.flatMap((balance) => [
    ...balance.credit.map((kind) => ({
      kind,
      balance,
      direction: "Credit" as const,
    })),
    ...balance.debit.map((kind) => ({
      kind,
      balance,
      direction: "Debit" as const,
    })),
  ]);
}
