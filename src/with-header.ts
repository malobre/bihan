import type { Context, Handler, RouteIntrinsics } from "./index.ts";

export type ExpectFn<TCtx extends RouteIntrinsics, TRes> = (
  value: string | null,
  context: Context<TCtx>,
) => TRes;

// Checks that a header is present, and, if provided, strictly equal to `expected`.
//
// `name` is case-insensitive.
// `expected` should not contain sensitive data as it will be leaked in error
// responses. Use `withHeaderFn` for custom failures.
export const withHeader = (
  name: string,
  expected?: string | null,
): Handler<RouteIntrinsics, Response | undefined> =>
  withHeaderFn(name, (value) => {
    if (value === null) {
      return Response.json(
        {
          message: `expected header to be present: '${name}'`,
        },
        { status: 415 },
      );
    }

    if (expected === undefined || expected === value) {
      return undefined;
    }

    return Response.json(
      {
        message: `invalid header value for '${name}', expected '${expected}', got '${value}'`,
      },
      { status: 415 },
    );
  });

// Runs `expect` function against a header.
//
// `name` is case-insensitive.
export const withHeaderFn =
  <TCtx extends RouteIntrinsics, TRes>(
    name: string,
    expect: ExpectFn<TCtx, TRes>,
  ): Handler<TCtx, TRes> =>
  (ctx): TRes =>
    expect(ctx.request.headers.get(name), ctx);
