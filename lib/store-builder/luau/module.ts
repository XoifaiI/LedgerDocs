// Builds the whole Stores module: the hats' code from the generator, and everything else from the
// project. The layout follows the docs: services, requires, types, constants, op handlers, then
// Ledger.New with its keys in the docs' order, and the return table.

import type { Blockly } from "../blockly";
import {
  ADD_STEPS,
  CHECK_HAT,
  MIGRATION_HAT,
  OP_HAT,
} from "../blocks/contexts";
import { paramsOf } from "../fields/ledger-field";
import { requireLeaf, requireRoot } from "../luau-names";
import type { BlockProblem, Problem } from "../problem";
import {
  type Balance,
  type BalanceKind,
  fieldByUid,
  luauTypeOf,
  type Project,
} from "../project";
import { parseWhole, validateProject } from "../validate";
import * as changes from "./changes";
import * as control from "./control";
import * as data from "./data";
import { defaultValue } from "./defaults";
import { LuauGenerator } from "./generator";
import * as hats from "./hats";
import { blockProblems, migrationIndex } from "./problems";
import { luauNumber, luauString, tableKey } from "./strings";
import * as values from "./values";

export type Generated = {
  code: string;
  problems: Problem[];
};

const T = "\t";
// Past this, a table is written one entry per line.
const LINE_MOST = 100;

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

function typeKey(name: string): string {
  return IDENTIFIER.test(name) ? name : `[${luauString(name)}]`;
}

// "{ A = 1, B = 2 }" when it fits on the line, otherwise one entry per line.
function table(entries: string[], depth: number, lead: string): string {
  if (entries.length === 0) {
    return "{}";
  }
  const inline = `{ ${entries.join(", ")} }`;
  if (lead.length + inline.length <= LINE_MOST && !inline.includes("\n")) {
    return inline;
  }
  const inner = T.repeat(depth + 1);
  return `{\n${entries.map((entry) => `${inner}${entry},`).join("\n")}\n${T.repeat(depth)}}`;
}

// One entry per line, the way the docs write a store's tables.
function lines(entries: string[], depth: number): string {
  const inner = T.repeat(depth + 1);
  return `{\n${entries.map((entry) => `${inner}${entry},`).join("\n")}\n${T.repeat(depth)}}`;
}

function wholeOr(text: string, fallback: number): string {
  return String(parseWhole(text) ?? fallback);
}

function newGenerator(project: Project): LuauGenerator {
  const generator = new LuauGenerator(project);
  Object.assign(generator.forBlock, hats, control, changes, data, values);
  return generator;
}

function kindEntry(kind: BalanceKind, balance: Balance): string {
  const limit = (text: string) =>
    balance.arithmetic === "" ? wholeOr(text, 0) : text.trim();
  const limits: string[] = [];
  if (kind.min.trim() !== "") {
    limits.push(`Min = ${limit(kind.min)}`);
  }
  if (kind.max.trim() !== "") {
    limits.push(`Max = ${limit(kind.max)}`);
  }
  return limits.length === 0
    ? luauString(kind.kind)
    : `{ Kind = ${luauString(kind.kind)}, ${limits.join(", ")} }`;
}

function kindList(kinds: BalanceKind[], balance: Balance): string {
  const entries = kinds.map((kind) => kindEntry(kind, balance));
  return entries.length === 1 && entries[0].startsWith('"')
    ? entries[0]
    : `{ ${entries.join(", ")} }`;
}

export function generateStores(
  workspace: Blockly.Workspace,
  project: Project,
): Generated {
  const generator = newGenerator(project);
  generator.init(workspace);
  const { store } = project;
  // The module's own names, in the project's naming style.
  const id = (name: string) => generator.id(name);

  const hatsOf = (type: string) =>
    workspace
      .getTopBlocks(true)
      .filter((block) => block.type === type && block.isEnabled());
  const allOps = hatsOf(OP_HAT);
  // An op named like a balance kind or an earlier op is reported, and left out until renamed: its
  // handler couldn't type-check against the kind it clashes with.
  const balanceKindNames = new Set(
    project.balances.flatMap((balance) =>
      [...balance.credit, ...balance.debit].map((kind) => kind.kind),
    ),
  );
  const ops = firstOfEach(
    allOps.filter((op) => !balanceKindNames.has(op.getFieldValue("NAME"))),
    (op) => op.getFieldValue("NAME") as string,
  );
  const checks = hatsOf(CHECK_HAT);
  const migrations = hatsOf(MIGRATION_HAT).sort(
    (a, b) => migrationIndex(a) - migrationIndex(b),
  );

  // Requires, each a local named after the last part of its path.
  const services = new Set([requireRoot(store.ledgerPath)]);
  const requires: string[] = [`local Ledger = require(${store.ledgerPath})`];
  const arithmetics = new Map<string, string>();
  for (const balance of project.balances) {
    if (balance.arithmetic && !arithmetics.has(balance.arithmetic)) {
      services.add(requireRoot(balance.arithmetic));
      arithmetics.set(balance.arithmetic, "");
    }
  }
  const moduleNames = [store.variable, store.dataType, store.opsType];
  generator.reserve(moduleNames);
  for (const path of arithmetics.keys()) {
    const name = generator.distinct(requireLeaf(path));
    arithmetics.set(path, name);
    requires.push(`local ${name} = require(${path})`);
  }
  if (project.mock.enabled) {
    services.add(requireRoot(project.mock.path));
    if (project.mock.studioOnly) {
      services.add("RunService");
    }
    requires.push(`local Mock = require(${project.mock.path})`);
  }

  // Each op's handler gets a name that can't clash with the module's own.
  for (const op of ops) {
    generator.handlerNames.set(
      op.id,
      generator.local(op.getFieldValue("NAME")),
    );
  }
  generator.reserve([
    ...arithmetics.values(),
    ...generator.handlerNames.values(),
  ]);

  const handlers = ops.map((op) => generator.blockToCode(op) as string);
  const checkBody = checks
    .map((check) => generator.blockToCode(check) as string)
    .join("");
  const migrationCode = migrations.map((migration) => ({
    block: migration,
    body: generator.blockToCode(migration) as string,
  }));

  const out: string[] = [
    "--!strict",
    "-- Made with the Ledger store builder. Change the store there, then replace this file.",
  ];
  for (const service of [...services].sort()) {
    out.push(`local ${service} = game:GetService(${luauString(service)})`);
  }
  out.push("", ...requires);

  // Types
  out.push("", `export type ${store.dataType} = {`);
  // A name given twice is reported as a problem; only its first use goes in, so the module still
  // type-checks.
  const fields = firstOfEach(project.fields, (field) => field.name);
  for (const field of fields) {
    out.push(`${T}${typeKey(field.name)}: ${luauTypeOf(field) || "any"},`);
  }
  out.push("}");

  const opTypes: string[] = [];
  const kinds = new Set<string>();
  for (const balance of project.balances) {
    const field = fieldByUid(project, balance.field);
    const amount = field && balance.arithmetic ? luauTypeOf(field) : "number";
    for (const kind of [...balance.credit, ...balance.debit]) {
      if (!kinds.has(kind.kind)) {
        kinds.add(kind.kind);
        opTypes.push(`${T}${typeKey(kind.kind)}: { Amount: ${amount} },`);
      }
    }
  }
  for (const op of ops) {
    const kind: string = op.getFieldValue("NAME");
    if (kinds.has(kind)) {
      continue;
    }
    kinds.add(kind);
    const shape = firstOfEach(paramsOf(op), (param) => param.name).map(
      (param) => `${typeKey(param.name)}: ${param.type}`,
    );
    opTypes.push(
      `${T}${typeKey(kind)}: ${shape.length ? `{ ${shape.join(", ")} }` : "{}"},`,
    );
  }
  out.push(
    "",
    opTypes.length
      ? `export type ${store.opsType} = {\n${opTypes.join("\n")}\n}`
      : `export type ${store.opsType} = {}`,
  );

  if (migrations.length > 0) {
    out.push(
      "",
      "-- Old data, before migrations give it the shape above.",
      "type Saved = { [string]: any }",
    );
  }
  if (generator.constants.size > 0) {
    out.push("");
    for (const [name, value] of generator.constants) {
      out.push(`local ${name} = ${luauNumber(value)}`);
    }
  }
  if (project.mock.enabled) {
    const made = `Mock.New({ Players = ${wholeOr(project.mock.players, 1)} })`;
    out.push(
      "",
      project.mock.studioOnly
        ? "-- In Studio, stores run on the Mock package, so testing never touches real data."
        : "-- Every store runs on the Mock package. Turn this off before you publish.",
      project.mock.studioOnly
        ? `local ${id("FakeServices")} = if RunService:IsStudio() then ${made} else nil`
        : `local ${id("FakeServices")} = ${made}`,
    );
  }

  // Handlers
  if (ops.length > 0) {
    out.push("", `type Op<Kind> = Ledger.OpOf<${store.opsType}, Kind>`);
    for (const handler of handlers) {
      out.push("", handler);
    }
    out.push(
      "",
      "-- Every op the reducer handles, by kind.",
      `local HANDLERS: { [string]: (${id("Data")}: ${store.dataType}, ${id("Op")}: any) -> ${store.dataType}? } = {`,
      ...ops.map(
        (op) =>
          `${T}${tableKey(op.getFieldValue("NAME"))} = ${generator.handlerNames.get(op.id)},`,
      ),
      "}",
    );
  }

  // Ledger.New
  const config: string[] = [
    `Name = ${luauString(store.name)}`,
    `Keys = ${luauString(store.keys)}`,
  ];
  const defaults = fields.map(
    (field) => `${tableKey(field.name)} = ${defaultValue(field)}`,
  );
  config.push(`Default = ${table(defaults, 1, `${T}Default = `)}`);
  config.push(`MustExist = ${store.mustExist}`, `Erasable = ${store.erasable}`);

  const balances: string[] = [];
  for (const balance of project.balances) {
    const field = fieldByUid(project, balance.field);
    if (!field) {
      continue;
    }
    const parts: string[] = [];
    if (balance.credit.length) {
      parts.push(`Credit = ${kindList(balance.credit, balance)}`);
    }
    if (balance.debit.length) {
      parts.push(`Debit = ${kindList(balance.debit, balance)}`);
    }
    const limit = (text: string) =>
      balance.arithmetic === "" ? wholeOr(text, 0) : text.trim();
    if (balance.min.trim() !== "") {
      parts.push(`Min = ${limit(balance.min)}`);
    }
    if (balance.max.trim() !== "") {
      parts.push(`Max = ${limit(balance.max)}`);
    }
    if (balance.arithmetic) {
      parts.push(`Arithmetic = ${arithmetics.get(balance.arithmetic)}`);
    }
    const key = `${tableKey(field.name)} = `;
    balances.push(`${key}${table(parts, 2, `${T}${T}${key}`)}`);
  }
  if (balances.length) {
    config.push(`Balances = ${lines(balances, 1)}`);
  }

  if (project.totals.length) {
    const totals = project.totals.map((total) => {
      const shards =
        total.shards.trim() === ""
          ? "{}"
          : `{ Shards = ${wholeOr(total.shards, 1)} }`;
      return `${tableKey(total.name)} = ${shards}`;
    });
    config.push(`Totals = ${lines(totals, 1)}`);
  }

  if (project.quantities.length) {
    const quantities = project.quantities.map((quantity) => {
      const parts = [
        `Parts = ${wholeOr(quantity.parts, 1)}`,
        `Mode = ${luauString(quantity.mode)}`,
      ];
      if (quantity.mode === "Final") {
        const stock = wholeOr(quantity.stock, 0);
        parts.push(`Stock = ${stock}`);
        if (quantity.serials) {
          parts.push(
            `Serials = { First = ${wholeOr(quantity.serialsFirst, 0)}, Count = ${stock} }`,
          );
        }
      }
      const proceeds = quantity.proceeds
        .map((uid) => fieldByUid(project, uid)?.name)
        .filter((name): name is string => !!name);
      if (proceeds.length) {
        parts.push(`Proceeds = { ${proceeds.map(luauString).join(", ")} }`);
      }
      if (quantity.closed) {
        parts.push("Closed = true");
      }
      const key = `${tableKey(quantity.name)} = `;
      return `${key}${table(parts, 2, `${T}${T}${key}`)}`;
    });
    config.push(`Quantities = ${lines(quantities, 1)}`);
  }

  if (migrationCode.length) {
    const entries = migrationCode.map(({ block, body }) => {
      const steps: string[] = [];
      const added: string[] = [];
      let breaking = false;
      for (
        let step = block.getInputTargetBlock("DO");
        step;
        step = step.getNextBlock()
      ) {
        if (!step.isEnabled()) {
          continue;
        }
        const field =
          fieldByUid(project, step.getFieldValue("FIELD") ?? "")?.name ?? "?";
        const old: string = step.getField("OLD")
          ? step.getFieldValue("OLD")
          : "";
        if (ADD_STEPS.includes(step.type)) {
          added.push(field);
          steps.push(`added ${field}`);
        } else {
          breaking = true;
          steps.push(
            step.type === "ledger_migrate_rename"
              ? `renamed ${old} to ${field}`
              : step.type === "ledger_migrate_remove"
                ? `removed ${old}`
                : `changed ${field}`,
          );
        }
      }
      const index = migrationIndex(block);
      const lines = [
        `${T}${T}-- ${index}: version ${index + 1}${steps.length ? ` ${steps.join(", ")}` : ""}.`,
        `${T}${T}{`,
        breaking
          ? `${T}${T}${T}IsBreaking = true,`
          : `${T}${T}${T}Fields = ${table(added.map(luauString), 3, `${T}${T}${T}Fields = `)},`,
        `${T}${T}${T}Run = function(${id("Stored")}: unknown): unknown`,
        `${T}${T}${T}${T}local ${id("New")} = table.clone(${id("Stored")} :: Saved)`,
      ];
      if (body) {
        lines.push(generator.prefixLines(body, `${T}${T}${T}`).trimEnd());
      }
      lines.push(
        `${T}${T}${T}${T}return ${id("New")}`,
        `${T}${T}${T}end,`,
        `${T}${T}},`,
      );
      return lines.join("\n");
    });
    config.push(`Migrations = {\n${entries.join("\n")}\n${T}}`);
  }

  if (checks.length) {
    const lines = [
      `Schema = function(${id("Data")}: ${store.dataType}): (boolean, string?)`,
    ];
    if (checkBody) {
      lines.push(generator.prefixLines(checkBody, T).trimEnd(), "");
    }
    lines.push(`${T}${T}return true, nil`, `${T}end`);
    config.push(lines.join("\n"));
  }

  if (project.timing.windows.length) {
    const windows = project.timing.windows.map((window) => {
      const parts: string[] = [];
      if (window.timed.trim() !== "") {
        parts.push(`Timed = ${wholeOr(window.timed, 0)}`);
      }
      if (window.untimed.trim() !== "") {
        parts.push(`Untimed = ${wholeOr(window.untimed, 0)}`);
      }
      return `${tableKey(window.kind)} = ${table(parts, 2, "")}`;
    });
    config.push(`Windows = ${lines(windows, 1)}`);
  }
  const timings: [string, string][] = [
    ["SaveInterval", project.timing.saveInterval],
    ["IdleReadInterval", project.timing.idleReadInterval],
    ["HoldMax", project.timing.holdMax],
    ["OrphanAge", project.timing.orphanAge],
    ["CutWindow", project.timing.cutWindow],
    ["LegLimit", project.timing.legLimit],
  ];
  for (const [key, text] of timings) {
    if (text.trim() !== "") {
      config.push(`${key} = ${wholeOr(text, 0)}`);
    }
  }

  if (store.keys === "Player") {
    const { players } = project;
    if (!players.kick) {
      config.push("Kick = false");
    }
    if (players.kickMessage.trim() !== "") {
      config.push(`KickMessage = ${luauString(players.kickMessage)}`);
    }
    if (players.warnOnLoadFailed) {
      config.push(
        [
          `OnLoadFailed = function(${id("Player")}: Player, ${id("Reason")}: Ledger.Reason)`,
          `${T}${T}warn("Couldn't load", ${id("Player")}.Name, ${id("Reason")})`,
          `${T}end`,
        ].join("\n"),
      );
    }
  }
  if (project.mock.enabled) {
    config.push(`Mock = ${id("FakeServices")}`);
  }

  if (ops.length > 0) {
    const [data, op, handler] = [id("Data"), id("Op"), id("Handler")];
    config.push(
      [
        `Reducer = function(${data}: ${store.dataType}, ${op}: Ledger.Op<${store.opsType}>): ${store.dataType}?`,
        `${T}${T}local ${handler} = HANDLERS[${op}.Kind]`,
        `${T}${T}if not ${handler} then`,
        `${T}${T}${T}return nil -- a kind this server doesn't know`,
        `${T}${T}end`,
        "",
        `${T}${T}return ${handler}(${data}, ${op})`,
        `${T}end`,
      ].join("\n"),
    );
  }

  out.push(
    "",
    `local ${store.variable} = Ledger.New<<${store.dataType}, ${store.opsType}>>({`,
    ...config.map((entry) => `${T}${entry},`),
    "})",
    "",
    "return {",
    `${T}${store.variable} = ${store.variable},`,
    "}",
  );

  const opKinds = allOps.map((op) => op.getFieldValue("NAME") as string);
  const problems: Problem[] = [
    ...validateProject(project, { opKinds }),
    ...dedupe([...blockProblems(workspace, project), ...generator.problems]),
  ];
  return { code: `${out.join("\n")}\n`, problems };
}

// The first item for each name, in order.
function firstOfEach<Item>(
  items: Item[],
  nameOf: (item: Item) => string,
): Item[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const name = nameOf(item);
    if (seen.has(name)) {
      return false;
    }
    seen.add(name);
    return true;
  });
}

function dedupe(problems: BlockProblem[]): BlockProblem[] {
  const seen = new Set<string>();
  return problems.filter((problem) => {
    const key = `${problem.blockId}\n${problem.message}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
