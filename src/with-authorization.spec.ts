import { expect, it, vi } from "vitest";
import { createContext } from "./context.ts";
import { withAuthorization } from "./with-authorization.ts";

it("works", () => {
  const validator = vi.fn();

  const request = new Request("https://localhost", {
    method: "GET",
    headers: { Authorization: "Bearer token" },
  });

  expect(
    withAuthorization(
      validator,
      "",
    )(
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

it("handles empty header", () => {
  const validator = vi.fn();

  const request = new Request("https://localhost", {
    method: "GET",
    headers: { Authorization: "" },
  });

  expect(
    withAuthorization(
      validator,
      "",
    )(
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

it("handles missing `Authorization` header", () => {
  const validator = vi.fn();

  const request = new Request("https://localhost", {
    method: "GET",
  });

  expect(
    withAuthorization(
      validator,
      "",
    )(
      createContext({
        request,
        urlPatternResult: {} as unknown as URLPatternResult,
        branch: vi.fn(),
      }),
    ),
  ).not.toBeUndefined();

  expect(validator).not.toBeCalled();
});

it("handles validator failure", () => {
  const validator = vi.fn(() => "You shall not pass");

  const request = new Request("https://localhost", {
    method: "GET",
    headers: {
      Authorization: "Bearer my_invalid_token",
    },
  });

  expect(
    withAuthorization(
      validator,
      "",
    )(
      createContext({
        request,
        urlPatternResult: {} as unknown as URLPatternResult,
        branch: vi.fn(),
      }),
    ),
  ).not.toBeUndefined();

  expect(validator).toHaveBeenCalledOnce();
});
