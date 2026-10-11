// The example store: the docs' player data, with Gold as a balance, four ops and the docs' check
// that no count drops below 1.

import { emptyProject, type Project } from "./project";

const GOLD = "gold";
const INVENTORY = "inventory";
const RECEIPTS = "receipts";
const LAST_DAILY_DAY = "last-daily-day";

export function exampleProject(): Project {
  const project = emptyProject();
  project.fields = [
    { uid: GOLD, name: "Gold", type: "number", def: "0", luauType: "" },
    {
      uid: INVENTORY,
      name: "Inventory",
      type: "counts",
      def: "",
      luauType: "",
    },
    { uid: RECEIPTS, name: "Receipts", type: "list", def: "", luauType: "" },
    {
      uid: LAST_DAILY_DAY,
      name: "LastDailyDay",
      type: "number",
      def: "0",
      luauType: "",
    },
  ];
  project.balances = [
    {
      uid: "gold-balance",
      field: GOLD,
      credit: [{ uid: "add-gold", kind: "AddGold", min: "", max: "" }],
      debit: [{ uid: "spend-gold", kind: "SpendGold", min: "", max: "" }],
      min: "",
      max: "",
      arithmetic: "",
    },
  ];
  return project;
}

type Saved = {
  type: string;
  x?: number;
  y?: number;
  fields?: Record<string, string | number>;
  inputs?: Record<string, { block?: Saved; shadow?: Saved }>;
  next?: { block: Saved };
};

const block = (
  type: string,
  fields?: Record<string, string | number> | null,
  inputs?: Record<string, Saved>,
): Saved => {
  const made: Saved = { type };
  if (fields) {
    made.fields = fields;
  }
  if (inputs) {
    made.inputs = {};
    for (const [name, child] of Object.entries(inputs)) {
      made.inputs[name] =
        child.type === "math_number" || child.type === "text"
          ? { shadow: child }
          : { block: child };
    }
  }
  return made;
};

const chain = (...blocks: Saved[]): Saved => {
  for (let index = 0; index < blocks.length - 1; index++) {
    blocks[index].next = { block: blocks[index + 1] };
  }
  return blocks[0];
};

const param = (name: string, type: string) =>
  block("ledger_param", { NAME: name, TYPE: type });
const number = (value: number) => block("math_number", { NUM: value });
const text = (value: string) => block("text", { TEXT: value });
const gold = () => block("ledger_get_number", { FIELD: GOLD });
const opNumber = (name: string) => block("ledger_op_number", { PARAM: name });
const opText = (name: string) => block("ledger_op_text", { PARAM: name });
const compare = (op: string, a: Saved, b: Saved) =>
  block("ledger_compare", { OP: op }, { A: a, B: b });

const op = (name: string, params: Saved[], steps: Saved[]): Saved =>
  block(
    "ledger_op",
    { NAME: name },
    { PARAMS: chain(...params), DO: chain(...steps) },
  );

export function exampleWorkspace(): object {
  const blocks = [
    op(
      "BuyItem",
      [param("Item", "string"), param("Price", "number")],
      [
        block("ledger_only_if", null, {
          COND: compare("GTE", gold(), opNumber("Price")),
        }),
        block("ledger_subtract", { FIELD: GOLD }, { VALUE: opNumber("Price") }),
        block(
          "ledger_count_add",
          { FIELD: INVENTORY },
          { AMOUNT: number(1), KEY: opText("Item") },
        ),
      ],
    ),
    op(
      "SellItem",
      [param("Item", "string"), param("Price", "number")],
      [
        block(
          "ledger_count_take",
          { FIELD: INVENTORY },
          { AMOUNT: number(1), KEY: opText("Item") },
        ),
        block("ledger_add", { FIELD: GOLD }, { VALUE: opNumber("Price") }),
      ],
    ),
    op(
      "GrantPurchase",
      [param("PurchaseId", "string"), param("Amount", "number")],
      [
        block("ledger_only_if", null, {
          COND: block("logic_negate", null, {
            BOOL: block(
              "ledger_list_has",
              { FIELD: RECEIPTS },
              { VALUE: opText("PurchaseId") },
            ),
          }),
        }),
        block(
          "ledger_list_push",
          { FIELD: RECEIPTS, KEEP: 1000 },
          { VALUE: opText("PurchaseId") },
        ),
        block("ledger_add", { FIELD: GOLD }, { VALUE: opNumber("Amount") }),
      ],
    ),
    op(
      "ClaimDaily",
      [param("Day", "number"), param("Amount", "number")],
      [
        block("ledger_only_if", null, {
          COND: compare(
            "GT",
            opNumber("Day"),
            block("ledger_get_number", { FIELD: LAST_DAILY_DAY }),
          ),
        }),
        block(
          "ledger_set_number",
          { FIELD: LAST_DAILY_DAY },
          { VALUE: opNumber("Day") },
        ),
        block("ledger_add", { FIELD: GOLD }, { VALUE: opNumber("Amount") }),
      ],
    ),
    block("ledger_check", null, {
      DO: block(
        "ledger_for_counts",
        { FIELD: INVENTORY },
        {
          DO: block("ledger_must", null, {
            COND: compare("GTE", block("ledger_each_count"), number(1)),
            MESSAGE: block("ledger_join", null, {
              A: block("ledger_each_name"),
              B: text(" has a count below 1"),
            }),
          }),
        },
      ),
    }),
  ];
  blocks.forEach((made, index) => {
    made.x = 24;
    made.y = 24 + index * 320;
  });
  return { blocks: { languageVersion: 0, blocks } };
}
