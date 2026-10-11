// A field's starting value as Luau, for Default and for a migration that adds the field.

import type { DataField } from "../project";
import { luauNumber, luauString } from "./strings";

export function defaultValue(field: DataField): string {
  switch (field.type) {
    case "number":
      return luauNumber(field.def.trim() === "" ? 0 : Number(field.def));
    case "string":
      return luauString(field.def);
    case "boolean":
      return field.def === "true" ? "true" : "false";
    case "luau":
      return field.def.trim() || "nil";
    default:
      return "{}";
  }
}
