// The one place the builder imports Blockly. The package root works in the bundler and in Node (where
// the generator checks run), and brings the built-in blocks and English messages with it.
export * as Blockly from "blockly";
