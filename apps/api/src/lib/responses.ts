import type { Context } from "hono";

export const errorResponse = (
  _c: Context,
  status: number,
  message: string,
  details: { issues?: unknown } = {}
) =>
  Response.json(
    {
      error: message,
      ...details,
    },
    { status }
  );

export const badGateway = (c: Context, message: string) =>
  errorResponse(c, 502, message);
export const badRequest = (c: Context, message: string) =>
  errorResponse(c, 400, message);
export const internalServerError = (c: Context) =>
  errorResponse(c, 500, "Internal Server Error");
export const notFound = (c: Context) => errorResponse(c, 404, "Not Found");
export const noContent = () => new Response(null, { status: 204 });
export const unauthorized = (c: Context, message: string) =>
  errorResponse(c, 401, message);
export const validationError = (c: Context, message: string, issues: unknown) =>
  errorResponse(c, 400, message, { issues });
