import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Structural guard, not a styling test: asserts the token contract in
 * app/globals.css exists so Wave 1 agents can rely on these exact names.
 * Does not assert values or snapshot the file.
 */
const css = readFileSync(
  path.join(process.cwd(), "app/globals.css"),
  "utf-8",
);

const requiredTokens = [
  "--color-surface-0",
  "--color-surface-1",
  "--color-surface-2",
  "--color-border",
  "--color-border-strong",
  "--color-text",
  "--color-muted",
  "--color-faint",
  "--color-hl-active",
  "--color-hl-compare",
  "--color-hl-visited",
  "--color-hl-path",
  "--color-hl-inserted",
  "--color-hl-removed",
  "--font-sans",
  "--font-mono",
  "--dur-fast",
  "--dur",
  "--ease",
  "--radius",
];

describe("app/globals.css token contract", () => {
  it.each(requiredTokens)("declares the %s token", (token) => {
    expect(css.includes(`${token}:`)).toBe(true);
  });

  it("declares a [data-theme='light'] override block", () => {
    expect(css.includes("[data-theme='light']")).toBe(true);
  });
});
