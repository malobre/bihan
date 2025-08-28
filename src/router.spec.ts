import { describe, expect, it } from "vitest";
import { route } from "./router.ts";

describe("Router", () => {
  describe("route registration", () => {
    it("registers and executes simple GET route", async () => {
      const result = await route(
        ({ on }) => [
          on("GET", { pathname: "/health" }).pipe(() => ({ status: "ok" })),
        ],
        new Request("http://dummy.invalid/health"),
      );

      expect(result).toEqual({ status: "ok" });
    });

    it("registers routes with different HTTP methods", async () => {
      expect(
        await route(
          ({ on }) => [
            on("GET", { pathname: "/users" }).pipe(() => "get users"),
          ],
          new Request("http://dummy.invalid/users", { method: "GET" }),
        ),
      ).toBe("get users");

      expect(
        await route(
          ({ on }) => [
            on("POST", { pathname: "/users" }).pipe(() => "create user"),
          ],
          new Request("http://dummy.invalid/users", { method: "POST" }),
        ),
      ).toBe("create user");

      expect(
        await route(
          ({ on }) => [
            on("PUT", { pathname: "/users" }).pipe(() => "update user"),
          ],
          new Request("http://dummy.invalid/users", { method: "PUT" }),
        ),
      ).toBe("update user");

      expect(
        await route(
          ({ on }) => [
            on("DELETE", { pathname: "/users" }).pipe(() => "delete user"),
          ],
          new Request("http://dummy.invalid/users", { method: "DELETE" }),
        ),
      ).toBe("delete user");
    });

    it("registers routes with URLPattern objects", async () => {
      const pattern = new URLPattern({ pathname: "/api/:version/users" });

      const result = await route(
        ({ on }) => [
          on("GET", pattern).pipe((ctx) => {
            return `version: ${
              // biome-ignore lint/complexity/useLiteralKeys: index type
              ctx.urlPatternResult.pathname.groups["version"]
            }`;
          }),
        ],
        new Request("http://dummy.invalid/api/v1/users"),
      );

      expect(result).toBe("version: v1");
    });
  });

  describe("URL pattern matching", () => {
    it("matches routes with path parameters", async () => {
      const result = await route(
        ({ on }) => [
          on("GET", { pathname: "/users/:id" }).pipe((ctx) => ({
            // biome-ignore lint/complexity/useLiteralKeys: index type
            userId: ctx.urlPatternResult.pathname.groups["id"],
          })),
        ],
        new Request("http://dummy.invalid/users/123"),
      );

      expect(result).toEqual({ userId: "123" });
    });

    it("matches routes with multiple parameters", async () => {
      const result = await route(
        ({ on }) => [
          on("GET", { pathname: "/users/:userId/posts/:postId" }).pipe(
            (ctx) => ({
              // biome-ignore lint/complexity/useLiteralKeys: index type
              userId: ctx.urlPatternResult.pathname.groups["userId"],
              // biome-ignore lint/complexity/useLiteralKeys: index type
              postId: ctx.urlPatternResult.pathname.groups["postId"],
            }),
          ),
        ],
        new Request("http://dummy.invalid/users/123/posts/456"),
      );

      expect(result).toEqual({ userId: "123", postId: "456" });
    });

    it("matches wildcard patterns", async () => {
      const result = await route(
        ({ on }) => [
          on("GET", { pathname: "/files/*" }).pipe((ctx) => ({
            path: ctx.urlPatternResult.pathname.groups["0"],
          })),
        ],
        new Request("http://dummy.invalid/files/documents/report.pdf"),
      );

      expect(result).toEqual({ path: "documents/report.pdf" });
    });

    it("returns undefined for unmatched routes", async () => {
      const result = await route(
        ({ on }) => [on("GET", { pathname: "/users" }).pipe(() => "users")],
        new Request("http://dummy.invalid/posts"),
      );

      expect(result).toBeUndefined();
    });

    it("returns undefined for wrong HTTP method", async () => {
      const result = await route(
        ({ on }) => [on("GET", { pathname: "/users" }).pipe(() => "users")],
        new Request("http://dummy.invalid/users", { method: "POST" }),
      );

      expect(result).toBeUndefined();
    });
  });

  describe("route precedence", () => {
    it("uses first matching route (precedence rule)", async () => {
      const result = await route(
        ({ on }) => [
          on("GET", { pathname: "/api/*" }).pipe(() => "wildcard"),
          on("GET", { pathname: "/api/users" }).pipe(() => "specific"),
        ],
        new Request("http://dummy.invalid/api/users"),
      );

      expect(result).toBe("wildcard");
    });

    it("matches more specific routes when registered first", async () => {
      const result = await route(
        ({ on }) => [
          on("GET", { pathname: "/api/users/:id" }).pipe(
            // biome-ignore lint/complexity/useLiteralKeys: index type
            (ctx) => `user ${ctx.urlPatternResult.pathname.groups["id"]}`,
          ),
          on("GET", { pathname: "/api/*" }).pipe(() => "wildcard"),
        ],
        new Request("http://dummy.invalid/api/users/123"),
      );

      expect(result).toBe("user 123");
    });
  });

  describe("return type handling", () => {
    it("handles different return types from routes", async () => {
      expect(
        await route(
          ({ on }) => [
            on("GET", { pathname: "/api/string" }).pipe(() => "hello"),
            on("GET", { pathname: "/api/number" }).pipe(() => 42),
            on("GET", { pathname: "/api/object" }).pipe(() => ({ data: true })),
            on("GET", { pathname: "/api/boolean" }).pipe(() => false),
            on("GET", { pathname: "/api/null" }).pipe(() => null),
            on("POST", { pathname: "/api/create" }).pipe(
              () => new Response("Created", { status: 201 }),
            ),
          ],
          new Request("http://dummy.invalid/api/string"),
        ),
      ).toBe("hello");
      expect(
        await route(
          ({ on }) => [
            on("GET", { pathname: "/api/string" }).pipe(() => "hello"),
            on("GET", { pathname: "/api/number" }).pipe(() => 42),
            on("GET", { pathname: "/api/object" }).pipe(() => ({ data: true })),
            on("GET", { pathname: "/api/boolean" }).pipe(() => false),
            on("GET", { pathname: "/api/null" }).pipe(() => null),
            on("POST", { pathname: "/api/create" }).pipe(
              () => new Response("Created", { status: 201 }),
            ),
          ],
          new Request("http://dummy.invalid/api/number"),
        ),
      ).toBe(42);
      expect(
        await route(
          ({ on }) => [
            on("GET", { pathname: "/api/string" }).pipe(() => "hello"),
            on("GET", { pathname: "/api/number" }).pipe(() => 42),
            on("GET", { pathname: "/api/object" }).pipe(() => ({ data: true })),
            on("GET", { pathname: "/api/boolean" }).pipe(() => false),
            on("GET", { pathname: "/api/null" }).pipe(() => null),
            on("POST", { pathname: "/api/create" }).pipe(
              () => new Response("Created", { status: 201 }),
            ),
          ],
          new Request("http://dummy.invalid/api/object"),
        ),
      ).toEqual({ data: true });
      expect(
        await route(
          ({ on }) => [
            on("GET", { pathname: "/api/string" }).pipe(() => "hello"),
            on("GET", { pathname: "/api/number" }).pipe(() => 42),
            on("GET", { pathname: "/api/object" }).pipe(() => ({ data: true })),
            on("GET", { pathname: "/api/boolean" }).pipe(() => false),
            on("GET", { pathname: "/api/null" }).pipe(() => null),
            on("POST", { pathname: "/api/create" }).pipe(
              () => new Response("Created", { status: 201 }),
            ),
          ],
          new Request("http://dummy.invalid/api/boolean"),
        ),
      ).toBe(false);
      expect(
        await route(
          ({ on }) => [
            on("GET", { pathname: "/api/string" }).pipe(() => "hello"),
            on("GET", { pathname: "/api/number" }).pipe(() => 42),
            on("GET", { pathname: "/api/object" }).pipe(() => ({ data: true })),
            on("GET", { pathname: "/api/boolean" }).pipe(() => false),
            on("GET", { pathname: "/api/null" }).pipe(() => null),
            on("POST", { pathname: "/api/create" }).pipe(
              () => new Response("Created", { status: 201 }),
            ),
          ],
          new Request("http://dummy.invalid/api/null"),
        ),
      ).toBe(null);

      const responseResult = await route(
        ({ on }) => [
          on("GET", { pathname: "/api/string" }).pipe(() => "hello"),
          on("GET", { pathname: "/api/number" }).pipe(() => 42),
          on("GET", { pathname: "/api/object" }).pipe(() => ({ data: true })),
          on("GET", { pathname: "/api/boolean" }).pipe(() => false),
          on("GET", { pathname: "/api/null" }).pipe(() => null),
          on("POST", { pathname: "/api/create" }).pipe(
            () => new Response("Created", { status: 201 }),
          ),
        ],
        new Request("http://dummy.invalid/api/create", { method: "POST" }),
      );
      expect(responseResult).toBeInstanceOf(Response);
    });

    it("handles async route handlers", async () => {
      const result = await route(
        ({ on }) => [
          on("GET", { pathname: "/api/async" }).pipe(async () => {
            await new Promise((resolve) => setTimeout(resolve, 1));
            return "async result";
          }),
        ],
        new Request("http://dummy.invalid/api/async"),
      );

      expect(result).toBe("async result");
    });
  });

  describe("context handling", () => {
    it("provides request and params in context", async () => {
      const request = new Request("http://dummy.invalid/users/123", {
        method: "GET",
      });
      const result = await route(
        ({ on }) => [
          on("GET", { pathname: "/users/:id" }).pipe((ctx) =>
            ctx.staging
              ? {
                  method: ctx.request.method,
                  url: ctx.request.url,
                  // biome-ignore lint/complexity/useLiteralKeys: index type
                  userId: ctx.urlPatternResult.pathname.groups["id"],
                }
              : {},
          ),
        ],
        request,
        { staging: true },
      );

      expect(result).toEqual({
        method: "GET",
        url: "http://dummy.invalid/users/123",
        userId: "123",
      });
    });

    it("handles missing parameters gracefully", async () => {
      const result = await route(
        ({ on }) => [
          on("GET", { pathname: "/static" }).pipe((ctx) => ({
            params: ctx.urlPatternResult.pathname.groups,
          })),
        ],
        new Request("http://dummy.invalid/static"),
      );

      expect(result).toEqual({ params: {} });
    });
  });

  describe("middleware chain integration", () => {
    it("integrates with chain for middleware processing", async () => {
      const authorizedResult = await route(
        ({ on }) => [
          on("GET", { pathname: "/api/user" })
            .pipe((ctx) => {
              // Mock authorization check
              const hasAuth = ctx.request.headers.get("authorization") !== null;
              if (!hasAuth) {
                return new Response("Unauthorized", { status: 401 });
              }
              return ctx.with({ user: { id: "123", name: "John" } });
            })
            .pipe((ctx) => {
              return {
                message: `Welcome ${ctx.user.name}`,
                userId: ctx.user.id,
              };
            }),
        ],
        new Request("http://dummy.invalid/api/user", {
          headers: { authorization: "Bearer token" },
        }),
      );
      expect(authorizedResult).toEqual({
        message: "Welcome John",
        userId: "123",
      });

      const unauthorizedResult = await route(
        ({ on }) => [
          on("GET", { pathname: "/api/user" })
            .pipe((ctx) => {
              // Mock authorization check
              const hasAuth = ctx.request.headers.get("authorization") !== null;
              if (!hasAuth) {
                return new Response("Unauthorized", { status: 401 });
              }
              return ctx.with({ user: { id: "123", name: "John" } });
            })
            .pipe((ctx) => {
              return {
                message: `Welcome ${ctx.user.name}`,
                userId: ctx.user.id,
              };
            }),
        ],
        new Request("http://dummy.invalid/api/user"),
      );
      expect(unauthorizedResult).toBeInstanceOf(Response);
      expect((unauthorizedResult as Response).status).toBe(401);
    });

    it("handles complex middleware chains", async () => {
      const result = await route(
        ({ on }) => [
          on("POST", { pathname: "/api/process" })
            .pipe(
              // Body parser middleware
              (ctx) => {
                // Mock body parsing
                return ctx.with({ body: { name: "Alice" } });
              },
            )
            .pipe(
              // Validation middleware
              (ctx) => {
                if (!ctx.body || typeof ctx.body.name !== "string") {
                  return new Response("Name is required", { status: 400 });
                }
                return ctx.with({ validatedData: { name: ctx.body.name } });
              },
            )
            .pipe(
              // Final handler
              (ctx) => {
                return {
                  processed: true,
                  name: ctx.validatedData.name,
                  timestamp: Date.now(),
                };
              },
            ),
        ],
        new Request("http://dummy.invalid/api/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Alice" }),
        }),
      );

      expect(result).toEqual({
        processed: true,
        name: "Alice",
        timestamp: expect.any(Number),
      });
    });

    it("handles async middleware chains", async () => {
      const result = await route(
        ({ on }) => [
          on("GET", { pathname: "/api/async" })
            .pipe(async (ctx) => {
              await new Promise((resolve) => setTimeout(resolve, 1));
              return ctx.with({ data: "loaded" });
            })
            .pipe(async (ctx) => {
              await new Promise((resolve) => setTimeout(resolve, 1));
              return {
                result: `Processed ${ctx.data}`,
                timestamp: Date.now(),
              };
            }),
        ],
        new Request("http://dummy.invalid/api/async"),
      );

      expect(result).toEqual({
        result: "Processed loaded",
        timestamp: expect.any(Number),
      });
    });

    it("handles mixed sync/async middleware chains", async () => {
      const result = await route(
        ({ on }) => [
          on("POST", { pathname: "/api/mixed" })
            .pipe((ctx) => {
              return ctx.with({ step: "sync" });
            })
            .pipe(async (ctx) => {
              await new Promise((resolve) => setTimeout(resolve, 1));
              return ctx.with({ step: "async", processed: true });
            })
            .pipe((ctx) => {
              return {
                message: `Steps: ${ctx.step}`,
                processed: ctx.processed,
              };
            }),
        ],
        new Request("http://dummy.invalid/api/mixed", { method: "POST" }),
      );

      expect(result).toEqual({
        message: "Steps: async",
        processed: true,
      });
    });
  });

  describe("error handling", () => {
    it("propagates handler errors", async () => {
      await expect(
        route(
          ({ on }) => [
            on("GET", { pathname: "/error" }).pipe(() => {
              throw new Error("Handler error");
            }),
          ],
          new Request("http://dummy.invalid/error"),
        ),
      ).rejects.toThrow("Handler error");
    });

    it("propagates async handler errors", async () => {
      await expect(
        route(
          ({ on }) => [
            on("GET", { pathname: "/async-error" }).pipe(async () => {
              await new Promise((resolve) => setTimeout(resolve, 1));
              throw new Error("Async handler error");
            }),
          ],
          new Request("http://dummy.invalid/async-error"),
        ),
      ).rejects.toThrow("Async handler error");
    });

    it("propagates chain middleware errors", async () => {
      await expect(
        route(
          ({ on }) => [
            on("GET", { pathname: "/chain-error" })
              .pipe((ctx) => {
                return ctx.with({ data: "test" });
              })
              .pipe((_ctx) => {
                throw new Error("Chain middleware error");
              }),
          ],
          new Request("http://dummy.invalid/chain-error"),
        ),
      ).rejects.toThrow("Chain middleware error");
    });
  });

  describe("edge cases", () => {
    it("handles routes with query parameters", async () => {
      const result = await route(
        ({ on }) => [
          on("GET", { pathname: "/search" }).pipe((ctx) => ({
            url: ctx.request.url,
          })),
        ],
        new Request("http://dummy.invalid/search?q=test&limit=10"),
      );

      expect(result).toEqual({
        url: "http://dummy.invalid/search?q=test&limit=10",
      });
    });

    it("handles routes with fragments", async () => {
      const result = await route(
        ({ on }) => [
          on("GET", { pathname: "/page" }).pipe((ctx) => ({
            url: ctx.request.url,
          })),
        ],
        new Request("http://dummy.invalid/page#section"),
      );

      expect(result).toEqual({ url: "http://dummy.invalid/page#section" });
    });

    it("handles empty route pattern", async () => {
      const result = await route(
        ({ on }) => [on("GET", { pathname: "/" }).pipe(() => "root")],
        new Request("http://dummy.invalid/"),
      );

      expect(result).toBe("root");
    });

    it("works with different URL schemes", async () => {
      const httpsResult = await route(
        ({ on }) => [
          on("GET", { pathname: "/test" }).pipe((ctx) => ({
            protocol: new URL(ctx.request.url).protocol,
          })),
        ],
        new Request("https://example.com/test"),
      );
      expect(httpsResult).toEqual({ protocol: "https:" });

      const httpResult = await route(
        ({ on }) => [
          on("GET", { pathname: "/test" }).pipe((ctx) => ({
            protocol: new URL(ctx.request.url).protocol,
          })),
        ],
        new Request("http://example.com/test"),
      );
      expect(httpResult).toEqual({ protocol: "http:" });
    });
  });
});
