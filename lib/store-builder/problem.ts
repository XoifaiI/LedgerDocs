// What the builder tells you is wrong, and where. A setting problem points at a sidebar input by
// its element id; a block problem points at a block on the canvas.

export type SectionId =
  | "store"
  | "data"
  | "balances"
  | "totals"
  | "quantities"
  | "players"
  | "timing";

export type SettingProblem = {
  kind: "setting";
  section: SectionId;
  // The id of the input to focus.
  target: string;
  message: string;
};

export type BlockProblem = {
  kind: "block";
  blockId: string;
  message: string;
};

export type Problem = SettingProblem | BlockProblem;

// Input ids, shared by the sidebar and the problems that point at it.
export const settingId = {
  store: (part: string) => `builder-store-${part}`,
  field: (uid: string, part: string) => `builder-field-${uid}-${part}`,
  balance: (uid: string, part: string) => `builder-balance-${uid}-${part}`,
  kind: (uid: string) => `builder-kind-${uid}`,
  total: (uid: string, part: string) => `builder-total-${uid}-${part}`,
  quantity: (uid: string, part: string) => `builder-quantity-${uid}-${part}`,
  players: (part: string) => `builder-players-${part}`,
  timing: (part: string) => `builder-timing-${part}`,
  window: (uid: string, part: string) => `builder-window-${uid}-${part}`,
  mock: (part: string) => `builder-mock-${part}`,
};
