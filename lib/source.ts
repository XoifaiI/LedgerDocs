import { docs } from "collections/server";
import type * as PageTree from "fumadocs-core/page-tree";
import { loader } from "fumadocs-core/source";
import {
  basePath,
  docsContentRoute,
  docsImageRoute,
  docsRoute,
  siteUrl,
} from "./shared";

// See https://fumadocs.dev/docs/headless/source-api for more info
export const source = loader({
  baseUrl: docsRoute,
  source: docs.toFumadocsSource(),
  plugins: [
    {
      name: "sidebar-title",
      transformPageTree: {
        file(node, filePath) {
          const file = filePath && this.storage.read(filePath);
          if (
            file &&
            file.format === "page" &&
            "sidebarTitle" in file.data &&
            typeof file.data.sidebarTitle === "string"
          ) {
            node.name = file.data.sidebarTitle;
          }
          return node;
        },
        // a blog series gets its title as a sidebar heading, since the tab switcher is off
        folder(node) {
          const first = node.children.find((child) => child.type === "page");
          if (node.root && first?.url.startsWith(`${docsRoute}/blog/`)) {
            node.children.unshift({ type: "separator", name: node.name });
          }
          return node;
        },
      },
    },
  ],
});

/** A run of blog posts, which is a root folder under /docs/blog with its own sidebar. */
export type BlogSeries = {
  title: string;
  description?: string;
  url: string;
  posts: number;
};

export function getBlogSeries(): BlogSeries[] {
  const tree = source.getPageTree();
  const series: BlogSeries[] = [];

  function scan(node: PageTree.Folder) {
    const pages = node.children.filter((child) => child.type === "page");
    const first = node.index ?? pages[0];
    if (node.root && first?.url.startsWith(`${docsRoute}/blog/`)) {
      series.push({
        title: String(node.name),
        description:
          typeof node.description === "string" ? node.description : undefined,
        url: first.url,
        posts: pages.length + (node.index ? 1 : 0),
      });
    }
    for (const child of node.children) {
      if (child.type === "folder") scan(child);
    }
  }

  // the blog isn't listed in the docs meta.json, so it lands in the fallback tree
  for (const root of [tree, tree.fallback]) {
    for (const child of root?.children ?? []) {
      if (child.type === "folder") scan(child);
    }
  }

  return series;
}

export function getPageImageUrl(page: (typeof source)["$inferPage"]) {
  const segments = [...page.slugs, "image.png"];

  return {
    segments,
    url:
      "/" +
      [page.locale, ...docsImageRoute.split("/"), ...segments]
        .filter(Boolean)
        .join("/"),
  };
}

export function getPageMarkdownUrl(page: (typeof source)["$inferPage"]) {
  // segments feed generateStaticParams, which Next prefixes with the base path itself
  const segments = [...page.slugs, "content.md"];

  return {
    segments,
    // the copy button fetches this url raw, so unlike next/link it needs the base path spelled out
    url:
      basePath +
      "/" +
      [page.locale, ...docsContentRoute.split("/"), ...segments]
        .filter(Boolean)
        .join("/"),
  };
}

export async function getLLMText(page: (typeof source)["$inferPage"]) {
  const processed = await page.data.getText("processed");

  return `# ${page.data.title} (${siteUrl}${page.url})

${processed}`;
}
