import { type Chain, createChain, type NilChain } from "./chain.ts";
import { type Context, createContext } from "./context.ts";

export type RouteIntrinsics = {
  // The incoming HTTP request
  request: Request;

  // URLPattern match result containing path parameters and other match data
  urlPatternResult: URLPatternResult;
};

// A route handler function that receives a context and returns a value.
export type Handler<TCtxData extends object, TReturn> = (
  ctx: Context<TCtxData>,
) => TReturn;

type RouteMeta = {
  method: string;
  pattern: URLPattern;
};

type RouteChain<TCtxData extends object, TRes = unknown> = Chain<
  Context.MergeUnwrapped<RouteIntrinsics, TCtxData>,
  object,
  TRes,
  RouteMeta
>;

// Standardized HTTP methods
// See:
// - <https://www.rfc-editor.org/rfc/rfc9110.html#section-9>
// - <https://www.rfc-editor.org/rfc/rfc5789.html>
type Method =
  | "GET"
  | "HEAD"
  | "POST"
  | "PUT"
  | "DELETE"
  | "CONNECT"
  | "OPTIONS"
  | "TRACE"
  | "PATCH";

type CreateRoutes<
  TCtxData extends object,
  TRoutes extends RouteChain<TCtxData>[],
> = ({
  on,
}: {
  on(
    method:
      | Method
      | "*" // wildcard
      | (string & {}), // escape hatch
    // A pathname component pattern, URLPattern or URLPatternInit
    pattern: string | URLPattern | URLPatternInit,
  ): NilChain<Context.MergeUnwrapped<RouteIntrinsics, TCtxData>, RouteMeta>;
}) => TRoutes;

// Routes an incoming HTTP request to the first matching handler.
//
// Routes are matched in the order they are defined. The first route that matches
// both the HTTP method and URL pattern will handle the request.
export const route: {
  <TRoutes extends RouteChain<object>[]>(
    createRoutes: CreateRoutes<object, TRoutes>,
    request: Request,
    ctxData?: undefined,
  ): Promise<
    Awaited<ReturnType<ReturnType<TRoutes[number]["intoHandler"]>>> | undefined
  >;

  <TCtxData extends object, TRoutes extends RouteChain<TCtxData>[]>(
    createRoutes: CreateRoutes<TCtxData, TRoutes>,
    request: Request,
    ctxData: TCtxData,
  ): Promise<
    Awaited<ReturnType<ReturnType<TRoutes[number]["intoHandler"]>>> | undefined
  >;
} = async <TCtxData extends object, TRoutes extends RouteChain<TCtxData>[]>(
  createRoutes: CreateRoutes<TCtxData, TRoutes>,
  request: Request,
  ctxData: TCtxData,
) => {
  // PERF: This is probably the most inefficient way to check for a match,
  // we should use a prefix trie.
  for (const route of Iterator.from(
    createRoutes({
      on: (method: string, pattern: string | URLPattern | URLPatternInit) =>
        createChain({
          method,
          pattern:
            pattern instanceof URLPattern
              ? pattern
              : typeof pattern === "string"
                ? new URLPattern({ pathname: pattern })
                : new URLPattern(pattern),
        }),
    }),
  )) {
    if (route.meta.method !== "*" && request.method !== route.meta.method) {
      continue;
    }

    const urlPatternResult = route.meta.pattern.exec(request.url);

    if (urlPatternResult === null) continue;

    const context = createContext({
      ...({
        request,
        urlPatternResult,
      } satisfies RouteIntrinsics),
      // provided context overrides everything
      ...ctxData,
    }) as Context.Merge<RouteIntrinsics, TCtxData>;

    const handler = route.intoHandler();

    return await handler(context);
  }

  return undefined;
};

export const branch = async <TRes, TCtxData extends object>(
  factory: (
    pipe: NilChain<NoInfer<TCtxData>, undefined>["pipe"],
  ) => Chain<NoInfer<TCtxData>, object, TRes, undefined>,
  ctx: Context<TCtxData>,
): Promise<TRes> =>
  await factory(createChain<TCtxData>().pipe).intoHandler()(ctx);
