import { readTop5 } from "@/lib/ranking/store";

export async function GET() {
  const entries = await readTop5();
  return Response.json(entries);
}
