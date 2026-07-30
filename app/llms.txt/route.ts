import { llms } from "fumadocs-core/source";
import { docsRoute, siteUrl } from "@/lib/shared";
import { source } from "@/lib/source";

export const revalidate = false;

// the index links pages as /docs/..., which is wrong once the site is served under a base path,
// and useless to anything reading this file from somewhere else. make them absolute
export function GET() {
  const index = llms(source)
    .index()
    .replaceAll(`](${docsRoute}`, `](${siteUrl}${docsRoute}`);

  return new Response(index);
}
