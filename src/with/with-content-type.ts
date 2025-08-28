import type { Handler, RouteIntrinsics } from "../index.ts";
import { withHeaderFn } from "./with-header.ts";

const caseInsensitiveCollator = new Intl.Collator("en", {
  sensitivity: "accent",
});

export const withContentType = (
  expectedMediaType: string,
): Handler<RouteIntrinsics, Response | undefined> =>
  withHeaderFn("Content-Type", (actualMediaType) =>
    actualMediaType !== null &&
    caseInsensitiveCollator.compare(expectedMediaType, actualMediaType) === 0
      ? undefined
      : Response.json(
          {
            message: `invalid 'Content-Type', expected '${expectedMediaType}', got '${actualMediaType}'`,
          },
          { status: 415 },
        ),
  );
