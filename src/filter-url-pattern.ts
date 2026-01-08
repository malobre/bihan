import type { Context } from "./core/context.ts";
import { type Handler, NoMatch, type RouteIntrinsics } from "./core/router.ts";

export const filterURLPattern = <TCtxData extends RouteIntrinsics>(
  // A pathname component pattern, URLPattern or URLPatternInit
  pattern: string | URLPattern | URLPatternInit,
): Handler<
  TCtxData,
  | typeof NoMatch
  | Context.Merge<
      TCtxData,
      {
        urlPatternResult: URLPatternResult;
      }
    >
> => {
  return (ctx) => {
    const urlPatternResult = (
      pattern instanceof URLPattern
        ? pattern
        : typeof pattern === "string"
          ? new URLPattern({ pathname: pattern })
          : new URLPattern(pattern)
    ).exec(ctx.request.url);

    if (urlPatternResult === null) {
      return NoMatch;
    }

    return ctx.with({ urlPatternResult });
  };
};
