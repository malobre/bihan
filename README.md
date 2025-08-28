# Bihan

A tiny, type-safe router built on URLPattern with zero dependencies.

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
    on('GET', '/health')(() => ({ status: 'ok' })),

    // Route with path parameters
    on('GET', '/users/:id')((ctx) => {
      const userId = ctx.urlPatternResult.pathname.groups['id'];
      return Response.json({ userId });
    }),

    // Middleware chain with context augmentation
    on('POST', '/api/user')(
      // First handler: authentication middleware
      (ctx) => {
        if (!ctx.request.headers.get('authorization')) {
          return new Response('Unauthorized', { status: 401 });
        }
        // Augment context and continue to next handler
        return ctx.with({ user: { id: '123' } });
      }
    )(
      // Second handler: final response with typed context
      (ctx) => Response.json({ message: `User ${ctx.user.id}` })
    ),
  ],
  request
);
```

## API

### `route(createRoutes, request, ctxData?)`

Routes an incoming request to the first matching handler.

**Parameters:**

- `createRoutes` - Factory function that receives `{ on }` and returns an array of routes
- `request` - The incoming `Request` object
- `ctxData` - Optional initial context data available to all handlers

**Returns:** The handler result, or `undefined` if no route matched.

**Behavior:**

- Routes are matched in order - first match wins
- Both HTTP method and URL pattern must match
- Errors from handlers propagate to the caller

#### `on(method, pattern)`

Registers a route and returns a chain builder.

**Parameters:**

- `method` - HTTP method (`'GET'`, `'POST'`, etc.) or `'*'` for wildcard
- `pattern` - URL pattern as:
  - String (interpreted as pathname): `'/users/:id'`
  - URLPattern object: `new URLPattern({ pathname: '/users/:id' })`
  - URLPatternInit: `{ pathname: '/users/:id', search: '*' }`

**Chain Behavior:**

Handlers receive a `Context<T>` and can return:

- **Any value** (including `null`, `false`, `0`) - Terminates chain and returns that value
- **`ctx.with(data)`** - Augments context with new data and continues to next handler
- **`ctx`** - Passes context unchanged to next handler
- **`undefined`** - Continues to next handler without modifying context

### `Context<T>`

The context object passed to handlers contains:

```typescript
{
  request: Request;                    // The incoming HTTP request
  urlPatternResult: URLPatternResult;  // URLPattern match results
  with: <U>(data: U) => Context<T & U>; // Augment context
  branch: (...) => Promise<...>;       // Run sub-chains (see Advanced)
  ...T                                 // Your custom context data
}
```

**Accessing Path Parameters:**

```typescript
on('GET', '/users/:userId/posts/:postId')((ctx) => {
  const { userId, postId } = ctx.urlPatternResult.pathname.groups;
  return Response.json({ userId, postId });
})
```

## Best Practices

### Route Organization

Group related routes together and order from most specific to least specific:

```typescript
await route(({ on }) => [
  // Specific routes first
  on('GET', '/api/users/:id')(getUserById),
  on('POST', '/api/users')(createUser),

  // Wildcards last
  on('GET', '/api/*')(catchAllApi),
], request);
```

### Reusable Middleware

Create composable middleware by defining handler functions:

```typescript
import type { Context } from '@malobre/bihan';

// Authentication middleware - generic over context type
const requireAuth = <TCtxData>(ctx: Context<TCtxData>) => {
  const token = ctx.request.headers.get('authorization');
  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }
  return ctx.with({ token });
};

// Validation middleware - generic over context type
const validateBody = async <TCtxData>(ctx: Context<TCtxData>) => {
  const body = await ctx.request.json();
  if (!body.name) {
    return Response.json({ error: 'Name required' }, { status: 400 });
  }
  return ctx.with({ body });
};

// Use in routes
on('POST', '/api/users')
  (requireAuth)
  (validateBody)
  ((ctx) => {
    // TypeScript infers ctx has { token: string, body: any }
    return Response.json({ created: true });
  })
```

### Error Handling

Let errors propagate and handle them at the top level:

```typescript
try {
  const result = await route(({ on }) => [...], request);

  if (result === undefined) {
    return new Response('Not Found', { status: 404 });
  }

  // Handle non-Response results
  if (!(result instanceof Response)) {
    return Response.json(result);
  }

  return result;
} catch (error) {
  console.error('Route error:', error);
  return new Response('Internal Server Error', { status: 500 });
}
```

### Type Safety

Let TypeScript infer types through the chain:

```typescript
on('POST', '/api/posts')(
  (ctx) => {
    // TypeScript knows ctx has { request, urlPatternResult, ... }
    return ctx.with({ userId: '123' });
  }
)(
  (ctx) => {
    // TypeScript infers ctx has { userId: string }
    ctx.userId; // ✓ Type-safe!
    return Response.json({ success: true });
  }
)
```

## Advanced Features

### Custom Context Data

Pass initial context to all handlers via the third parameter:

```typescript
const appContext = {
  db: database,
  config: appConfig,
};

await route(
  ({ on }) => [
    on('GET', '/users')(async (ctx) => {
      // ctx.db and ctx.config are available in all handlers
      const users = await ctx.db.query('SELECT * FROM users');
      return Response.json(users);
    }),
  ],
  request,
  appContext // Available in all handlers
);
```

### Context Branching

Run sub-chains with `ctx.branch()` for conditional logic or composition:

```typescript
on('POST', '/api/process')(async (ctx) => {
  // Run a sub-chain with its own context flow
  const result = await ctx.branch(
    (run) => run
      ((ctx) => ctx.with({ step: 1, data: 'processing' }))
      ((ctx) => ctx.with({ step: 2 }))
      ((ctx) => ({ finalStep: ctx.step, data: ctx.data })),
  );

  return Response.json({ result }); // { result: { finalStep: 2, data: 'processing' } }
})
```

### Full URLPattern Support

Use any URLPattern features, not just pathname:

```typescript
on('GET', {
  pathname: '/api/:version/*',
  search: 'key=:apiKey',
})((ctx) => {
  const { version } = ctx.urlPatternResult.pathname.groups;
  const { apiKey } = ctx.urlPatternResult.search.groups;
  return Response.json({ version, apiKey });
})

// Or use URLPattern directly
const pattern = new URLPattern({
  protocol: 'https',
  hostname: 'api.example.com',
  pathname: '/v:version/*',
});

on('GET', pattern)((ctx) => {
  // Full control over matching
})
```

### Wildcard Method Matching

Match any HTTP method with `'*'`:

```typescript
on('*', '/health')((ctx) => {
  // Responds to GET, POST, PUT, DELETE, etc.
  return Response.json({ status: 'ok' });
})
```
