// Child profiles: the link between a parent who pays and the kid who uses
// StudyAce. Server-only. Table child_profiles (migrations 2026-10-24, -26).

import { getSupabase } from "./supabase";

export type GradeCheckSummary = {
  subject: string;
  subjectLabel: string;
  curriculumId: string;
  pct: number;
  bandId: string;
  bandLabel: string;
  targetBandId: string;
  targetLabel: string;
  /** The three things costing the most marks, worst first. */
  costing: { topic: string; lost: number; why: string }[];
  tomorrow: { title: string; detail: string };
  completedAt: string;
};

export type ChildProfile = {
  id: string;
  parent_user_id: string;
  first_name: string;
  kid_user_id: string | null;
  invite_version: number;
  invite_sent_at: string | null;
  invite_opened_at: string | null;
  curriculum_id: string | null;
  year_level: number | null;
  subjects: string[] | null;
  check_subject: string | null;
  target_band: string | null;
  grade_check_completed_at: string | null;
  grade_check: GradeCheckSummary | null;
  remind_at: string | null;
  timezone: string | null;
  is_test: boolean;
  created_at: string;
  // Write-mostly columns, not in the default select:
  invite_channel?: string | null;
  reminded_at?: string | null;
  grade_check_generated?: number;
};

const COLUMNS =
  "id, parent_user_id, first_name, kid_user_id, invite_version, invite_sent_at, invite_opened_at, curriculum_id, year_level, subjects, check_subject, target_band, grade_check_completed_at, grade_check, remind_at, timezone, is_test, created_at";

export async function childForParent(parentUserId: string, childId: string): Promise<ChildProfile | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.from("child_profiles").select(COLUMNS).eq("id", childId).eq("parent_user_id", parentUserId).maybeSingle();
  return (data as ChildProfile | null) ?? null;
}

export async function childrenForParent(parentUserId: string): Promise<ChildProfile[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data } = await supabase.from("child_profiles").select(COLUMNS).eq("parent_user_id", parentUserId).order("created_at", { ascending: true });
  return (data as ChildProfile[] | null) ?? [];
}

export async function childById(childId: string): Promise<ChildProfile | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.from("child_profiles").select(COLUMNS).eq("id", childId).maybeSingle();
  return (data as ChildProfile | null) ?? null;
}

/** The child profile a signed-in kid belongs to, if any. */
export async function childForKid(kidUserId: string): Promise<ChildProfile | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.from("child_profiles").select(COLUMNS).eq("kid_user_id", kidUserId).maybeSingle();
  return (data as ChildProfile | null) ?? null;
}

export async function updateChild(childId: string, patch: Partial<Omit<ChildProfile, "id" | "parent_user_id">>): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  const { error } = await supabase.from("child_profiles").update(patch).eq("id", childId);
  if (error) console.error("updateChild failed:", error);
  return !error;
}
