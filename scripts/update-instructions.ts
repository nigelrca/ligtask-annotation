/**
 * update-instructions.ts
 *
 * One-time script to update existing prompts with instruction field
 *
 * Usage:
 *   npx ts-node scripts/update-instructions.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const ENGLISH_PATH = './scripts/LIGTask_TFG_flat_dataset.json';

interface DatasetRecord {
  task_instance_id: string;
  instruction?: string;
}

async function updateInstructions() {
  const englishPath = path.resolve(__dirname, '..', ENGLISH_PATH);
  const englishData = JSON.parse(fs.readFileSync(englishPath, 'utf-8')) as DatasetRecord[];

  console.log(`📂  Loaded ${englishData.length} records from dataset`);

  let updated = 0;
  let failed = 0;

  for (const record of englishData) {
    if (!record.instruction) continue;

    const { error } = await supabase
      .from('prompts')
      .update({ instruction: record.instruction })
      .eq('task_instance_id', record.task_instance_id);

    if (error) {
      console.error(`❌  Failed to update ${record.task_instance_id}:`, error.message);
      failed++;
    } else {
      updated++;
      if (updated % 50 === 0) {
        console.log(`  ✓  ${updated} records updated...`);
      }
    }
  }

  console.log(`\n✅  Update complete! ${updated} records updated, ${failed} failed.`);
}

updateInstructions().catch((err) => {
  console.error('❌  Unexpected error:', err);
  process.exit(1);
});
