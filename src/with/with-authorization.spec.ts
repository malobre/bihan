import { describe, expect, test, vi } from "vitest";
import { createContext } from "../context.ts";
import { withAuthorization } from "./with-authorization.ts";

test("it works", () => {
  const validator = vi.fn();

  const request = new Request("https://localhost", {
    method: "GET",
    headers: { Authorization: "Bearer token" },
  });

  expect(
    withAuthorization(validator)(
      createContext({
        request,
        urlPatternResult: {} as unknown as URLPatternResult,
        branch: vi.fn(),
      }),
    ),
  ).toBeUndefined();

  expect(validator).toHaveBeenCalledOnce();
  expect(validator).toHaveReturnedWith(undefined);
});

test("empty header", () => {
  const validator = vi.fn();

  const request = new Request("https://localhost", {
    method: "GET",
    headers: { Authorization: "" },
  });

  expect(
    withAuthorization(validator)(
      createContext({
        request,
        urlPatternResult: {} as unknown as URLPatternResult,
        branch: vi.fn(),
      }),
    ),
  ).toBeUndefined();

  expect(validator).toHaveBeenCalledOnce();
  expect(validator).toHaveBeenCalledWith(
    { scheme: "", credentials: "" },
    expect.anything(),
  );
});

describe("rejects", () => {
  test("missing `Authorization` header", () => {
    const validator = vi.fn();

    const request = new Request("https://localhost", {
      method: "GET",
    });

    expect(
      withAuthorization(validator)(
        createContext({
          request,
          urlPatternResult: {} as unknown as URLPatternResult,
          branch: vi.fn(),
        }),
      ),
    ).not.toBeUndefined();

    expect(validator).not.toBeCalled();
  });

  test("validator failure", () => {
    const validator = vi.fn(() => "You shall not pass");

    const request = new Request("https://localhost", {
      method: "GET",
      headers: {
        Authorization: "Bearer my_invalid_token",
      },
    });

    expect(
      withAuthorization(validator)(
        createContext({
          request,
          urlPatternResult: {} as unknown as URLPatternResult,
          branch: vi.fn(),
        }),
      ),
    ).not.toBeUndefined();

    expect(validator).toHaveBeenCalledOnce();
  });
});
