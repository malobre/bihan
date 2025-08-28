import { describe, expect, it } from "vitest";

import { createChain } from "./chain.ts";
import { createContext } from "./context.ts";

const routerContext = <TCtxData>(data?: TCtxData) => createContext(data ?? {});

describe("chain", () => {
  describe("basic functionality", () => {
    it("executes single handler and returns result", async () => {
      const handler = createChain()
        .pipe(() => "result")
        .intoHandler();

      const result = await handler(routerContext());

      expect(result).toBe("result");
    });

    it("passes context through chain until termination", async () => {
      const handler = createChain()
        .pipe((ctx) => ctx.with({ step: 1 }))
        .pipe((ctx) => ctx.with({ step: 2 }))
        .pipe((ctx) => `completed step ${ctx.step}`)
        .intoHandler();

      const result = await handler(routerContext());

      expect(result).toBe("completed step 2");
    });
  });

  describe("context accumulation", () => {
    it("accumulates context data across multiple handlers", async () => {
      const handler = createChain()
        .pipe((ctx) => ctx.with({ user: "john" }))
        .pipe((ctx) => ctx.with({ role: "admin" }))
        .pipe((ctx) => ({
          user: ctx.user,
          role: ctx.role,
        }))
        .intoHandler();

      const result = await handler(routerContext());

      expect(result).toEqual({ user: "john", role: "admin" });
    });

    it("overrides context properties", async () => {
      const handler = createChain()
        .pipe((ctx) => {
          return ctx.with({ value: "initial" });
        })
        .pipe((ctx) => {
          return ctx.with({ value: "overridden" });
        })
        .pipe((ctx) => {
          return ctx.value;
        })
        .intoHandler();

      const result = await handler(routerContext());

      expect(result).toBe("overridden");
    });

    it("preserves initial context alongside augmentations", async () => {
      const initialData = {
        customRequest: "test",
        customParams: { id: "123" },
      };

      const handler = createChain<typeof initialData>()
        .pipe((ctx) => ctx.with({ authenticated: true }))
        .pipe((ctx) => ({
          customRequest: ctx.customRequest,
          customParams: ctx.customParams,
          authenticated: ctx.authenticated,
        }))
        .intoHandler();

      const result = await handler(createContext(initialData));

      expect(result).toEqual({
        customRequest: "test",
        customParams: { id: "123" },
        authenticated: true,
      });
    });
  });

  describe("async handling", () => {
    it("handles async handlers", async () => {
      const handler = createChain()
        .pipe(async (ctx) => {
          await new Promise((resolve) => setTimeout(resolve, 1));
          return ctx.with({ asyncData: "loaded" });
        })
        .pipe(async (ctx) => {
          await new Promise((resolve) => setTimeout(resolve, 1));
          return `result: ${ctx.asyncData}`;
        })
        .intoHandler();

      const result = await handler(routerContext());

      expect(result).toBe("result: loaded");
    });

    it("handles mixed sync and async handlers", async () => {
      const handler = createChain()
        .pipe((ctx) => {
          return ctx.with({ sync: true });
        })
        .pipe(async (ctx) => {
          await new Promise((resolve) => setTimeout(resolve, 1));
          return ctx.with({ async: true });
        })
        .pipe((ctx) => {
          return {
            sync: ctx.sync,
            async: ctx.async,
          };
        })
        .intoHandler();

      const result = await handler(routerContext());

      expect(result).toEqual({ sync: true, async: true });
    });

    it("handles async termination", async () => {
      const handler = createChain()
        .pipe((ctx) => {
          return ctx.with({ data: "test" });
        })
        .pipe(async (ctx) => {
          await new Promise((resolve) => setTimeout(resolve, 1));
          return `async result: ${ctx.data}`;
        })
        .intoHandler();

      const result = await handler(routerContext());

      expect(result).toBe("async result: test");
    });
  });

  describe("conditional logic", () => {
    it("handles conditional chain continuation", async () => {
      const createConditionalHandler = (shouldContinue: boolean) => {
        return createChain()
          .pipe((ctx) => {
            if (shouldContinue) {
              return ctx.with({ continued: true });
            }
            return "terminated early";
          })
          .pipe((ctx) => {
            return `continued with: ${ctx.continued}`;
          })
          .intoHandler();
      };

      const continuingResult = await createConditionalHandler(true)(
        routerContext(),
      );
      const terminatingResult = await createConditionalHandler(false)(
        routerContext(),
      );

      expect(continuingResult).toBe("continued with: true");
      expect(terminatingResult).toBe("terminated early");
    });

    it("handles complex branching logic", async () => {
      const handler = createChain()
        .pipe((ctx) => {
          return ctx.with({ userType: "admin" });
        })
        .pipe((ctx) => {
          if (ctx.userType === "admin") {
            return ctx.with({ permissions: ["read", "write", "delete"] });
          }
          return ctx.with({ permissions: ["read"] });
        })
        .pipe((ctx) => {
          return {
            userType: ctx.userType,
            canDelete: ctx.permissions.includes("delete"),
          };
        })
        .intoHandler();

      const result = await handler(routerContext());

      expect(result).toEqual({
        userType: "admin",
        canDelete: true,
      });
    });
  });

  describe("error handling", () => {
    it("propagates errors from handlers", async () => {
      const handler = createChain()
        .pipe((ctx) => {
          return ctx.with({ data: "test" });
        })
        .pipe((_ctx) => {
          throw new Error("handler error");
        })
        .intoHandler();

      await expect(handler(routerContext())).rejects.toThrow("handler error");
    });

    it("propagates errors from async handlers", async () => {
      const handler = createChain()
        .pipe(async (ctx) => {
          return ctx.with({ data: "test" });
        })
        .pipe(async (_ctx) => {
          await new Promise((resolve) => setTimeout(resolve, 1));
          throw new Error("async handler error");
        })
        .intoHandler();

      await expect(handler(routerContext())).rejects.toThrow(
        "async handler error",
      );
    });
  });

  describe("edge cases", () => {
    it("handles empty chain gracefully", async () => {
      // Single handler that immediately terminates
      const handler = createChain()
        .pipe((_ctx) => "immediate result")
        .intoHandler();

      const result = await handler(routerContext());

      expect(result).toBe("immediate result");
    });

    it("returns undefined when all handlers return contexts", async () => {
      const handler = createChain()
        .pipe((ctx) => {
          return ctx.with({ step: 1 });
        })
        .pipe((ctx) => {
          return ctx.with({ step: 2 });
        })
        .intoHandler();

      const result = await handler(routerContext());

      expect(result).toBeUndefined();
    });

    it("handles falsy but valid return values", async () => {
      const falsyValues = [false, 0, "", null, undefined];

      for (const falsyValue of falsyValues) {
        const handler = createChain()
          .pipe((ctx) => {
            return ctx.with({ test: true });
          })
          .pipe((_ctx) => {
            return falsyValue;
          })
          .intoHandler();

        const result = await handler(routerContext());
        expect(result).toBe(falsyValue);
      }
    });
  });
});
