'use server';

import { supabase } from '@/lib/supabase';
import { Prompt } from '@/types/database';

/**
 * Get all prompts for translation - returns one prompt per base_id
 * (since translators verify base queries, not task variants)
 */
export async function getPrompts(): Promise<Prompt[]> {
  // Fetch all prompts grouped by base_id, take the first one per group
  const { data, error } = await supabase
    .from('prompts')
    .select('*')
    .order('base_id', { ascending: true })
    .order('task_instance_id', { ascending: true });

  if (error) {
    console.error('getPrompts error:', error);
    return [];
  }

  // Filter to keep only one prompt per base_id
  const uniqueByBaseId = new Map<string, Prompt>();
  (data as Prompt[]).forEach((prompt) => {
    if (!uniqueByBaseId.has(prompt.base_id)) {
      uniqueByBaseId.set(prompt.base_id, prompt);
    }
  });

  return Array.from(uniqueByBaseId.values());
}

/**
 * Get all prompts for annotation - returns all 600 records
 * (annotators evaluate each task variant separately)
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
