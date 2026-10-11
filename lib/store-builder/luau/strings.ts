// Luau literals and keys.

import { words } from "../casing";
import { isName } from "../luau-names";

function escapeChar(char: string): string {
  switch (char) {
    case "\\":
      return "\\\\";
    case '"':
      return '\\"';
    case "\n":
      return "\\n";
    case "\r":
      return "\\r";
    case "\t":
      return "\\t";
    case "\0":
      return "\\0";
    default: {
      const code = char.codePointAt(0) ?? 0;
      return code < 0x20 || code === 0x7f
        ? `\\x${code.toString(16).padStart(2, "0")}`
        : char;
    }
  }
}

// A double-quoted Luau string.
export function luauString(text: string): string {
  // toWellFormed swaps lone surrogates, which have no UTF-8 form, for U+FFFD.
  return `"${Array.from(text.toWellFormed(), escapeChar).join("")}"`;
}

// The text inside an interpolated string's backticks.
export function interpolatedText(text: string): string {
  return Array.from(text.toWellFormed(), (char) =>
    char === "`" || char === "{" || char === "}"
      ? `\\${char}`
      : char === '"'
        ? char
        : escapeChar(char),
  ).join("");
}

// A table key: Name = ..., or ["Some name"] = ... when it isn't a plain name.
export function tableKey(name: string): string {
  return isName(name) ? name : `[${luauString(name)}]`;
}

// A whole number or finite decimal, written so Luau reads it back the same.
export function luauNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }
  return Object.is(value, -0) ? "0" : String(value);
}

// A field name as SCREAMING_CASE, for constants such as RECEIPTS_KEPT.
export function screamingCase(name: string): string {
  return words(name)
    .map((word) => word.toUpperCase())
    .join("_");
}
