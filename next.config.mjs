import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

// GitHub Pages serves a project site from /<repo>, so every asset needs that prefix.
// The deploy workflow sets NEXT_PUBLIC_BASE_PATH; `npm run dev` leaves it empty.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** @type {import('next').NextConfig} */
const config = {
  output: "export",
  reactStrictMode: true,
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default withMDX(config);
