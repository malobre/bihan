import type { Context, Handler, RouteIntrinsics } from "../index.ts";
import { withHeaderFn } from "./with-header.ts";

export type AuthorizeFn<TCtx extends object, TRes> = (
  { scheme, credentials }: { scheme: string; credentials: string },
  ctx: Context<TCtx>,
) => TRes;

export const withAuthorization = <TCtx extends RouteIntrinsics, TRes>(
  authorize: AuthorizeFn<TCtx, TRes>,
): Handler<TCtx, TRes | Response> =>
  withHeaderFn("Authorization", (authorization, ctx) => {
    if (authorization === null) {
      return Response.json(
        { message: "missing 'Authorization' header" },
        {
          status: 401,
          headers: {
            "WWW-Authenticate": "Bearer",
          },
        },
      );
    }

    const [scheme, credentials] = authorization.split(" ", 2) as
      | [string]
      | [string, string];

    return authorize({ scheme, credentials: credentials ?? "" }, ctx);
  });
