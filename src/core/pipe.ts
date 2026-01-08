import { type Context, isContext } from "./context.ts";
import type { Handler } from "./router.ts";

// Extract non-context types from handler return type
type ExtractNonCtx<T> = T extends Context<infer _TCtxData> ? never : T;

export interface Pipe<
  TInitialCtxData extends object,
  TCtxData extends object,
  TResponse,
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
    | ExtractNonCtx<Awaited<TReturn>>
  >;

  intoHandler(): Handler<TInitialCtxData, Promise<TResponse>>;
}

export namespace Pipe {
  export type ReturnType<P> =
    P extends Pipe<infer _TInitialCtxData, infer _TCtxData, infer TResponse>
      ? TResponse
      : never;
}

export type NilPipe<TCtxData extends object> = Pipe<
  TCtxData,
  TCtxData,
  undefined
>;

const pipeImpl = <TCtxData extends object>(
  handlers: Handler<TCtxData, unknown>[],
) => ({
  pipe(handler: Handler<TCtxData, unknown>) {
    return pipeImpl([...handlers, handler]);
  },
  intoHandler() {
    return async (initialCtx: Context<TCtxData>) => {
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
    };
  },
});

export const createPipe = <TCtxData extends object>() =>
  pipeImpl([]) as NilPipe<TCtxData>;
