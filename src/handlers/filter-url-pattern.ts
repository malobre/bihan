import type { Context } from "#core/context.ts";
import { type Handler, NoMatch, type RouteIntrinsics } from "#core/router.ts";

const cache = new Map<string | URLPatternInit, URLPattern>();

const cacheGetOrInsertComputed = (
  pattern: string | URLPatternInit,
  callback: () => URLPattern,
): URLPattern => {
  const result = cache.get(pattern);

  if (result) {
    return result;
  }

  const value = callback();

  cache.set(pattern, value);

  return value;
};

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
        : // TODO: replace by `Map.prototype.getOrInsert` when available on more platforms
          cacheGetOrInsertComputed(pattern, () =>
            typeof pattern === "string"
              ? new URLPattern({ pathname: pattern })
              : new URLPattern(pattern),
          )
    ).exec(ctx.request.url);

    if (urlPatternResult === null) {
      return NoMatch;
    }

    return ctx.with({ urlPatternResult });
  };
};
