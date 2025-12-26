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

    // Middleware chain with context augmentation
    on('POST', '/api/user')
      .pipe((ctx) => {
        // First handler: authentication middleware
        if (!ctx.request.headers.get('authorization')) {
          return new Response('Unauthorized', { status: 401 });
        }
        // Augment context and continue to next handler
        return ctx.with({ user: { id: '123' } });
      })
      .pipe((ctx) => {
        // Second handler: final response with typed context
        return Response.json({ message: `User ${ctx.user.id}` });
      }),
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
- Errors from handlers propagate to the caller

#### `on(method, pattern)`

Registers a route and returns a chain builder.

**Parameters:**

- `method` - HTTP method (`'GET'`, `'POST'`, etc.) or `'*'` for wildcard
- `pattern` - URL pattern as:
  - String (interpreted as pathname): `'/users/:id'`
  - URLPattern object: `new URLPattern({ pathname: '/users/:id' })`
  - URLPatternInit: `{ pathname: '/users/:id', search: '*' }`

**Returns:** A chain object with a `.pipe(handler)` method for adding handlers.

**Chain Behavior:**

Handlers are added using `.pipe(handler)` and receive a `Context<T>`. They can return:

- **`ctx.with(data)`** - Augments context with new data and continues to next handler
- **`ctx`** or **`undefined`** - Passes context unchanged to next handler
- **Any other value** - Terminates chain and returns that value

### `Context<T>`

The initial context object passed to handlers contains:

```typescript
{
  request: Request;                     // The incoming HTTP request
  urlPatternResult: URLPatternResult;   // URLPattern match results
  with: <U>(data: U) => Context<T & U>; // Augment context
  ...T                                  // Your custom context data
}
```

**Accessing Path Parameters:**

```typescript
on('GET', '/users/:userId/posts/:postId').pipe((ctx) => {
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
  on('GET', '/api/users/:id').pipe(getUserById),
  on('POST', '/api/users').pipe(createUser),

  // Wildcards last
  on('GET', '/api/*').pipe(catchAllApi),
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
  .pipe(requireAuth)
  .pipe(validateBody)
  .pipe((ctx) => {
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
on('POST', '/api/posts')
  .pipe((ctx) => {
    // TypeScript knows ctx has { request, urlPatternResult, ... }
    return ctx.with({ userId: '123' });
  })
  .pipe((ctx) => {
    // TypeScript infers ctx has { userId: string }
    ctx.userId; // ✓ Type-safe!
    return Response.json({ success: true });
  })
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
    on('GET', '/users').pipe(async (ctx) => {
      // ctx.db and ctx.config are available in all handlers
      const users = await ctx.db.query('SELECT * FROM users');
      return Response.json(users);
    }),
  ],
  request,
  appContext // Available in all handlers
);
```

### Full URLPattern Support

Use any URLPattern features, not just pathname:

```typescript
on('GET', {
  pathname: '/api/:version/*',
  search: 'key=:apiKey',
}).pipe((ctx) => {
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

on('GET', pattern).pipe((ctx) => {
  // Full control over matching
})
```

### Wildcard Method Matching

Match any HTTP method with `'*'`:

```typescript
on('*', '/health').pipe((ctx) => {
  // Responds to GET, POST, PUT, DELETE, etc.
  return Response.json({ status: 'ok' });
})
```

### Helper Utilities

Bihan provides helper utilities for common middleware tasks:

#### `withHeader`

Validates that a header is present or has a specific value:

```typescript
import { withHeader } from '@malobre/bihan/with-header.js';

on('POST', '/api/data')
  .pipe(withHeader('Content-Type', 'application/json'))
  .pipe((ctx) => {
    // Content-Type is validated
    return Response.json({ success: true });
  })

// Or just check for presence
on('POST', '/api/data')
  .pipe(withHeader('X-API-Key'))
  .pipe((ctx) => {
    // X-API-Key header is present
    return Response.json({ success: true });
  })
```

#### `withContentType`

Validates the Content-Type header (case-insensitive):

```typescript
import { withContentType } from '@malobre/bihan/with-content-type.js';

on('POST', '/api/data')
  .pipe(withContentType('application/json'))
  .pipe((ctx) => {
    // Content-Type is validated
    return Response.json({ success: true });
  })
```

#### `withAuthorization`

Parses and validates the Authorization header:

```typescript
import { withAuthorization } from '@malobre/bihan/with-authorization.js';

on('GET', '/api/protected')
  .pipe(withAuthorization(({ scheme, credentials }, ctx) => {
    if (scheme !== 'Bearer' || !isValidToken(credentials)) {
      return new Response('Invalid token', { status: 401 });
    }
    return ctx.with({ token: credentials });
  }))
  .pipe((ctx) => {
    // ctx.token is available
    return Response.json({ data: 'protected' });
  })
```
