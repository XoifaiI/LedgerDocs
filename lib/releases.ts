import fs from "node:fs";
import path from "node:path";

/**
 * Every version heading on the releases page, newest first.
 *
 * Read at build time so the badge can tell how many releases a reader has not
 * opened yet without shipping the page content to the client.
 */
export function releaseVersions(): string[] {
  const file = path.join(process.cwd(), "content/docs/releases.mdx");
  const source = fs.readFileSync(file, "utf8");

  return [...source.matchAll(/^##\s+(\d+\.\d+\.\d+)\s*$/gm)].map(
    (match) => match[1],
  );
}
