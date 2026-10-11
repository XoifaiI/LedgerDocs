// Checks a project's settings the way Ledger.New does (Api/Validate/Setup.luau and Cross.luau),
// so a store the builder accepts never throws when the game makes it. Block problems live in
// luau/problems.ts.

import {
  BALANCE_FIELDS_MOST,
  CEILING,
  COUNTER_STORE,
  DEBIT_PREFIX,
  KEY_NAME_BYTES_MOST,
  LEG_LEAST,
  ORPHAN_WINDOW_SLACK,
  PARTS_LEAST,
  PARTS_MOST,
  PROCEEDS_MAX,
  RESERVED_KINDS,
  SHARDS_LEAST,
  SHARDS_MOST,
  STORE_NAME_BYTES_MOST,
  TIMED_WINDOW_LEAST,
  TIMINGS,
  UNITS_FIELD,
  UNTIMED_WINDOW_LEAST,
  WHOLE_MOST,
} from "./limits";
import {
  isRequirePath,
  LUAU_GLOBALS,
  LUAU_TYPES,
  MODULE_NAMES,
  nameProblem,
  utf8Bytes,
} from "./luau-names";
import type { SectionId, SettingProblem } from "./problem";
import { settingId } from "./problem";
import { balanceKinds, fieldByUid, type Project } from "./project";

// What the blocks define, which some settings must agree with.
export type BlockFacts = {
  opKinds: string[];
};

export function parseWhole(text: string): number | null {
  const trimmed = text.trim();
  if (!/^-?\d+$/.test(trimmed)) {
    return null;
  }
  const value = Number(trimmed);
  return Number.isSafeInteger(value) ? value : null;
}

// Why a kind name can't be used, or null.
export function kindProblem(kind: string): string | null {
  if (RESERVED_KINDS.includes(kind)) {
    return `${kind} is one of Ledger's own op kinds. Pick another name.`;
  }
  if (kind.startsWith(DEBIT_PREFIX)) {
    return `Kinds can't start with ${DEBIT_PREFIX}`;
  }
  return nameProblem(kind, "kind");
}

export function validateProject(
  project: Project,
  facts: BlockFacts,
): SettingProblem[] {
  const problems: SettingProblem[] = [];
  const add = (section: SectionId, target: string, message: string) =>
    problems.push({ kind: "setting", section, target, message });

  // A whole number in [least, most], or "" when blank is allowed.
  const whole = (
    section: SectionId,
    target: string,
    text: string,
    least: number,
    most: number,
    blankAllowed: boolean,
  ): number | null => {
    if (text.trim() === "") {
      if (!blankAllowed) {
        add(section, target, "Fill this in.");
      }
      return null;
    }
    const value = parseWhole(text);
    if (value === null || value < least || value > most) {
      add(
        section,
        target,
        most >= WHOLE_MOST
          ? `Use a whole number from ${least.toLocaleString("en")} up.`
          : `Use a whole number from ${least.toLocaleString("en")} to ${most.toLocaleString("en")}.`,
      );
      return null;
    }
    return value;
  };

  // Store
  const { store } = project;
  const nameBytes = utf8Bytes(store.name);
  if (nameBytes === 0) {
    add("store", settingId.store("name"), "Give the store a name.");
  } else if (nameBytes > STORE_NAME_BYTES_MOST) {
    add(
      "store",
      settingId.store("name"),
      `The name is ${nameBytes} bytes. Ledger allows ${STORE_NAME_BYTES_MOST}.`,
    );
  } else if (store.name === COUNTER_STORE) {
    add(
      "store",
      settingId.store("name"),
      `${COUNTER_STORE} is Ledger's own store. Pick another name.`,
    );
  }

  const moduleNames: [string, string, string][] = [
    [store.variable, "variable", "store variable"],
    [store.dataType, "data-type", "data type"],
    [store.opsType, "ops-type", "ops type"],
  ];
  const seenModuleNames = new Set<string>();
  for (const [text, part, what] of moduleNames) {
    const problem =
      nameProblem(text, what) ??
      (MODULE_NAMES.includes(text) ||
      LUAU_GLOBALS.includes(text) ||
      LUAU_TYPES.includes(text)
        ? `The module already uses ${text}. Pick another name.`
        : seenModuleNames.has(text)
          ? `${text} is already taken by another name here.`
          : null);
    if (problem) {
      add("store", settingId.store(part), problem);
    }
    seenModuleNames.add(text);
  }
  if (!isRequirePath(store.ledgerPath)) {
    add(
      "store",
      settingId.store("ledger-path"),
      "Use a path like ReplicatedStorage.Ledger.",
    );
  }

  // Data
  const balanceFieldUids = new Set(
    project.balances.map((balance) => balance.field),
  );
  const fieldNames = new Set<string>();
  for (const field of project.fields) {
    const problem = nameProblem(field.name, "field");
    if (problem) {
      add("data", settingId.field(field.uid, "name"), problem);
    } else if (fieldNames.has(field.name)) {
      add(
        "data",
        settingId.field(field.uid, "name"),
        `Two fields are called ${field.name}.`,
      );
    }
    fieldNames.add(field.name);

    const balance = project.balances.find(
      (candidate) => candidate.field === field.uid,
    );
    if (field.type === "number" && field.def.trim() !== "") {
      const value = Number(field.def);
      if (!Number.isFinite(value)) {
        add("data", settingId.field(field.uid, "default"), "Use a number.");
      } else if (
        balanceFieldUids.has(field.uid) &&
        !balance?.arithmetic &&
        (!Number.isInteger(value) || Math.abs(value) > WHOLE_MOST)
      ) {
        add(
          "data",
          settingId.field(field.uid, "default"),
          "A balance starts at a whole number.",
        );
      }
    }
    if (field.type === "luau") {
      if (field.luauType.trim() === "") {
        add(
          "data",
          settingId.field(field.uid, "luau-type"),
          "Give it a Luau type.",
        );
      }
      if (field.def.trim() === "") {
        add(
          "data",
          settingId.field(field.uid, "default"),
          "Give it a Luau expression to start from.",
        );
      }
    }
  }

  // Balances
  const kindsSeen = new Set<string>();
  const balancedFields = new Set<string>();
  for (const balance of project.balances) {
    const field = fieldByUid(project, balance.field);
    if (!field) {
      add("balances", settingId.balance(balance.uid, "field"), "Pick a field.");
    } else {
      if (field.type !== "number" && field.type !== "luau") {
        add(
          "balances",
          settingId.balance(balance.uid, "field"),
          `${field.name} isn't a number field.`,
        );
      }
      if (field.type === "luau" && balance.arithmetic === "") {
        add(
          "balances",
          settingId.balance(balance.uid, "arithmetic"),
          "A Luau type field needs an Arithmetic.",
        );
      }
      if (balancedFields.has(field.uid)) {
        add(
          "balances",
          settingId.balance(balance.uid, "field"),
          `${field.name} already has a balance.`,
        );
      }
      balancedFields.add(field.uid);
    }
    if (balance.arithmetic !== "" && !isRequirePath(balance.arithmetic)) {
      add(
        "balances",
        settingId.balance(balance.uid, "arithmetic"),
        "Use a path like ReplicatedStorage.BigNumber.",
      );
    }
    if (balance.credit.length === 0 && balance.debit.length === 0) {
      add(
        "balances",
        settingId.balance(balance.uid, "credit"),
        "Add a Credit or Debit kind, or this balance does nothing.",
      );
    }

    // Whole-number limits. A custom Arithmetic takes Luau expressions instead.
    const limit = (text: string, target: string): number | null =>
      balance.arithmetic === ""
        ? whole("balances", target, text, -WHOLE_MOST, WHOLE_MOST, true)
        : null;
    const fieldMin = limit(balance.min, settingId.balance(balance.uid, "min"));
    const fieldMax = limit(balance.max, settingId.balance(balance.uid, "max"));
    if (fieldMin !== null && fieldMax !== null && fieldMin > fieldMax) {
      add(
        "balances",
        settingId.balance(balance.uid, "min"),
        "Min is above Max.",
      );
    }
    for (const kind of [...balance.credit, ...balance.debit]) {
      const problem = kindProblem(kind.kind);
      if (problem) {
        add("balances", settingId.kind(kind.uid), problem);
      } else if (kindsSeen.has(kind.kind)) {
        add(
          "balances",
          settingId.kind(kind.uid),
          `${kind.kind} is named twice. Each kind can only be named once.`,
        );
      }
      kindsSeen.add(kind.kind);
      const min =
        limit(kind.min, settingId.kind(`${kind.uid}-min`)) ??
        fieldMin ??
        (balance.arithmetic === "" ? 0 : null);
      const max =
        limit(kind.max, settingId.kind(`${kind.uid}-max`)) ??
        fieldMax ??
        (balance.arithmetic === "" ? WHOLE_MOST : null);
      if (min !== null && max !== null && min > max) {
        add(
          "balances",
          settingId.kind(kind.uid),
          `${kind.kind}'s Min is above its Max.`,
        );
      }
    }
  }
  const balanceMost =
    project.quantities.length > 0
      ? BALANCE_FIELDS_MOST - 1
      : BALANCE_FIELDS_MOST;
  if (project.balances.length > balanceMost) {
    add(
      "balances",
      settingId.balance(project.balances[balanceMost].uid, "field"),
      `A store can have ${balanceMost} balances${project.quantities.length > 0 ? " when it has quantities" : ""}.`,
    );
  }

  // Totals and quantities share one set of names.
  const keyNames = new Map<string, "total" | "quantity">();
  const keyName = (
    section: SectionId,
    target: string,
    name: string,
    what: "total" | "quantity",
  ) => {
    const bytes = utf8Bytes(name);
    if (bytes === 0) {
      add(section, target, `Give the ${what} a name.`);
    } else if (bytes > KEY_NAME_BYTES_MOST) {
      add(
        section,
        target,
        `The name is ${bytes} bytes. Ledger allows ${KEY_NAME_BYTES_MOST}.`,
      );
    } else if (keyNames.has(name)) {
      add(
        section,
        target,
        keyNames.get(name) === what
          ? `Two ${what === "total" ? "totals" : "quantities"} are called ${name}.`
          : `A ${keyNames.get(name)} is already called ${name}.`,
      );
    }
    keyNames.set(name, what);
  };

  for (const total of project.totals) {
    keyName("totals", settingId.total(total.uid, "name"), total.name, "total");
    whole(
      "totals",
      settingId.total(total.uid, "shards"),
      total.shards,
      SHARDS_LEAST,
      SHARDS_MOST,
      true,
    );
  }

  for (const quantity of project.quantities) {
    const id = (part: string) => settingId.quantity(quantity.uid, part);
    keyName("quantities", id("name"), quantity.name, "quantity");
    whole(
      "quantities",
      id("parts"),
      quantity.parts,
      PARTS_LEAST,
      PARTS_MOST,
      false,
    );
    if (quantity.mode === "Final") {
      const stock = whole(
        "quantities",
        id("stock"),
        quantity.stock,
        0,
        WHOLE_MOST,
        false,
      );
      if (quantity.serials) {
        const first = whole(
          "quantities",
          id("serials-first"),
          quantity.serialsFirst,
          0,
          WHOLE_MOST - 1,
          false,
        );
        if (stock !== null && stock < 1) {
          add("quantities", id("stock"), "Serials need a Stock of 1 or more.");
        } else if (
          stock !== null &&
          first !== null &&
          stock > WHOLE_MOST - first
        ) {
          add(
            "quantities",
            id("serials-first"),
            "The last serial would pass 2^53 - 1. Start lower.",
          );
        }
      }
    }
    if (quantity.proceeds.length > PROCEEDS_MAX) {
      add(
        "quantities",
        id("proceeds"),
        `A quantity pays into ${PROCEEDS_MAX} balances at most.`,
      );
    }
    for (const uid of quantity.proceeds) {
      const field = fieldByUid(project, uid);
      if (!field || !balancedFields.has(uid)) {
        add(
          "quantities",
          id("proceeds"),
          "Proceeds go into balance fields. One of these isn't a balance any more.",
        );
      } else if (field.name === UNITS_FIELD) {
        add(
          "quantities",
          id("proceeds"),
          `${UNITS_FIELD} is where a part keeps its units. Rename that field.`,
        );
      }
    }
  }

  // Timing and testing
  const timingParts: [keyof typeof TIMINGS, string, string][] = [
    ["SaveInterval", "save-interval", project.timing.saveInterval],
    ["IdleReadInterval", "idle-read-interval", project.timing.idleReadInterval],
    ["HoldMax", "hold-max", project.timing.holdMax],
    ["OrphanAge", "orphan-age", project.timing.orphanAge],
    ["CutWindow", "cut-window", project.timing.cutWindow],
  ];
  let orphanAge: number = TIMINGS.OrphanAge.fallback;
  for (const [key, part, text] of timingParts) {
    const value = whole(
      "timing",
      settingId.timing(part),
      text,
      TIMINGS[key].least,
      TIMINGS[key].most,
      true,
    );
    if (key === "OrphanAge" && value !== null) {
      orphanAge = value;
    }
  }
  whole(
    "timing",
    settingId.timing("leg-limit"),
    project.timing.legLimit,
    LEG_LEAST,
    WHOLE_MOST,
    true,
  );

  const knownKinds = new Set([
    ...facts.opKinds,
    ...balanceKinds(project).map((entry) => entry.kind.kind),
  ]);
  const windowKinds = new Set<string>();
  for (const window of project.timing.windows) {
    const id = (part: string) => settingId.window(window.uid, part);
    const problem = kindProblem(window.kind);
    if (problem) {
      add("timing", id("kind"), problem);
    } else if (windowKinds.has(window.kind)) {
      add("timing", id("kind"), `${window.kind} has two windows.`);
    } else if (!knownKinds.has(window.kind)) {
      add("timing", id("kind"), `${window.kind} isn't one of your op kinds.`);
    }
    windowKinds.add(window.kind);
    if (window.timed.trim() === "" && window.untimed.trim() === "") {
      add("timing", id("timed"), "Set Timed, Untimed or both.");
    }
    const timed = whole(
      "timing",
      id("timed"),
      window.timed,
      TIMED_WINDOW_LEAST,
      CEILING,
      true,
    );
    if (timed !== null && timed >= orphanAge - ORPHAN_WINDOW_SLACK) {
      add(
        "timing",
        id("timed"),
        `Timed must stay under OrphanAge - ${ORPHAN_WINDOW_SLACK}, which is ${(orphanAge - ORPHAN_WINDOW_SLACK).toLocaleString("en")}.`,
      );
    }
    whole(
      "timing",
      id("untimed"),
      window.untimed,
      UNTIMED_WINDOW_LEAST,
      CEILING,
      true,
    );
  }

  if (project.mock.enabled) {
    if (!isRequirePath(project.mock.path)) {
      add(
        "timing",
        settingId.mock("path"),
        "Use a path like ReplicatedStorage.Packages.Mock.",
      );
    }
    whole(
      "timing",
      settingId.mock("players"),
      project.mock.players,
      1,
      WHOLE_MOST,
      false,
    );
  }

  return problems;
}
