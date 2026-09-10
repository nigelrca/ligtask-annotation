'use server';

import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

// Use service role key to bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('user_id')?.value ?? null;
}

/**
 * Fetch the set of prompt base_ids already evaluated by the current user.
 * Returns a Set of base_ids (e.g. "CB_001") so pages can check completion quickly.
 */
export async function getCompletedPromptIds(): Promise<string[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  // Resolve internal UUID from user_id string
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (userError || !userData) return [];

  const { data, error } = await supabase
    .from('evaluations')
    .select('prompt_id')
    .eq('user_id', userData.id);

  if (error || !data) return [];

  return data.map((e: { prompt_id: string }) => e.prompt_id);
}

/**
 * Submit a translation evaluation.
 * Called from the translate page.
 */
export async function submitTranslationEvaluation(payload: {
  promptId: string;        // UUID from prompts table
  translationCorrect: boolean;
  revisedTranslation: string | null;
}) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (userError || !userData) return { success: false, error: 'User not found' };

  // Upsert so re-submitting overwrites rather than errors
  const { error } = await supabase
    .from('evaluations')
    .upsert(
      {
        user_id: userData.id,
        prompt_id: payload.promptId,
        translation_correct: payload.translationCorrect,
        revised_translation: payload.revisedTranslation ?? null,
        safety_label: null,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,prompt_id' }
    );

  if (error) {
    console.error('submitTranslationEvaluation error:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Submit an annotation (safety) evaluation.
 * Called from the annotate page.
 */
export async function submitAnnotationEvaluation(payload: {
  promptId: string;   // UUID from prompts table
  safetyLabel: string;
}) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (userError || !userData) return { success: false, error: 'User not found' };

  const { error } = await supabase
    .from('evaluations')
    .upsert(
      {
        user_id: userData.id,
        prompt_id: payload.promptId,
        safety_label: payload.safetyLabel,
        translation_correct: null,
        revised_translation: null,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,prompt_id' }
    );

  if (error) {
    console.error('submitAnnotationEvaluation error:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
