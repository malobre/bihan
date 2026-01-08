import { type Context, createContext } from "./context.ts";
import { filterMethod, type Method } from "./filter-method.ts";
import { filterURLPattern } from "./filter-url-pattern.ts";
import { createPipe, type NilPipe, type Pipe } from "./pipe.ts";

export type RouteIntrinsics = {
  // The incoming HTTP request
  request: Request;
};

// A route handler function that receives a context and returns a value.
export type Handler<TCtxData extends object, TReturn> = (
  ctx: Context<TCtxData>,
) => TReturn;

type RoutePipe<TCtxData extends object, TRes = unknown> = Pipe<
  Context.MergeUnwrapped<RouteIntrinsics, TCtxData>,
  object,
  TRes
>;

export const NoMatch: unique symbol = Symbol();

type CreateRoutes<
  TCtxData extends object,
  TRoutes extends RoutePipe<TCtxData>[],
> = ({
  createPipe,
  on,
}: {
  createPipe: () => NilPipe<Context.MergeUnwrapped<TCtxData, RouteIntrinsics>>;
  on: (
    method: Method | Method[],
    pattern: string | URLPattern | URLPatternInit,
  ) => Pipe<
    RouteIntrinsics,
    Context.MergeUnwrapped<
      Context.MergeUnwrapped<TCtxData, RouteIntrinsics>,
      { urlPatternResult: URLPatternResult }
    >,
    typeof NoMatch | undefined
  >;
}) => TRoutes;

// Routes an incoming HTTP request to the first matching handler.
//
// Routes are matched in the order they are defined. The first route that matches
// both the HTTP method and URL pattern will handle the request.
export const route: {
  <TRoutes extends RoutePipe<object>[]>(
    createRoutes: CreateRoutes<object, TRoutes>,
    request: Request,
    ctxData?: undefined,
  ): Promise<Pipe.ReturnType<TRoutes[number]> | undefined>;

  <TCtxData extends object, TRoutes extends RoutePipe<TCtxData>[]>(
    createRoutes: CreateRoutes<TCtxData, TRoutes>,
    request: Request,
    ctxData: TCtxData,
  ): Promise<Pipe.ReturnType<TRoutes[number]> | undefined>;
} = async <TCtxData extends object, TRoutes extends RoutePipe<TCtxData>[]>(
  createRoutes: CreateRoutes<TCtxData, TRoutes>,
  request: Request,
  ctxData: TCtxData,
) => {
  for (const route of Iterator.from(
    createRoutes({
      createPipe: () => createPipe(),
      on: (method, pattern) =>
        createPipe<RouteIntrinsics>()
          .pipe(filterMethod(method))
          .pipe(filterURLPattern(pattern)),
    }),
  )) {
    const context = createContext({
      ...ctxData,
      request,
    }) as Context.Merge<RouteIntrinsics, TCtxData>;

    const handler = route.intoHandler();

    const result = await handler(context);

    if (result === NoMatch) {
      continue;
    }

    return result;
  }

  return undefined;
};

export const branch = async <TRes, TCtxData extends object>(
  factory: (
    pipe: NilPipe<NoInfer<TCtxData>>["pipe"],
  ) => Pipe<NoInfer<TCtxData>, object, TRes>,
  ctx: Context<TCtxData>,
): Promise<TRes> =>
  await factory(createPipe<TCtxData>().pipe).intoHandler()(ctx);
