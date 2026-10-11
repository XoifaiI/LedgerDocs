// What counts as a usable name in the generated Luau.

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

export const LUAU_KEYWORDS = [
  "and",
  "break",
  "continue",
  "do",
  "else",
  "elseif",
  "end",
  "export",
  "false",
  "for",
  "function",
  "if",
  "in",
  "local",
  "nil",
  "not",
  "or",
  "repeat",
  "return",
  "then",
  "true",
  "type",
  "typeof",
  "until",
  "while",
];

// Luau and Roblox globals the module must not hide.
export const LUAU_GLOBALS = [
  "assert",
  "bit32",
  "buffer",
  "coroutine",
  "debug",
  "delay",
  "Enum",
  "error",
  "game",
  "gcinfo",
  "getmetatable",
  "Instance",
  "ipairs",
  "math",
  "newproxy",
  "next",
  "os",
  "pairs",
  "pcall",
  "plugin",
  "print",
  "rawequal",
  "rawget",
  "rawlen",
  "rawset",
  "require",
  "script",
  "select",
  "settings",
  "setmetatable",
  "shared",
  "spawn",
  "string",
  "table",
  "task",
  "tick",
  "time",
  "tonumber",
  "tostring",
  "UserSettings",
  "unpack",
  "utf8",
  "vector",
  "wait",
  "warn",
  "workspace",
  "xpcall",
];

// Type names the data and ops types can't take.
export const LUAU_TYPES = [
  "any",
  "boolean",
  "buffer",
  "never",
  "nil",
  "number",
  "Player",
  "string",
  "thread",
  "unknown",
  "vector",
];

// Names the generated module declares itself.
export const MODULE_NAMES = [
  "Data",
  "FakeServices",
  "Handler",
  "HANDLERS",
  "Ledger",
  "Mock",
  "New",
  "Op",
  "ReplicatedStorage",
  "RunService",
  "Saved",
  "ServerScriptService",
  "ServerStorage",
  "Stored",
];

export function isName(text: string): boolean {
  return IDENTIFIER.test(text) && !LUAU_KEYWORDS.includes(text);
}

// Why text can't be a name, or null when it can.
export function nameProblem(text: string, what: string): string | null {
  if (text === "") {
    return `Give the ${what} a name.`;
  }
  if (LUAU_KEYWORDS.includes(text)) {
    return `${text} is a Luau keyword. Pick another name.`;
  }
  if (!IDENTIFIER.test(text)) {
    return "Use letters, digits and _, not starting with a digit.";
  }
  return null;
}

export function utf8Bytes(text: string): number {
  return new TextEncoder().encode(text).length;
}

// The services a require path may start from, each fetched with GetService.
export const REQUIRE_ROOTS = [
  "ReplicatedStorage",
  "ServerStorage",
  "ServerScriptService",
];

const REQUIRE_PATH = new RegExp(
  `^(${REQUIRE_ROOTS.join("|")})(\\.[A-Za-z_][A-Za-z0-9_]*)+$`,
);

export function isRequirePath(text: string): boolean {
  return REQUIRE_PATH.test(text);
}

export function requireRoot(path: string): string {
  return path.split(".")[0];
}

// The last part of a require path, as a local's name.
export function requireLeaf(path: string): string {
  const parts = path.split(".");
  return parts[parts.length - 1];
}
