import { runHealthChecks } from "./lib/checks";

export const runtime = "nodejs";

export async function GET() {
  const result = await runHealthChecks();

  return Response.json(result, {
    status: result.ok ? 200 : 503,
  });
}
