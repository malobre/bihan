import type { Context, Handler, RouteIntrinsics } from "#src/index.ts";
import { withHeaderFn } from "./with-header.ts";

export type AuthorizeFn<TCtx extends object, TRes> = (
  value: { scheme: string; credentials: string } | null,
  ctx: Context<TCtx>,
) => TRes;

// Calls the provided function with the scheme and credentials, extracted from
// the `Authorization` header.
export const withAuthorization = <TCtx extends RouteIntrinsics, TRes>(
  authorize: AuthorizeFn<TCtx, TRes>,
): Handler<TCtx, TRes | Response> =>
  withHeaderFn("Authorization", (authorization, ctx) => {
    if (authorization === null) {
      return authorize(null, ctx);
    }

    const [scheme, credentials] = authorization.split(" ", 2) as
      | [string]
      | [string, string];

    return authorize({ scheme, credentials: credentials ?? "" }, ctx);
  });
