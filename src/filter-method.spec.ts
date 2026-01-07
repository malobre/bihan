import { describe, expect, it } from "vitest";

import { createContext } from "./core/context.ts";
import { NoMatch } from "./core/router.ts";
import { filterMethod } from "./filter-method.ts";

describe("simple method filter", () => {
  it("passthrough on match", () => {
    const handler = filterMethod("GET");

    expect(
      handler(createContext({ request: new Request("https://dummy.invalid") })),
    ).toBeUndefined();
  });

  it("returns `NoMatch` on mismatch", () => {
    const handler = filterMethod("POST");

    expect(
      handler(createContext({ request: new Request("https://dummy.invalid") })),
    ).toBe(NoMatch);
  });
});

describe("array of method filter", () => {
  it("passthrough on match", () => {
    const handler = filterMethod(["GET", "POST"]);

    expect(
      handler(createContext({ request: new Request("https://dummy.invalid") })),
    ).toBeUndefined();

    expect(
      handler(
        createContext({
          request: new Request("https://dummy.invalid", { method: "POST" }),
        }),
      ),
    ).toBeUndefined();
  });

  it("returns `NoMatch` on mismatch", () => {
    const handler = filterMethod(["PUT", "POST"]);

    expect(
      handler(createContext({ request: new Request("https://dummy.invalid") })),
    ).toBe(NoMatch);
  });
});
