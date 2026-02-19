import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/**
 * Health-check endpoint that keeps the Supabase free-tier database
 * from auto-pausing by making a lightweight query every few days.
 * Also useful for uptime monitoring.
 */
export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { count, error } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  return NextResponse.json({
    status: error ? "error" : "ok",
    profiles: count,
    timestamp: new Date().toISOString(),
  });
}
