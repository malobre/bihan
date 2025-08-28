import { expectTypeOf, it } from "vitest";

import { createChain } from "./chain.ts";
import type { Handler } from "./router.ts";

it("accumulates context through chain", () => {
  createChain()
    .pipe(() => "bleh")
    .intoHandler();

  const testChain = createChain()
    .pipe((ctx) => ctx.with({ a: true }))
    .pipe((ctx) => {
      expectTypeOf(ctx).toMatchObjectType<{ a: boolean }>();
      return ctx.with({ b: "hello" });
    })
    .pipe((ctx) => {
      expectTypeOf(ctx).toMatchObjectType<{ a: boolean; b: string }>();
      return "final";
    })
    .intoHandler();

  // Chain terminates when handler returns non-Context - returns Handler with initial context type
  expectTypeOf(testChain).toEqualTypeOf<Handler<object, Promise<string>>>();
});

it("handles branching with different return types", () => {
  const branchingChain = createChain()
    .pipe((ctx) => ctx.with({ a: true }))
    .pipe((ctx) => {
      expectTypeOf(ctx).toMatchObjectType<{ a: boolean }>();
      if (ctx.a) {
        return "bleh";
      } else {
        return ctx.with({ a: "hello" });
      }
    })
    .pipe((ctx) => {
      expectTypeOf(ctx).toMatchObjectType<{ a: string }>();
      return true;
    })
    .intoHandler();

  // Chain continues because union contains Context, then terminates with Handler using initial context
  expectTypeOf(branchingChain).toEqualTypeOf<
    Handler<object, Promise<"bleh" | boolean>>
  >();
});

it("accumulates multiple context augmentations", () => {
  const multiChain = createChain()
    .pipe((ctx) => ctx.with({ user: { id: "123" } }))
    .pipe((ctx) => {
      expectTypeOf(ctx).toMatchObjectType<{ user: { id: string } }>();
      return ctx.with({ permissions: ["read", "write"] });
    })
    .pipe((ctx) => {
      expectTypeOf(ctx).toMatchObjectType<{
        user: { id: string };
        permissions: string[];
      }>();
      return { message: `User ${ctx.user.id}` };
    })
    .intoHandler();

  // Chain terminates when handler returns non-Context - returns Handler with initial context
  expectTypeOf(multiChain).toEqualTypeOf<
    Handler<object, Promise<{ message: string }>>
  >();
});

it("unions return types from branches", () => {
  const mixedChain = createChain()
    .pipe((ctx) => ctx.with({ count: 1 }))
    .pipe((ctx) => {
      expectTypeOf(ctx).toMatchObjectType<{ count: number }>();
      if (ctx.count > 0) {
        return "positive";
      }
      return 42;
    })
    .intoHandler();

  // Chain terminates when handler returns non-Context - returns Handler with initial context
  expectTypeOf(mixedChain).toEqualTypeOf<
    Handler<object, Promise<"positive" | 42>>
  >();
});

it("handles context overrides", () => {
  const overrideChain = createChain()
    .pipe((ctx) => ctx.with({ value: true }))
    .pipe((ctx) => {
      expectTypeOf(ctx).toMatchObjectType<{ value: boolean }>();
      return ctx.with({ value: "overridden" });
    })
    .pipe((ctx) => {
      expectTypeOf(ctx).toMatchObjectType<{ value: string }>();
      return ctx.value;
    })
    .intoHandler();

  // Chain terminates when handler returns non-Context - returns Handler with initial context
  expectTypeOf(overrideChain).toEqualTypeOf<Handler<object, Promise<string>>>();
});

it("infers initial context type", () => {
  const withInitialContext = createChain<{ request: string }>()
    .pipe((ctx) => {
      expectTypeOf(ctx).toMatchObjectType<{ request: string }>();
      return ctx.with({ userId: "abc" });
    })
    .pipe((ctx) => {
      expectTypeOf(ctx).toMatchObjectType<{
        request: string;
        userId: string;
      }>();
      return ctx.request;
    })
    .intoHandler();

  // Chain terminates when handler returns non-Context - returns Handler with initial context type
  expectTypeOf(withInitialContext).toEqualTypeOf<
    Handler<{ request: string }, Promise<string>>
  >();
});

it("handles async handlers with proper type flow", () => {
  const asyncChain = createChain()
    .pipe(async (ctx) => {
      // Async handler returning Context
      return ctx.with({ data: "loaded" });
    })
    .pipe(async (ctx) => {
      expectTypeOf(ctx).toMatchObjectType<{ data: string }>();
      // Async handler terminating chain
      return { result: `Processed ${ctx.data}` };
    })
    .intoHandler();

  // Should be Handler with Promise return type
  expectTypeOf(asyncChain).toEqualTypeOf<
    Handler<object, Promise<{ result: string }>>
  >();
});

it("handles mixed sync/async chains", () => {
  const mixedChain = createChain()
    .pipe((ctx) => {
      // Sync handler
      return ctx.with({ step: 1 });
    })
    .pipe(async (ctx) => {
      expectTypeOf(ctx).toMatchObjectType<{ step: number }>();
      // Async handler continuing chain
      return ctx.with({ step: 2, async: true });
    })
    .pipe((ctx) => {
      expectTypeOf(ctx).toMatchObjectType<{ step: number; async: boolean }>();
      // Sync handler terminating
      return "completed";
    })
    .intoHandler();

  // Mixed chain should return Promise due to async handler
  expectTypeOf(mixedChain).toEqualTypeOf<Handler<object, Promise<string>>>();
});

it("handles async branching scenarios", () => {
  const asyncBranchingChain = createChain()
    .pipe(async (ctx) => {
      return ctx.with({ shouldContinue: true });
    })
    .pipe(async (ctx) => {
      expectTypeOf(ctx).toMatchObjectType<{ shouldContinue: boolean }>();
      if (ctx.shouldContinue) {
        return "branch-a";
      } else {
        return ctx.with({ branch: "b" });
      }
    })
    .pipe((ctx) => {
      expectTypeOf(ctx).toMatchObjectType<{
        shouldContinue: boolean;
        branch: string;
      }>();
      return "branch-b-result";
    })
    .intoHandler();

  // Should represent all possible async return paths
  expectTypeOf(asyncBranchingChain).toEqualTypeOf<
    Handler<object, Promise<string>>
  >();
});

it("disallows terminated chain extension", () => {
  const terminatedChain = createChain().pipe(() => "terminated");

  expectTypeOf(terminatedChain.pipe).parameters.toEqualTypeOf<[never]>();
});
