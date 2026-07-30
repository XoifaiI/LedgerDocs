export const appName = "Ledger";
export const docsRoute = "/docs";
export const docsImageRoute = "/og/docs";
export const docsContentRoute = "/llms.mdx/docs";

// GitHub Pages serves a project site from /<repo>, so anything absolute needs that on the end
export const siteOrigin =
  process.env.NEXT_PUBLIC_SITE_ORIGIN ?? "https://xoifaii.github.io";
export const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const siteUrl = `${siteOrigin}${basePath}`;

// the library repo, which is what the sidebar GitHub link points at
export const gitConfig = {
  user: "XoifaiI",
  repo: "Ledger",
  branch: "main",
};
