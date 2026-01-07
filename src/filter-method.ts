import { type Handler, NoMatch, type RouteIntrinsics } from "./router.ts";

// Standardized HTTP methods + string escape hatch
// See:
// - <https://www.rfc-editor.org/rfc/rfc9110.html#section-9>
// - <https://www.rfc-editor.org/rfc/rfc5789.html>
export type Method =
  | "GET"
  | "HEAD"
  | "POST"
  | "PUT"
  | "DELETE"
  | "CONNECT"
  | "OPTIONS"
  | "TRACE"
  | "PATCH"
  | (string & {});

export const filterMethod = <TCtxData extends RouteIntrinsics>(
  method: Method | Method[],
): Handler<TCtxData, typeof NoMatch | undefined> => {
  if (Array.isArray(method)) {
    return ({ request }) =>
      method.some((method) => method === request.method) ? undefined : NoMatch;
  }

  return ({ request }) => (request.method === method ? undefined : NoMatch);
};
