import { NextResponse } from "next/server";

export function errorResponse(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Something went wrong";

  const status =
    message === "UNAUTHORIZED"
      ? 401
      : message === "FORBIDDEN"
        ? 403
        : 400;

  return NextResponse.json(
    { ok: false, error: message },
    { status }
  );
}

export function ok(data: unknown, status = 200) {
  return NextResponse.json(
    { ok: true, ...(data as object) },
    { status }
  );
}
