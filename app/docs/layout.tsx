import type * as PageTree from "fumadocs-core/page-tree";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { ReleaseBadge } from "@/components/release-badge";
import { baseOptions } from "@/lib/layout.shared";
import { releaseVersions } from "@/lib/releases";
import { source } from "@/lib/source";

/** Hangs the unread count off the Releases item in the sidebar. */
function withBadge(
  nodes: PageTree.Node[],
  versions: string[],
): PageTree.Node[] {
  return nodes.map((node) => {
    if (node.type === "folder") {
      return { ...node, children: withBadge(node.children, versions) };
    }
    if (
      node.type !== "page" ||
      !node.url.replace(/\/$/, "").endsWith("/docs/releases")
    ) {
      return node;
    }

    return {
      ...node,
      name: (
        <>
          {node.name}
          <ReleaseBadge versions={versions} />
        </>
      ),
    };
  });
}

export default function Layout({ children }: LayoutProps<"/docs">) {
  const tree = source.getPageTree();
  const versions = releaseVersions();

  return (
    <DocsLayout
      tree={{ ...tree, children: withBadge(tree.children, versions) }}
      {...baseOptions()}
    >
      {children}
    </DocsLayout>
  );
}
