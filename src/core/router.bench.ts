import { bench, describe } from "vitest";
import { route } from "./router.ts";

describe.for([
  {
    name: "short static",
    method: "GET",
    path: "/user",
  },
  {
    name: "static with same radix",
    method: "GET",
    path: "/user/comments",
  },
  {
    name: "dynamic route",
    method: "GET",
    path: "/user/lookup/username/hey",
  },
  {
    name: "mixed static dynamic",
    method: "GET",
    path: "/event/abcd1234/comments",
  },
  {
    name: "post",
    method: "POST",
    path: "/event/abcd1234/comment",
  },
  {
    name: "long static",
    method: "GET",
    path: "/very/deeply/nested/route/hello/there",
  },
  {
    name: "wildcard",
    method: "GET",
    path: "/static/index.html",
  },
])("$name", ({ method, path }) => {
  bench("route", async () => {
    await route(
      ({ on }) => [
        on("GET", "/user").pipe(() => new Response("User")),
        on("GET", "/user/comments").pipe(() => new Response("User Comments")),
        on("GET", "/user/avatar").pipe(() => new Response("User Avatar")),
        on("GET", "/user/lookup/username/:username").pipe(
          ({ urlPatternResult }) => {
            return new Response(
              `Hello ${
                // biome-ignore lint/complexity/useLiteralKeys: index signature
                urlPatternResult.pathname.groups["username"]
              }`,
              {
                status: 200,
                headers: { "Content-Type": "text/plain;charset=UTF-8" },
              },
            );
          },
        ),
        on("GET", "/user/lookup/email/:address").pipe(
          () => new Response("User Lookup Email Address"),
        ),
        on("GET", "/event/:id").pipe(() => new Response("Event")),
        on("GET", "/event/:id/comments").pipe(
          () => new Response("Event Comments"),
        ),
        on("POST", "/event/:id/comment").pipe(
          () => new Response("POST Event Comments"),
        ),
        on("GET", "/status").pipe(() => new Response("Status")),
        on("GET", "/very/deeply/nested/route/hello/there").pipe(
          () => new Response("Very Deeply Nested Route"),
        ),
        on("GET", "/static/*").pipe(() => new Response("Static")),
      ],
      new Request(new URL(path, "https://dummy.invalid"), { method }),
    );
  });
});
