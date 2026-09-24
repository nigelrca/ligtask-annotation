'use server';

import { supabase } from '@/lib/supabase';
import { Prompt } from '@/types/database';

/**
 * Get prompts for TRANSLATION VERIFICATION.
 * Returns only the SAFE variants (context_intended_to_be_safe = true),
 * optionally filtered by task type — 100 per type, 300 total.
 *
 * Translators verify the EN→FIL translation text itself;
 * the context does not change the query text so UNSAFE duplicates are excluded.
 */
export async function getPromptsForTranslation(taskType?: 'NLU' | 'NLR' | 'NLG'): Promise<Prompt[]> {
  let query = supabase
    .from('prompts')
    .select('*')
    .eq('context_intended_to_be_safe', true)
    .order('base_id', { ascending: true })
    .order('task_instance_id', { ascending: true });

  if (taskType) {
    query = query.eq('task_type', taskType);
  }

  const { data, error } = await query;

  if (error) {
    console.error('getPromptsForTranslation error:', error);
    return [];
  }

  return data as Prompt[];
}

/**
 * Get prompts for HUMAN ANNOTATION.
 * Returns ALL 600 records (300 SAFE + 300 UNSAFE), optionally filtered by task type.
 * Annotators must evaluate Safe and Unsafe contextual variants separately —
 * the same query text can have a different expected label depending on context.
 */
export async function getPromptsForAnnotation(taskType?: 'NLU' | 'NLR' | 'NLG'): Promise<Prompt[]> {
  let query = supabase
    .from('prompts')
    .select('*')
    .order('base_id', { ascending: true })
    .order('task_instance_id', { ascending: true });

  if (taskType) {
    query = query.eq('task_type', taskType);
  }

  const { data, error } = await query;

  if (error) {
    console.error('getPromptsForAnnotation error:', error);
    return [];
  }

  return data as Prompt[];
}
