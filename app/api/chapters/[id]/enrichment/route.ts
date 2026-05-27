import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { generateSources, type UserProfile } from "@/lib/claude";
import { searchYouTube } from "@/lib/youtube";
import { searchImage } from "@/lib/images";
import { parseCards, type Card, type UnresolvedCard } from "@/lib/cards";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id: chapterId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const serviceClient = createServiceClient();

  const { data: chapter } = await serviceClient
    .from("chapters")
    .select("id, enriched, cards, sources, courses!inner(user_id)")
    .eq("id", chapterId)
    .single();

  if (!chapter) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const courseData = chapter.courses;
  const course = Array.isArray(courseData) ? courseData[0] : courseData;
  if ((course as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    ready: chapter.enriched,
    cards: chapter.cards ?? null,
    sources: chapter.sources ?? [],
  });
}

async function resolveCards(unresolved: UnresolvedCard[]): Promise<Card[]> {
  return Promise.all(
    unresolved.map(async (card): Promise<Card> => {
      if (card.type === "text") return card;
      if (card.type === "callout") return card;

      if (card.type === "video") {
        const results = await searchYouTube(card.query, 1);
        return { ...card, video: results[0] ?? null };
      }

      // image — tiered: Wikimedia → Unsplash
      const imageUrl = await searchImage(card.query);
      return { ...card, imageUrl };
    })
  );
}

export async function POST(_req: NextRequest, { params }: Params) {
  const { id: chapterId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const serviceClient = createServiceClient();

  const { data: chapter } = await serviceClient
    .from("chapters")
    .select("id, title, content, enriched, cards, sources, courses!inner(user_id, topic, user_profile)")
    .eq("id", chapterId)
    .single();

  if (!chapter) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const courseData = chapter.courses;
  const course = (Array.isArray(courseData) ? courseData[0] : courseData) as {
    user_id: string;
    topic: string;
    user_profile: UserProfile;
  };

  if (course.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Already enriched — return existing data
  if (chapter.enriched) {
    return NextResponse.json({
      ready: true,
      cards: chapter.cards ?? null,
      sources: chapter.sources ?? [],
    });
  }

  // Atomic claim: only enrich if still not enriched
  const { data: claimed } = await serviceClient
    .from("chapters")
    .update({ enriched: true })
    .eq("id", chapterId)
    .eq("enriched", false)
    .select("id")
    .single();

  if (!claimed) {
    // Another request beat us — poll current state (cards may not be written yet)
    const { data: current } = await serviceClient
      .from("chapters")
      .select("cards, sources")
      .eq("id", chapterId)
      .single();

    return NextResponse.json({
      ready: current?.cards != null,
      cards: current?.cards ?? null,
      sources: current?.sources ?? [],
    });
  }

  // Parse markers from content and resolve media + sources concurrently.
  // On any failure, reset enriched=false so the chapter can be re-enriched.
  try {
    const unresolved = parseCards(chapter.content ?? "");
    const [cards, sources] = await Promise.all([
      resolveCards(unresolved),
      generateSources(chapter.title, course.topic, course.user_profile),
    ]);

    await serviceClient
      .from("chapters")
      .update({ cards, sources })
      .eq("id", chapterId);

    return NextResponse.json({ ready: true, cards, sources });
  } catch (err) {
    await serviceClient
      .from("chapters")
      .update({ enriched: false })
      .eq("id", chapterId);
    console.error("Enrichment failed, reset enriched flag:", err);
    return NextResponse.json({ ready: false, cards: null, sources: [] });
  }
}
