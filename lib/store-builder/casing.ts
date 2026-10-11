// The naming style of what the generated module declares itself: its handlers, parameters and
// locals. Names you type, your fields and ops, and Ledger's own keys never change. Types,
// constants, services and required modules keep their usual casing in every style, as in the
// Roblox Lua style guide.

export type Casing = "pascal" | "camel" | "snake";

export const CASINGS: readonly (readonly [Casing, string])[] = [
  ["pascal", "PascalCase"],
  ["camel", "camelCase"],
  ["snake", "snake_case"],
];

// "LastDailyDay" -> ["Last", "Daily", "Day"]; "GetUIState" -> ["Get", "UI", "State"].
export function words(name: string): string[] {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .split(/[\s_]+/)
    .filter(Boolean);
}

const capitalised = (word: string) =>
  word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

// A name written in PascalCase, in the chosen style.
export function cased(name: string, casing: Casing): string {
  if (casing === "pascal") {
    return name;
  }
  const parts = words(name);
  if (parts.length === 0) {
    return name;
  }
  return casing === "camel"
    ? parts[0].toLowerCase() + parts.slice(1).map(capitalised).join("")
    : parts.map((part) => part.toLowerCase()).join("_");
}

// The names the generated module gives its own locals, in PascalCase.
export const LOCAL_NAMES = [
  "Data",
  "FakeServices",
  "Handler",
  "New",
  "Op",
  "Player",
  "Reason",
  "Stored",
];
