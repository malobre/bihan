import { expectTypeOf, it } from "vitest";

import { createContext } from "./context.ts";

it("creates", () => {
  expectTypeOf(
    createContext({
      a: true,
    }),
  ).toMatchObjectType<{ a: boolean }>();
});

it("extends", () => {
  expectTypeOf(
    createContext({
      a: true,
    }).with({ b: "hello" }),
  ).toMatchObjectType<{
    a: boolean;
    b: string;
  }>();
});

it("overrides", () => {
  expectTypeOf(
    createContext({
      a: true,
    }).with({ a: "hello" }),
  ).toMatchObjectType<{
    a: string;
  }>();
});
