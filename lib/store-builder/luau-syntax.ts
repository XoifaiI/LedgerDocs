// A light check of Luau text the builder pastes into the module as is: a field's Luau type and
// starting value, and a custom Arithmetic's Min and Max. It can't type-check, but it catches what
// would break the module around it: unmatched brackets, an unclosed string, a comment, a new line.

const OPENERS: Record<string, string> = { "(": ")", "[": "]", "{": "}" };
const CLOSERS = new Set([")", "]", "}"]);

// Characters a type can hold: names, generics, tables, functions, unions, optionals, singletons.
const TYPE_CHARACTERS = /^[A-Za-z0-9_\s{}[\]()<>,:?|&.\-"'`]*$/;

export type SnippetKind = "type" | "expression";

// Why this text can't go in the module, or null when it can.
export function snippetProblem(text: string, kind: SnippetKind): string | null {
  if (/[\r\n]/.test(text)) {
    return "Keep it on one line.";
  }
  if (kind === "type" && !TYPE_CHARACTERS.test(text)) {
    return "That isn't a Luau type.";
  }
  const stack: string[] = [];
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === '"' || char === "'" || char === "`") {
      const end = closingQuote(text, index);
      if (end < 0) {
        return `The text starting ${char} is never closed.`;
      }
      index = end;
    } else if (char === "-" && text[index + 1] === "-") {
      return "Leave out comments: -- would hide the rest of the line.";
    } else if (char in OPENERS) {
      stack.push(OPENERS[char]);
    } else if (kind === "type" && char === "<") {
      stack.push(">");
    } else if (kind === "type" && char === ">" && text[index - 1] !== "-") {
      if (stack.pop() !== ">") {
        return "The brackets don't match: a > has no <.";
      }
    } else if (CLOSERS.has(char)) {
      const expected = stack.pop();
      if (expected !== char) {
        return expected
          ? `The brackets don't match: expected ${expected} before ${char}.`
          : `The brackets don't match: ${char} has nothing to close.`;
      }
    }
  }
  const open = stack.pop();
  return open ? `The brackets don't match: ${open} is missing.` : null;
}

// Where a string starting at start ends, or -1.
function closingQuote(text: string, start: number): number {
  const quote = text[start];
  for (let index = start + 1; index < text.length; index++) {
    if (text[index] === "\\") {
      index += 1;
    } else if (text[index] === quote) {
      return index;
    }
  }
  return -1;
}

export function isSnippet(text: string, kind: SnippetKind): boolean {
  return text.trim() !== "" && snippetProblem(text, kind) === null;
}
