import { type Context, isContext } from "./context.ts";
import type { Handler } from "./router.ts";

// Extract non-context types from handler return type
type ExtractNonCtx<T> = T extends Context<infer _TCtxData> ? never : T;

export interface Chain<
  TInitialCtxData extends object,
  TCtxData extends object,
  TResponse,
  TMeta,
> {
  pipe<TReturn>(
    handler: [TCtxData] extends [never]
      ? // Terminated chain
        never
      : // Partial chain
        Handler<TCtxData, TReturn>,
  ): Chain<
    TInitialCtxData,
    | (undefined extends Awaited<TReturn> ? TCtxData : never)
    | Context.Unwrap<Awaited<TReturn>>,
    // If TResponse is strictly undefined (which would be the case for a nil chain), override, otherwise accumulate.
    | (undefined extends TResponse ? never : TResponse)
    | ExtractNonCtx<Awaited<TReturn>>,
    TMeta
  >;

  intoHandler(): Handler<TInitialCtxData, Promise<TResponse>>;

  meta: TMeta;
}

export type NilChain<TCtxData extends object, TMeta> = Chain<
  TCtxData,
  TCtxData,
  undefined,
  TMeta
>;

const chainImpl = <TCtxData extends object, TMeta>(
  handlers: Handler<TCtxData, unknown>[],
  meta: TMeta,
) => ({
  pipe: (handler: Handler<TCtxData, unknown>) =>
    chainImpl([...handlers, handler], meta),
  meta,
  intoHandler: () => async (initialCtx: Context<TCtxData>) => {
    let ctx = initialCtx;

    for (const handler of handlers) {
      const result = await handler(ctx);

      if (result === undefined) {
        continue;
      }

      if (isContext(result)) {
        ctx = result as Context<TCtxData>;
        continue;
      }

      // Terminate chain and return result
      return result;
    }

    return undefined;
  },
});

export const createChain: {
  <TCtxData extends object>(meta?: undefined): NilChain<TCtxData, undefined>;
  <TCtxData extends object, TMeta>(meta: TMeta): NilChain<TCtxData, TMeta>;
} = <TCtxData extends object, TMeta>(meta: TMeta) =>
  chainImpl([], meta) as NilChain<TCtxData, TMeta>;
