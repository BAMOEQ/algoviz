import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

/**
 * Scaffolding smoke test: proves vitest, the jsdom environment, React 19 rendering,
 * and jest-dom matchers are all wired correctly.
 *
 * Stage 0 may delete this once the engine's real tests land.
 */
describe("toolchain", () => {
  it("renders React components into jsdom", () => {
    render(<output>ready</output>);
    expect(screen.getByText("ready")).toBeInTheDocument();
  });
});
