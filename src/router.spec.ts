import { expect, it } from "vitest";
import { branch, NoMatch, route } from "./router.ts";

it("let errors bubble", async () => {
  const request = new Request("https://dummy.invalid");

  await expect(
    route(
      ({ createPipe }) => [
        createPipe().pipe(() => {
          throw "an error";
        }),
      ],
      request,
    ),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`"an error"`);
});

it("returns undefined when no route matches", async () => {
  const request = new Request("https://dummy.invalid");

  await expect(route(() => [], request)).resolves.toBeUndefined();
});

it("can create branches", async () => {
  const request = new Request("https://dummy.invalid");

  await expect(
    route(
      ({ createPipe }) => [
        createPipe().pipe((ctx) => {
          return branch((pipe) => {
            return pipe(() => ({ success: true }));
          }, ctx);
        }),
      ],
      request,
    ),
  ).resolves.toMatchInlineSnapshot(`
    {
      "success": true,
    }
  `);
});

it("provides `on` util", async () => {
  const request = new Request("https://dummy.invalid");

  await expect(
    route(
      ({ on }) => [on("GET", "/").pipe(() => ({ success: true }))],
      request,
    ),
  ).resolves.toMatchInlineSnapshot(`
    {
      "success": true,
    }
  `);
});

it("handles `NoMatch`", async () => {
  const request = new Request("https://dummy.invalid");

  await expect(
    route(
      ({ createPipe }) => [
        createPipe().pipe(() => {
          return NoMatch;
        }),
        createPipe().pipe(() => ({ success: true })),
      ],
      request,
    ),
  ).resolves.toMatchInlineSnapshot(`
    {
      "success": true,
    }
  `);
});
