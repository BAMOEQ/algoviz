import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Testing Library only auto-cleans when vitest runs with `globals: true`, which this project does
// not. Without this, each render leaves its DOM behind and later queries match elements from an
// earlier test.
afterEach(cleanup);
