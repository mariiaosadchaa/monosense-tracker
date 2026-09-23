import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Вхідні запрошення для вже зареєстрованого користувача (за його email або username)
async function findInvites(userId: string, email: string) {
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("username").eq("id", userId).maybeSingle();
  const username = profile?.username?.toLowerCase() || null;
  const filters = [`email.eq.${email}`];
  if (username) filters.push(`username.eq.${username}`);
  const { data } = await admin
    .from("household_invitations")
    .select("id,household_id,role,invited_by,expires_at,households(name)")
    .or(filters.join(","))
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString());
  const { data: memberships } = await admin.from("household_members").select("household_id").eq("user_id", userId);
  const mine = new Set((memberships || []).map((m) => m.household_id));
  const invites = (data || []).filter((i) => !mine.has(i.household_id));
  const inviterIds = [...new Set(invites.map((i) => i.invited_by).filter(Boolean))];
  const { data: inviters } = inviterIds.length
    ? await admin.from("profiles").select("id,display_name").in("id", inviterIds)
    : { data: [] as { id: string; display_name: string }[] };
  const names = new Map((inviters || []).map((p) => [p.id, p.display_name]));
  return invites.map((i) => ({
    id: i.id as string,
    householdId: i.household_id as string,
    role: i.role as string,
    household: (i.households as { name?: string } | null)?.name || "Спільний бюджет",
    from: (i.invited_by && names.get(i.invited_by)) || "",
  }));
}

export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user?.email) return NextResponse.json({ invites: [] });
  return NextResponse.json({ invites: await findInvites(auth.user.id, auth.user.email.toLowerCase()) });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, action } = await request.json();
  const invite = (await findInvites(auth.user.id, auth.user.email.toLowerCase())).find((i) => i.id === id);
  if (!invite) return NextResponse.json({ error: "Запрошення не знайдено або вже неактуальне" }, { status: 404 });
  const admin = createAdminClient();
  if (action === "decline") {
    await admin.from("household_invitations").update({ expires_at: new Date().toISOString() }).eq("id", id);
    return NextResponse.json({ ok: true });
  }
  const { error } = await admin
    .from("household_members")
    .upsert({ household_id: invite.householdId, user_id: auth.user.id, role: invite.role }, { onConflict: "household_id,user_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await admin
    .from("profiles")
    .update({ active_household_id: invite.householdId, onboarding_completed: true, updated_at: new Date().toISOString() })
    .eq("id", auth.user.id);
  await admin.from("household_invitations").update({ accepted_at: new Date().toISOString() }).eq("id", id);
  return NextResponse.json({ ok: true });
}
