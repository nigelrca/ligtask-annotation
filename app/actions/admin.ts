'use server';

import { createClient } from '@supabase/supabase-js';
import { UserRole } from '@/types/database';

// Use service role key to bypass RLS for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('getUsers error:', error);
    return [];
  }
  return data;
}

export async function createUser(payload: {
  user_id: string;
  name: string;
  role: UserRole;
  password: string;
}) {
  // Check for duplicate user_id
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('user_id', payload.user_id)
    .single();

  if (existing) {
    return { success: false, error: `User ID "${payload.user_id}" is already taken` };
  }

  const { error } = await supabase.from('users').insert({
    user_id: payload.user_id,
    name: payload.name,
    role: payload.role,
    password: payload.password,
    active: true,
  });

  if (error) {
    console.error('createUser error:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function deleteUser(id: string) {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('deleteUser error:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function setUserActive(id: string, active: boolean) {
  const { error } = await supabase
    .from('users')
    .update({ active })
    .eq('id', id);

  if (error) {
    console.error('setUserActive error:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function getUserProgress() {
  // Get all users
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, user_id, name, role, active')
    .order('role', { ascending: true });

  if (usersError || !users) return [];

  // Get total prompt counts per task type
  const { data: promptCounts } = await supabase
    .from('prompts')
    .select('task_type');

  const totalNLU = (promptCounts ?? []).filter(p => p.task_type === 'NLU').length;
  const totalNLR = (promptCounts ?? []).filter(p => p.task_type === 'NLR').length;
  const totalNLG = (promptCounts ?? []).filter(p => p.task_type === 'NLG').length;
  const totalAnnotations = totalNLU + totalNLR + totalNLG;
  const totalTranslations = (promptCounts ?? []).length;

  // Get evaluation counts per user
  const { data: evaluations } = await supabase
    .from('evaluations')
    .select('user_id, safety_label, translation_correct');

  return users.map(user => {
    const userEvals = (evaluations ?? []).filter(e => e.user_id === user.id);
    const annotated = userEvals.filter(e => e.safety_label !== null).length;
    const translated = userEvals.filter(e => e.translation_correct !== null).length;

    return {
      ...user,
      annotated,
      translated,
      totalAnnotations,
      totalTranslations,
    };
  });
}

export async function getAdminPrompts() {
  const { data, error } = await supabase
    .from('prompts')
    .select('id, base_id, task_instance_id, english_text, task_type, category, created_at')
    .order('base_id', { ascending: true });

  if (error) {
    console.error('getAdminPrompts error:', error);
    return [];
  }
  return data;
}

// ─── Evaluations / Results ────────────────────────────────────────────────────

export async function getEvaluationStats() {
  const { count: total } = await supabase
    .from('evaluations')
    .select('*', { count: 'exact', head: true });

  const { count: translations } = await supabase
    .from('evaluations')
    .select('*', { count: 'exact', head: true })
    .not('translation_correct', 'is', null);

  const { count: annotations } = await supabase
    .from('evaluations')
    .select('*', { count: 'exact', head: true })
    .not('safety_label', 'is', null);

  return {
    total: total ?? 0,
    translations: translations ?? 0,
    annotations: annotations ?? 0,
  };
}

export async function getRecentEvaluations() {
  const { data, error } = await supabase
    .from('evaluations')
    .select(`
      id,
      submitted_at,
      translation_correct,
      revised_translation,
      safety_label,
      users ( user_id, name, role ),
      prompts ( base_id, task_instance_id, task_type, category )
    `)
    .order('submitted_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('getRecentEvaluations error:', error);
    return [];
  }
  return data;
}

export async function getPromptCompletionStats() {
  // Returns each prompt with how many evaluations it has received
  const { data, error } = await supabase
    .from('prompts')
    .select(`
      base_id,
      task_type,
      category,
      evaluations ( id )
    `)
    .order('base_id', { ascending: true });

  if (error) {
    console.error('getPromptCompletionStats error:', error);
    return [];
  }
  return data;
}

export async function deleteEvaluation(id: string) {
  const { error } = await supabase
    .from('evaluations')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('deleteEvaluation error:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function deleteAllEvaluations() {
  // Delete all rows — use neq on a non-null column as a wildcard
  const { error } = await supabase
    .from('evaluations')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (error) {
    console.error('deleteAllEvaluations error:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}
