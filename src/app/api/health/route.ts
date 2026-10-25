import { NextResponse } from "next/server";
import { env } from "@/lib/env";

/* Route handlers are dynamic under cacheComponents; no segment config needed. */
export function GET(): NextResponse {
  return NextResponse.json(
    {
      status: "ok",
      version: env.GIT_SHA ?? "dev",
      time: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
