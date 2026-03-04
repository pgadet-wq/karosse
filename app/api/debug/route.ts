import { NextResponse } from "next/server";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  return NextResponse.json({
    supabaseUrl: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : "NOT SET",
    anonKeyLength: anonKey.length,
    anonKeyStart: anonKey ? anonKey.substring(0, 20) : "NOT SET",
    anonKeyEnd: anonKey ? anonKey.substring(anonKey.length - 10) : "NOT SET",
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "NOT SET",
  });
}
