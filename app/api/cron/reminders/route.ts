import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createServiceClient } from "@/lib/supabase/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  // Verify Vercel Cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = createServiceClient();
  const currentUtcHour = new Date().getUTCHours();
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // Find users whose 8pm local time corresponds to the current UTC hour
  // (utc_offset_hours + 20) % 24 === current_utc_hour
  // Equivalently: utc_offset_hours = (current_utc_hour - 20 + 24) % 24 — but we store signed offsets
  // Filter: (reminder_hour - utc_offset_hours + 24) % 24 === current_utc_hour
  // Since reminder_hour=20 always: (20 + utc_offset_hours + 24) % 24 === current_utc_hour
  const { data: reminders } = await serviceClient
    .from("habit_reminders")
    .select(`
      id,
      user_id,
      course_id,
      reminder_hour,
      utc_offset_hours,
      last_sent_date,
      courses!inner(topic, daily_goal),
      auth_users:user_id(email)
    `)
    .eq("is_active", true)
    .neq("last_sent_date", today);

  if (!reminders || reminders.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  // Filter for users whose local 8pm = current UTC hour
  const dueReminders = reminders.filter((r) => {
    const localHour =
      (r.reminder_hour + (r.utc_offset_hours ?? 0) + 24) % 24;
    return localHour === currentUtcHour;
  });

  let sent = 0;
  let skipped = 0;

  for (const reminder of dueReminders) {
    try {
      // Check if daily goal is already met
      const startOfDay = new Date();
      startOfDay.setUTCHours(0, 0, 0, 0);

      const { count } = await serviceClient
        .from("chapter_progress")
        .select("id", { count: "exact", head: true })
        .eq("user_id", reminder.user_id)
        .gte("completed_at", startOfDay.toISOString());

      const completedToday = count ?? 0;
      const courseData = Array.isArray(reminder.courses) ? reminder.courses[0] : reminder.courses;
      const dailyGoal = (courseData as { topic: string; daily_goal: number }).daily_goal;

      // Update last_sent_date regardless (don't retry tomorrow if goal is met)
      await serviceClient
        .from("habit_reminders")
        .update({ last_sent_date: today })
        .eq("id", reminder.id);

      if (completedToday >= dailyGoal) {
        skipped++;
        continue;
      }

      const email = (reminder as { auth_users?: { email?: string } }).auth_users?.email;
      const topic = (courseData as { topic: string }).topic;

      if (!email) {
        console.error(`No email for user ${reminder.user_id}`);
        continue;
      }

      await resend.emails.send({
        from: "Pomelo <reminders@pomelo.app>",
        to: email,
        subject: `Your ${topic} course is waiting`,
        html: `<p>You haven't read your daily chapter yet. Your personalized <strong>${topic}</strong> course is waiting — it takes less than ${dailyGoal * 15} minutes.</p><p><a href="${process.env.NEXT_PUBLIC_SITE_URL}/courses/${reminder.course_id}">Continue learning →</a></p>`,
      });

      sent++;
    } catch (err) {
      console.error(`Reminder error for ${reminder.user_id}:`, err);
      // Log but don't block other reminders
    }
  }

  return NextResponse.json({ processed: dueReminders.length, sent, skipped });
}
