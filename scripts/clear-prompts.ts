/**
 * clear-prompts.ts
 *
 * Deletes ALL prompts (and their linked evaluations) from the database.
 * Run this when you're ready to replace the 5 dummy prompts with the real dataset.
 *
 * Usage:
 *   npx ts-node scripts/clear-prompts.ts
 */

import * as path from 'path';
import * as dotenv from 'dotenv';
import * as readline from 'readline';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌  Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

async function clearPrompts() {
  const { count } = await supabase
    .from('prompts')
    .select('*', { count: 'exact', head: true });

  console.log(`⚠️   This will permanently delete ${count} prompts and all linked evaluations.`);

  const ok = await confirm('Are you sure? (y/N) ');
  if (!ok) {
    console.log('Aborted.');
    process.exit(0);
  }

  // Evaluations reference prompts via FK with ON DELETE CASCADE,
  // so deleting prompts also removes their evaluations automatically.
  const { error } = await supabase
    .from('prompts')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all rows

  if (error) {
    console.error('❌  Failed to clear prompts:', error.message);
    process.exit(1);
  }

  console.log('✅  All prompts and linked evaluations deleted.');
}

clearPrompts().catch((err) => {
  console.error('❌  Unexpected error:', err);
  process.exit(1);
});
