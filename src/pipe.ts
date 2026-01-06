import { type Context, isContext } from "./context.ts";
import type { Handler } from "./router.ts";

// Extract non-context types from handler return type
type ExtractNonCtx<T> = T extends Context<infer _TCtxData> ? never : T;

export interface Pipe<
  TInitialCtxData extends object,
  TCtxData extends object,
  TResponse,
  TMeta,
> {
  pipe<TReturn>(
    handler: [TCtxData] extends [never]
      ? // Terminated pipe
        never
      : // Partial pipe
        Handler<TCtxData, TReturn>,
  ): Pipe<
    TInitialCtxData,
    | (undefined extends Awaited<TReturn> ? TCtxData : never)
    | Context.Unwrap<Awaited<TReturn>>,
    // If TResponse is strictly undefined (which would be the case for a nil pipe), override, otherwise accumulate.
    | (undefined extends TResponse ? never : TResponse)
    | ExtractNonCtx<Awaited<TReturn>>,
    TMeta
  >;

  intoHandler(): Handler<TInitialCtxData, Promise<TResponse>>;

  meta: TMeta;
}

export type NilPipe<TCtxData extends object, TMeta> = Pipe<
  TCtxData,
  TCtxData,
  undefined,
  TMeta
>;

const pipeImpl = <TCtxData extends object, TMeta>(
  handlers: Handler<TCtxData, unknown>[],
  meta: TMeta,
) => ({
  pipe: (handler: Handler<TCtxData, unknown>) =>
    pipeImpl([...handlers, handler], meta),
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

      // Terminate pipe and return result
      return result;
    }

    return undefined;
  },
});

export const createPipe: {
  <TCtxData extends object>(meta?: undefined): NilPipe<TCtxData, undefined>;
  <TCtxData extends object, TMeta>(meta: TMeta): NilPipe<TCtxData, TMeta>;
} = <TCtxData extends object, TMeta>(meta: TMeta) =>
  pipeImpl([], meta) as NilPipe<TCtxData, TMeta>;
