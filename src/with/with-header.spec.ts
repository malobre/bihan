import { expect, test, vi } from "vitest";
import { createContext } from "../context.ts";
import { withHeader } from "./with-header.ts";

test("missing header", async () => {
  const request = new Request("https://localhost");

  const result = withHeader(
    "X-custom",
    "value",
  )(
    createContext({
      request,
      urlPatternResult: {} as unknown as URLPatternResult,
      branch: vi.fn(),
    }),
  );

  expect(result).toBeInstanceOf(Response);

  await expect((result as Response).json()).resolves.toMatchInlineSnapshot(`
    {
      "message": "invalid header value for 'X-custom', expected 'value', got 'null'",
    }
  `);
});

test("correct value", () => {
  const request = new Request("https://localhost", {
    headers: { "X-custom": "value" },
  });

  expect(
    withHeader(
      "X-custom",
      "value",
    )(
      createContext({
        request,
        urlPatternResult: {} as unknown as URLPatternResult,
        branch: vi.fn(),
      }),
    ),
  ).toBeUndefined();
});

test("wrong value", async () => {
  const request = new Request("https://localhost", {
    headers: { "X-custom": "invalid" },
  });

  const result = withHeader(
    "X-custom",
    "value",
  )(
    createContext({
      request,
      urlPatternResult: {} as unknown as URLPatternResult,
      branch: vi.fn(),
    }),
  );

  expect(result).toBeInstanceOf(Response);

  await expect((result as Response).json()).resolves.toMatchInlineSnapshot(`
    {
      "message": "invalid header value for 'X-custom', expected 'value', got 'invalid'",
    }
  `);
});
