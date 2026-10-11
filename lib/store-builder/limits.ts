// Ledger's config limits, copied from e:\src\Ledger\src so the builder refuses what Ledger.New
// would throw on. Each one names the constant it mirrors.

// Constants/Record.luau: StoreNameBytesMost, CounterStore, KeyNameBytesMost, Ceiling.
export const STORE_NAME_BYTES_MOST = 50;
export const COUNTER_STORE = "Ledger$N";
export const KEY_NAME_BYTES_MOST = 37;
export const CEILING = 2_592_000;

// Constants/Hot.luau: PartsLeast, PartsMost, ProceedsMax. Units live in a part's "u" field.
export const PARTS_LEAST = 1;
export const PARTS_MOST = 64;
export const PROCEEDS_MAX = 4;
export const UNITS_FIELD = "u";

// Constants/Extras.luau: ShardsLeast, ShardsMost, ShardsDefault.
export const SHARDS_LEAST = 1;
export const SHARDS_MOST = 64;
export const SHARDS_DEFAULT = 16;

// Constants/Record.luau: MoneyMax. Api/Validate/Cross.luau gives one slot to a part's units once
// any quantity exists.
export const BALANCE_FIELDS_MOST = 64;

// Tx/Legs/Arithmetic.luau: the default arithmetic's whole numbers.
export const WHOLE_MOST = 2 ** 53 - 1;

// Constants/Settable.luau, with Constants/Transaction.luau for OrphanAge.
export const TIMINGS = {
  SaveInterval: { least: 1, most: CEILING, fallback: 30 },
  IdleReadInterval: { least: 1, most: CEILING, fallback: 120 },
  HoldMax: { least: 1, most: CEILING, fallback: 900 },
  OrphanAge: { least: 3600, most: 2_591_940, fallback: 86_400 },
  CutWindow: { least: 318, most: CEILING, fallback: 360 },
} as const;

// Constants/Record.luau: TimedWindowLeast, UntimedWindowLeast; Settable's TimedWindow default.
export const TIMED_WINDOW_LEAST = 136;
export const UNTIMED_WINDOW_LEAST = 76;
export const TIMED_WINDOW_DEFAULT = 180;

// Api/Validate/Cross.luau: a timed window must end before an orphaned trade is given up on.
export const ORPHAN_WINDOW_SLACK = 60;

// Constants/Transaction.luau: LegLeast.
export const LEG_LEAST = 2;

// Constants/OwnOpKinds.luau: kinds Ledger uses itself.
export const RESERVED_KINDS = [
  "Open",
  "Take",
  "Credit",
  "Close",
  "Hold",
  "Confirm",
  "Release",
  "Bump",
  "Cut",
];
export const DEBIT_PREFIX = "Debit:";

// Constants/Messages.luau: KickMessageDefault.
export const DEFAULT_KICK_MESSAGE =
  "Your data could not be loaded. Please rejoin.";
