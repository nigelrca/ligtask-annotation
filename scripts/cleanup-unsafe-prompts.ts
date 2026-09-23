/**
 * cleanup-unsafe-prompts.ts
 *
 * Removes all UNSAFE variant rows from the prompts table.
 * These are rows whose task_instance_id contains "_UNSAFE_" — they are
 * duplicates of the SAFE variants and are not needed for the translation task.
 *
 * Usage:
 *   npx ts-node scripts/cleanup-unsafe-prompts.ts
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as path from 'path';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌  Missing Supabase credentials in .env.local');
  console.error('    Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanupUnsafePrompts() {
  // 1. Dry-run: find all UNSAFE rows first
  console.log('🔍  Scanning for UNSAFE variant rows...\n');

  const { data: unsafeRows, error: fetchError } = await supabase
    .from('prompts')
    .select('task_instance_id, base_id, task_type')
    .like('task_instance_id', '%_UNSAFE_%');

  if (fetchError) {
    console.error('❌  Failed to fetch UNSAFE rows:', fetchError.message);
    process.exit(1);
  }

  if (!unsafeRows || unsafeRows.length === 0) {
    console.log('✅  No UNSAFE rows found in the database — nothing to clean up.');
    return;
  }

  // 2. Preview what will be deleted
  console.log(`⚠️   Found ${unsafeRows.length} UNSAFE rows to delete:`);
  const byTask = unsafeRows.reduce(
    (acc: Record<string, number>, r: { task_type: string }) => {
      acc[r.task_type] = (acc[r.task_type] || 0) + 1;
      return acc;
    },
    {}
  );
  console.log('   Breakdown by task type:', byTask);
  console.log(
    '   Sample IDs:',
    unsafeRows
      .slice(0, 5)
      .map((r: { task_instance_id: string }) => r.task_instance_id)
      .join(', '),
    '...\n'
  );

  // 3. Delete them
  console.log('🗑️   Deleting UNSAFE rows...');

  const { error: deleteError, count } = await supabase
    .from('prompts')
    .delete({ count: 'exact' })
    .like('task_instance_id', '%_UNSAFE_%');

  if (deleteError) {
    console.error('❌  Delete failed:', deleteError.message);
    process.exit(1);
  }

  console.log(`✅  Cleanup complete. ${count ?? unsafeRows.length} UNSAFE rows removed.`);

  // 4. Verify remaining count
  const { count: remaining, error: countError } = await supabase
    .from('prompts')
    .select('*', { count: 'exact', head: true });

  if (!countError) {
    console.log(`📊  Remaining rows in prompts table: ${remaining}`);
  }
}

cleanupUnsafePrompts().catch((err) => {
  console.error('❌  Unexpected error:', err);
  process.exit(1);
});
