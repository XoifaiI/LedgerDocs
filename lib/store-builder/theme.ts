// The builder's Blockly theme: seven block families, each one colour across its blocks, its
// toolbox dot and its hat. Fills were picked in OKLCH so white text sits at 4.5:1 on every one
// (WCAG AA) and each stands out about 4:1 from the dark canvas. Outlines go darker on the light
// canvas and lighter on the dark one.

import { Blockly } from "./blockly";

export const FAMILIES = [
  "ops",
  "checks",
  "migrations",
  "control",
  "changes",
  "data",
  "values",
] as const;

export type Family = (typeof FAMILIES)[number];

type Colours = { fill: string; light: string; dark: string; shadow: string };

export const PALETTE: Record<Family, Colours> = {
  ops: {
    fill: "#8d5ed0",
    light: "#7546b5",
    dark: "#b491ee",
    shadow: "#b59fdf",
  },
  checks: {
    fill: "#cd465b",
    light: "#b12a45",
    dark: "#ef818b",
    shadow: "#e2959a",
  },
  migrations: {
    fill: "#6d778c",
    light: "#566074",
    dark: "#98a1b3",
    shadow: "#a1a7b3",
  },
  control: {
    fill: "#bc5c05",
    light: "#a14300",
    dark: "#df8e5c",
    shadow: "#d49d7b",
  },
  changes: {
    fill: "#2d74d9",
    light: "#105bbe",
    dark: "#6aa2f5",
    shadow: "#83a9e2",
  },
  data: {
    fill: "#05819f",
    light: "#006987",
    dark: "#60aac3",
    shadow: "#7dadbe",
  },
  values: {
    fill: "#288834",
    light: "#00701a",
    dark: "#6ab06c",
    shadow: "#82b082",
  },
};

// Families whose first block is a hat with Scratch's curved top.
const HATS: Family[] = ["ops", "checks", "migrations"];

export type Mode = "light" | "dark";

// The page colours Blockly draws with, as hex: Blockly can't read hsl() or CSS variables.
export type PageColours = {
  background: string;
  card: string;
  foreground: string;
  mutedForeground: string;
  primary: string;
  fontFamily: string;
};

// One theme per mode, made the first time it's needed. Blockly's renderer adds a <style> to the
// page for every theme name it draws with and never removes it, so the names stay fixed: across
// visits and light/dark switches the page holds at most two.
const themes = new Map<Mode, Blockly.Theme>();

export function themeFor(
  mode: Mode,
  readPage: () => PageColours,
): Blockly.Theme {
  let theme = themes.get(mode);
  if (!theme) {
    theme = makeTheme(mode, readPage());
    themes.set(mode, theme);
  }
  return theme;
}

function makeTheme(mode: Mode, page: PageColours): Blockly.Theme {
  const blockStyles: Record<string, Partial<Blockly.Theme.BlockStyle>> = {};
  const categoryStyles: Record<string, Blockly.Theme.CategoryStyle> = {};
  for (const family of FAMILIES) {
    const colours = PALETTE[family];
    const style = {
      colourPrimary: colours.fill,
      colourSecondary: colours.shadow,
      colourTertiary: mode === "light" ? colours.light : colours.dark,
    };
    blockStyles[`${family}_blocks`] = { ...style, hat: "" };
    if (HATS.includes(family)) {
      blockStyles[`${family}_hat`] = { ...style, hat: "cap" };
    }
    categoryStyles[family] = { colour: colours.fill };
  }
  // Blockly's own value blocks ask for these.
  for (const builtin of ["logic_blocks", "math_blocks", "text_blocks"]) {
    blockStyles[builtin] = blockStyles.values_blocks;
  }

  const name = `ledger-${mode}`;
  return Blockly.Theme.defineTheme(name, {
    name,
    base: Blockly.Themes.Zelos,
    blockStyles,
    categoryStyles,
    componentStyles: {
      workspaceBackgroundColour: page.background,
      toolboxBackgroundColour: page.card,
      toolboxForegroundColour: page.foreground,
      flyoutBackgroundColour: page.card,
      flyoutForegroundColour: page.foreground,
      flyoutOpacity: 1,
      scrollbarColour: page.mutedForeground,
      scrollbarOpacity: 0.35,
      insertionMarkerColour: page.foreground,
      insertionMarkerOpacity: 0.25,
      cursorColour: page.primary,
      markerColour: page.primary,
      selectedGlowColour: page.primary,
    },
    fontStyle: { family: page.fontFamily, weight: "600", size: 11 },
  });
}
