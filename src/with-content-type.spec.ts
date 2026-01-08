import { expect, it, vi } from "vitest";
import { createContext } from "#core/context.ts";
import { withContentType } from "./with-content-type.ts";

it("works", () => {
  const request = new Request("https://localhost", {
    method: "POST",
    body: JSON.stringify(null),
    headers: { "Content-Type": "application/json" },
  });

  expect(
    withContentType("application/json")(
      createContext({
        request,
        urlPatternResult: {} as unknown as URLPatternResult,
        branch: vi.fn(),
      }),
    ),
  ).toBeUndefined();
});

it("ignores case", () => {
  const request = new Request("https://localhost", {
    method: "POST",
    body: JSON.stringify(null),
    headers: { "Content-Type": "APPLICATION/JSON" },
  });

  expect(
    withContentType("application/json")(
      createContext({
        request,
        urlPatternResult: {} as unknown as URLPatternResult,
        branch: vi.fn(),
      }),
    ),
  ).toBeUndefined();
});

it("fails on wrong value", () => {
  const request = new Request("https://localhost", {
    method: "POST",
    body: JSON.stringify(null),
    headers: { "Content-Type": "application/xml" },
  });

  expect(
    withContentType("application/json")(
      createContext({
        request,
        urlPatternResult: {} as unknown as URLPatternResult,
        branch: vi.fn(),
      }),
    ),
  ).not.toBeUndefined();
});
