// The builder's two dropdowns. field_ledger lists the project's data fields of some types and
// keeps the field's uid, so renaming a field never breaks a block. field_ledger_param lists the
// params of the op the block sits in.
//
// Blockly 13's FieldDropdown only accepts values in its current menu, and quietly falls back to
// the first option otherwise. Both fields accept any value instead: a field or param that's gone
// shows as missing and is reported, rather than becoming a different one.

import { Blockly } from "../blockly";
import { OP_HAT } from "../blocks/contexts";
import type { FieldType, Project } from "../project";

let readProject: () => Project | null = () => null;

// Points the menus at the live project.
export function readProjectFrom(read: () => Project | null): void {
  readProject = read;
}

export function currentProject(): Project | null {
  return readProject();
}

export const NOTHING_PICKED = "";

type FieldLedgerConfig = Blockly.FieldDropdownFromJsonConfig & {
  kinds?: FieldType[];
};

function fieldMenu(kinds: readonly FieldType[]): Blockly.MenuOption[] {
  const fields =
    readProject()?.fields.filter((field) => kinds.includes(field.type)) ?? [];
  if (fields.length === 0) {
    return [["(add a field)", NOTHING_PICKED]];
  }
  return fields.map((field) => [field.name || "(unnamed)", field.uid]);
}

export class FieldLedger extends Blockly.FieldDropdown {
  readonly kinds: readonly FieldType[];

  constructor(kinds: readonly FieldType[], config?: FieldLedgerConfig) {
    super(() => fieldMenu(kinds), undefined, config);
    this.kinds = kinds;
  }

  static override fromJson(options: FieldLedgerConfig): FieldLedger {
    return new FieldLedger(options.kinds ?? [], options);
  }

  protected override doClassValidation_(newValue?: string): string | null {
    return typeof newValue === "string" ? newValue : null;
  }

  protected override getText_(): string | null {
    const uid = this.getValue();
    if (!uid) {
      return "(pick a field)";
    }
    const field = readProject()?.fields.find(
      (candidate) => candidate.uid === uid,
    );
    return field ? field.name || "(unnamed)" : "(missing)";
  }
}

export type ParamType = "number" | "string" | "boolean";

type FieldParamConfig = Blockly.FieldDropdownFromJsonConfig & {
  param?: ParamType;
};

// The op block a block sits inside, if any.
export function enclosingOp(block: Blockly.Block | null): Blockly.Block | null {
  let current = block;
  while (current && current.type !== OP_HAT) {
    current = current.getSurroundParent();
  }
  return current;
}

export function paramsOf(
  op: Blockly.Block,
): { name: string; type: ParamType; block: Blockly.Block }[] {
  const params: { name: string; type: ParamType; block: Blockly.Block }[] = [];
  for (
    let param = op.getInputTargetBlock("PARAMS");
    param;
    param = param.getNextBlock()
  ) {
    params.push({
      name: param.getFieldValue("NAME"),
      type: param.getFieldValue("TYPE"),
      block: param,
    });
  }
  return params;
}

export class FieldLedgerParam extends Blockly.FieldDropdown {
  readonly param: ParamType;

  constructor(param: ParamType, config?: FieldParamConfig) {
    super(
      function (this: Blockly.FieldDropdown): Blockly.MenuOption[] {
        const op = enclosingOp(this.getSourceBlock());
        const names = op
          ? paramsOf(op)
              .filter((candidate) => candidate.type === param && candidate.name)
              .map((candidate) => candidate.name)
          : [];
        if (names.length === 0) {
          return [["(add a param)", NOTHING_PICKED]];
        }
        return names.map((name) => [name, name]);
      },
      undefined,
      config,
    );
    this.param = param;
  }

  static override fromJson(options: FieldParamConfig): FieldLedgerParam {
    return new FieldLedgerParam(options.param ?? "number", options);
  }

  protected override doClassValidation_(newValue?: string): string | null {
    return typeof newValue === "string" ? newValue : null;
  }

  protected override getText_(): string | null {
    return this.getValue() || "(pick)";
  }
}
