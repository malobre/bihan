import { describe, expect, test, vi } from "vitest";
import { createContext } from "../context.ts";
import { withContentType } from "./with-content-type.ts";

describe("match", () => {
  test("identity", () => {
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

  test("different letter case", () => {
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
});

test("no match", () => {
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
