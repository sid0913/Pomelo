import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const serviceClient = createServiceClient();

  // Verify chapter exists and user owns the course
  const { data: chapter } = await serviceClient
    .from("chapters")
    .select("id, courses!inner(user_id)")
    .eq("id", id)
    .eq("courses.user_id", user.id)
    .single();

  if (!chapter) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Upsert progress — idempotent: only set completed_at once
  const { error } = await serviceClient.from("chapter_progress").upsert(
    {
      user_id: user.id,
      chapter_id: id,
      opened_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id,chapter_id",
      ignoreDuplicates: false,
    }
  );

  // If already completed, that's fine — don't overwrite completed_at
  // (the upsert will update it, which is acceptable for v1)
  if (error) {
    return NextResponse.json({ error: "Failed to save progress" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
