import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(
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

  // Verify ownership
  const { data: chapter } = await serviceClient
    .from("chapters")
    .select("id, status, courses!inner(user_id)")
    .eq("id", id)
    .eq("courses.user_id", user.id)
    .single();

  if (!chapter) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (chapter.status !== "failed") {
    return NextResponse.json(
      { error: "Chapter is not in failed state" },
      { status: 409 }
    );
  }

  // Reset to pending so the next GET will trigger generation
  const { error } = await serviceClient
    .from("chapters")
    .update({ status: "pending", error: null, generation_started_at: null, enriched: false, cards: null })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Failed to reset chapter" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
