import { expect, it } from "vitest";

import { createContext } from "./core/context.ts";
import { NoMatch } from "./core/router.ts";
import { filterURLPattern } from "./filter-url-pattern.ts";

it("returns `NoMatch` on mismatch", () => {
  const handler = filterURLPattern("/health");

  expect(
    handler(
      createContext({ request: new Request("https://dummy.invalid/invalid") }),
    ),
  ).toBe(NoMatch);
});

it("accepts a string as a URLPattern pathname component", () => {
  const handler = filterURLPattern("/health");

  expect(
    handler(
      createContext({ request: new Request("https://dummy.invalid/health") }),
    ),
  ).toMatchInlineSnapshot(`
    {
      "request": Request {},
      "urlPatternResult": {
        "hash": {
          "groups": {
            "0": "",
          },
          "input": "",
        },
        "hostname": {
          "groups": {
            "0": "dummy.invalid",
          },
          "input": "dummy.invalid",
        },
        "inputs": [
          "https://dummy.invalid/health",
        ],
        "password": {
          "groups": {
            "0": "",
          },
          "input": "",
        },
        "pathname": {
          "groups": {},
          "input": "/health",
        },
        "port": {
          "groups": {
            "0": "",
          },
          "input": "",
        },
        "protocol": {
          "groups": {
            "0": "https",
          },
          "input": "https",
        },
        "search": {
          "groups": {
            "0": "",
          },
          "input": "",
        },
        "username": {
          "groups": {
            "0": "",
          },
          "input": "",
        },
      },
      "with": [Function],
    }
  `);
});

it("accepts an URLPattern instance", () => {
  const handler = filterURLPattern(new URLPattern({ pathname: "/health" }));

  expect(
    handler(
      createContext({ request: new Request("https://dummy.invalid/health") }),
    ),
  ).toMatchInlineSnapshot(`
    {
      "request": Request {},
      "urlPatternResult": {
        "hash": {
          "groups": {
            "0": "",
          },
          "input": "",
        },
        "hostname": {
          "groups": {
            "0": "dummy.invalid",
          },
          "input": "dummy.invalid",
        },
        "inputs": [
          "https://dummy.invalid/health",
        ],
        "password": {
          "groups": {
            "0": "",
          },
          "input": "",
        },
        "pathname": {
          "groups": {},
          "input": "/health",
        },
        "port": {
          "groups": {
            "0": "",
          },
          "input": "",
        },
        "protocol": {
          "groups": {
            "0": "https",
          },
          "input": "https",
        },
        "search": {
          "groups": {
            "0": "",
          },
          "input": "",
        },
        "username": {
          "groups": {
            "0": "",
          },
          "input": "",
        },
      },
      "with": [Function],
    }
  `);
});

it("accepts a URLPatternInit object", () => {
  const handler = filterURLPattern({ pathname: "/health" });

  expect(
    handler(
      createContext({ request: new Request("https://dummy.invalid/health") }),
    ),
  ).toMatchInlineSnapshot(`
    {
      "request": Request {},
      "urlPatternResult": {
        "hash": {
          "groups": {
            "0": "",
          },
          "input": "",
        },
        "hostname": {
          "groups": {
            "0": "dummy.invalid",
          },
          "input": "dummy.invalid",
        },
        "inputs": [
          "https://dummy.invalid/health",
        ],
        "password": {
          "groups": {
            "0": "",
          },
          "input": "",
        },
        "pathname": {
          "groups": {},
          "input": "/health",
        },
        "port": {
          "groups": {
            "0": "",
          },
          "input": "",
        },
        "protocol": {
          "groups": {
            "0": "https",
          },
          "input": "https",
        },
        "search": {
          "groups": {
            "0": "",
          },
          "input": "",
        },
        "username": {
          "groups": {
            "0": "",
          },
          "input": "",
        },
      },
      "with": [Function],
    }
  `);
});
