import type { Context, Handler, RouteIntrinsics } from "../index.ts";

export type ExpectFn<TCtx extends RouteIntrinsics, TRes> = (
  value: string | null,
  context: Context<TCtx>,
) => TRes;

// Checks that a header is present, and, if provided, strictly equal to `expected`.
//
// `name` is case-insensitive.
export const withHeader = (
  name: string,
  expected?: string | null,
): Handler<RouteIntrinsics, Response | undefined> =>
  expected === undefined
    ? ({ request }) =>
        request.headers.has(name)
          ? undefined
          : Response.json(
              {
                message: `expected header to be present: '${name}'`,
              },
              { status: 415 },
            )
    : withHeaderFn(name, (value) =>
        value === expected
          ? undefined
          : Response.json(
              {
                message: `invalid header value for '${name}', expected '${expected}', got '${value}'`,
              },
              { status: 415 },
            ),
      );

export const withHeaderFn =
  <TCtx extends RouteIntrinsics, TRes>(
    name: string,
    expect: ExpectFn<TCtx, TRes>,
  ): Handler<TCtx, TRes> =>
  (ctx): TRes =>
    expect(ctx.request.headers.get(name), ctx);
