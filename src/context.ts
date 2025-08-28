// Symbol used to brand context `with` functions for runtime type checking
const CONTEXT_BRAND: unique symbol = Symbol("context");

type WithFn<TDataInitial extends object> = {
  <TDataNew extends object>(
    data: TDataNew,
  ): Context.Merge<TDataInitial, TDataNew>;
  readonly [CONTEXT_BRAND]: unknown;
};

// A context wrapper that provides type-safe context augmentation via the `.with()` method.
export type Context<TData extends object> = Omit<
  TData,
  keyof Intrinsics<TData>
> &
  Intrinsics<TData>;

export namespace Context {
  export type MergeUnwrapped<
    TDataInitial extends object,
    TDataNew extends object,
  > = Omit<TDataInitial, keyof TDataNew> & TDataNew;

  export type Merge<
    TDataInitial extends object,
    TDataNew extends object,
  > = Context<MergeUnwrapped<TDataInitial, TDataNew>>;

  export type Unwrap<T> = T extends Context<infer TData> ? TData : never;

  // type Flatten<T> = T  ? { [K in keyof T]: T[K] } & {} : T;
}

type Intrinsics<TData extends object> = {
  // Augments the context with additional data, merging and overriding properties
  readonly with: WithFn<TData>;
};

export const isContext = (value: unknown): value is Context<object> =>
  typeof value === "object" &&
  value !== null &&
  "with" in value &&
  typeof value.with === "function" &&
  CONTEXT_BRAND in value.with;

const createWithFn = <TData extends object>(data: TData): WithFn<TData> => {
  const withFn: Omit<WithFn<TData>, typeof CONTEXT_BRAND> = <U>(ext: U) =>
    createContext({ ...data, ...ext });

  const brandWithFn: <TData extends object>(
    fn: Omit<WithFn<TData>, typeof CONTEXT_BRAND>,
  ) => asserts fn is WithFn<TData> = (fn) => {
    Object.defineProperty(fn, CONTEXT_BRAND, {
      value: undefined,
      writable: false,
      enumerable: false,
      configurable: false,
    });
  };

  brandWithFn(withFn);

  return withFn satisfies WithFn<TData>;
};

export const createContext = <TData extends object>(
  data: TData,
): Context<TData> => ({
  ...data,
  with: createWithFn(data),
});
