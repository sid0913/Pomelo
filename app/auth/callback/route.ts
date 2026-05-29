import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "";
  const topic = searchParams.get("topic") ?? "";

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("Auth callback error:", error);
    return NextResponse.redirect(`${origin}/?error=auth_failed`);
  }

  if (next) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  const redirectUrl = topic
    ? `${origin}/courses/new?topic=${encodeURIComponent(topic)}`
    : `${origin}/courses`;

  return NextResponse.redirect(redirectUrl);
}
