# Ledger docs

The documentation site for [Ledger](https://github.com/XoifaiI/Ledger), built with
[Fumadocs](https://fumadocs.dev) and deployed to GitHub Pages as a static export.

## Running it

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Writing

Pages live in `content/docs` as MDX. Each folder has a `meta.json` that decides the order in the
sidebar. Adding a page means dropping an `.mdx` file in and adding its name to the `pages` array.

Frontmatter needs `title` and `description`.

## Building

```bash
npm run build     # static export into out/
npm run start     # serve out/ locally
```

## Deploying

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds and publishes to GitHub Pages.

Repository settings need **Pages > Build and deployment > Source** set to **GitHub Actions**.

The site is served from `/<repo-name>`, so the workflow passes that to the build as
`NEXT_PUBLIC_BASE_PATH`. If you move it to a custom domain or a user site, drop that env var and the
base path goes away on its own.

The GitHub link in the sidebar comes from `lib/shared.ts`.
