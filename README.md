# 🤏 Bihan

A tiny, type-safe router built on URLPattern with zero dependencies.

> **⚠️ Experimental Package**
>
> This package is experimental and under active development.
> Routing performance is sub-optimal (routes are matched linearly).
> The primary goal of this experiment is to develop a type-safe routing API.

## Installation

```bash
npm install @malobre/bihan
```

## Usage

```typescript
import { route } from '@malobre/bihan';

await route(
  ({ on }) => [
    // Simple route returning data
    on('GET', '/health').pipe(() => ({ status: 'ok' })),

    // Route with path parameters
    on('GET', '/users/:id').pipe((ctx) => {
      const userId = ctx.urlPatternResult.pathname.groups['id'];
      return Response.json({ userId });
    }),

    // Middleware with context augmentation
    on('GET', '/api/user')
      .pipe((ctx) => ctx.with({user: "John"}))
      .pipe((ctx) => {
        // ctx.user is properly typed
        return Response.json({ message: `Hello ${ctx.user}` });
      }),
  ],
  request
);
```

## Design

In bihan, routes are chains of functions, we call them "pipes".
Functions in a pipe are called handlers, they take a single `Context` parameter.
`Context` are objects, they provide a single `with(data)` function which return a new `Context` augmented with `data`
The first handler in a pipe will receive a `Context<RouteIntrinsics>` which contains the HTTP request in its `request` field.
Handlers can return any value, but some have specific effects:
- a **`Context` object** - will be fed into the next handler
- **`undefined`** - keep the current context for the next handler
- **`NoMatch`** - tells the router to try other routes
- **Any other value** - Terminates the route and returns that value

## API

### `route(createRoutes, request, ctxData?)`

Routes an incoming request to the first matching handler.

**Parameters:**

- `createRoutes({ createPipe, on })` - Factory function that returns an array of routes
- `request` - The incoming `Request` object
- `ctxData` - Optional initial context data available to all handlers

**Returns:** The handler result, or `undefined` if no route matched.

**Behavior:**

- Routes are matched in order - first match wins
- Errors from handlers propagate to the caller

#### `on(method, pattern)`

A shorthand for `createPipe().pipe(filterMethod(method)).pipe(filterURLPattern(pattern))`.

Registers a route and returns a pipe builder.

**Parameters:**

- `method` - an HTTP method, an array of methods, or `AnyMethod` symbol
- `pattern` - URL pattern as:
  - String (interpreted as pathname): `'/users/:id'`
  - URLPattern object: `new URLPattern({ pathname: '/users/:id' })`
  - URLPatternInit: `{ pathname: '/users/:id', search: '*' }`

**Returns:** A pipe builder with a `.pipe(handler)` method for adding handlers.

**Pipe Behavior:**

Handlers are added using `.pipe(handler)` and receive a `Context<T>`. They can return:

- **`Context` object** - pass the context to the next handler
- **`undefined`** - keep the current context for the next handler
- **`NoMatch`** - tells the router to try other routes
- **Any other value** - Terminates the route and returns that value

#### `createPipe()`

Used when more advanced filtering is needed, return an empty pipe, which will resolve to `undefined` if called.

## Handlers, middlewares, and filters

By convention, handlers that could return `NoMatch` are prefixed by `filter`.
Handlers that are not final, i.e. could return a `Context`, are prefixed by `with`.

### Builtin filters

- `filterMethod`
- `filterURLPattern`

### Builtin middlewares

- `withHeader`
- `withHeaderFn`
- `withContentType`
- `withAuthorization`

### Composable handlers
Create composable handlers by making them generic over the context data:

```typescript
import type { Context } from '@malobre/bihan';

// Validation middleware - generic over context type
const validateBody = async <TCtxData>(ctx: Context<TCtxData>) => {
  const body = await ctx.request.json();

  if (!body.name) {
    return Response.json({ error: 'Name required' }, { status: 400 });
  }

  return ctx.with({ body });
};
```
