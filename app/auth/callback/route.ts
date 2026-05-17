import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const code = searchParams.get("code");
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

  const redirectUrl = topic
    ? `${origin}/courses/new?topic=${encodeURIComponent(topic)}`
    : `${origin}/courses/new`;

  return NextResponse.redirect(redirectUrl);
}
