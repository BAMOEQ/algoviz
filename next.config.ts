import path from "node:path";
import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  pageExtensions: ["ts", "tsx", "md", "mdx"],
};

/*
 * Explainers are split into slides at compile time, so the deck never parses markdown.
 *
 * The plugin is named by absolute path rather than imported: Turbopack cannot serialize a function
 * into loader options, and the loader resolves a relative specifier against its own directory
 * rather than the project.
 */
const withMDX = createMDX({
  options: {
    remarkPlugins: [[path.join(process.cwd(), "lib/mdx/remark-sectionize.mjs"), {}]],
  },
});

export default withMDX(nextConfig);
