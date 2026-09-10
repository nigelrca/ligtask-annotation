/**
 * import-dataset.ts
 *
 * Reads both English and Filipino dataset files and imports them into Supabase.
 * Matches records by base_id and merges them into the prompts table.
 *
 * Usage:
 *   npx ts-node scripts/import-dataset.ts
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌  Missing Supabase credentials in .env.local');
  console.error('    Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Paths to dataset files
const ENGLISH_PATH = './scripts/LIGTask_TFG_flat_dataset.json';
const FILIPINO_PATH = './scripts/LIGTask_TFG_flat_dataset_fil.json';

// How many rows to insert per Supabase batch (keep under 500)
const BATCH_SIZE = 50;

// ─────────────────────────────────────────────────────────────────────────────

interface DatasetRecord {
  task_instance_id: string;
  base_id: string;
  task_code: 'NLU' | 'NLR' | 'NLG';
  category: string;
  instruction?: string;
  context_intended_to_be_safe: boolean;
  input: {
    query: string;
    context: object;
  };
}

interface PromptRow {
  task_instance_id: string;
  base_id: string;
  english_text: string;
  filipino_text: string;
  task_type: 'NLU' | 'NLR' | 'NLG';
  category: string;
  instruction?: string;
  context_intended_to_be_safe: boolean;
  context: object;
}

async function importDataset() {
  // 1. Read both dataset files
  const englishPath = path.resolve(__dirname, '..', ENGLISH_PATH);
  const filipinoPath = path.resolve(__dirname, '..', FILIPINO_PATH);

  if (!fs.existsSync(englishPath)) {
    console.error(`❌  English dataset not found at: ${englishPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(filipinoPath)) {
    console.error(`❌  Filipino dataset not found at: ${filipinoPath}`);
    process.exit(1);
  }

  const englishData = JSON.parse(fs.readFileSync(englishPath, 'utf-8')) as DatasetRecord[];
  const filipinoData = JSON.parse(fs.readFileSync(filipinoPath, 'utf-8')) as DatasetRecord[];

  console.log(`📂  Loaded ${englishData.length} English records`);
  console.log(`📂  Loaded ${filipinoData.length} Filipino records`);

  if (englishData.length !== filipinoData.length) {
    console.warn(`⚠️  Dataset sizes differ! English: ${englishData.length}, Filipino: ${filipinoData.length}`);
  }

  // 2. Create map for quick lookup by task_instance_id
  const filipinoMap = new Map(filipinoData.map((rec) => [rec.task_instance_id, rec]));

  // 3. Fetch existing task_instance_ids so we can skip duplicates
  const { data: existing, error: fetchError } = await supabase
    .from('prompts')
    .select('task_instance_id');

  if (fetchError) {
    console.error(`❌  Failed to fetch existing prompts:`, fetchError.message);
    process.exit(1);
  }

  const existingIds = new Set((existing ?? []).map((r: { task_instance_id: string }) => r.task_instance_id));
  console.log(`📊  ${existingIds.size} prompts already in database — skipping duplicates\n`);

  // 4. Merge English and Filipino records
  const toInsert: PromptRow[] = [];
  let skipped = 0;
  let merged = 0;

  for (const enRec of englishData) {
    // Skip if already exists
    if (existingIds.has(enRec.task_instance_id)) {
      skipped++;
      continue;
    }

    // Find matching Filipino record by task_instance_id
    // Remove '_FIL' suffix if present, then add it to look for the Filipino version
    let fiInstanceId = enRec.task_instance_id;
    if (!fiInstanceId.endsWith('_FIL')) {
      fiInstanceId = enRec.task_instance_id + '_FIL';
    }

    const fiRec = filipinoMap.get(fiInstanceId);
    if (!fiRec) {
      console.warn(`  ⚠️  No Filipino match for: ${enRec.task_instance_id} — skipping`);
      skipped++;
      continue;
    }

    toInsert.push({
      task_instance_id: enRec.task_instance_id,
      base_id: enRec.base_id,
      english_text: enRec.input.query,
      filipino_text: fiRec.input.query,
      task_type: enRec.task_code,
      category: enRec.category,
      instruction: enRec.instruction,
      context_intended_to_be_safe: enRec.context_intended_to_be_safe,
      context: enRec.input.context,
    });

    merged++;
  }

  console.log(`✓  Merged ${merged} records`);
  console.log(`⏭️  Skipped ${skipped} records (duplicates or unmatched)\n`);

  if (toInsert.length === 0) {
    console.log('✅  Nothing new to import.');
    return;
  }

  // 5. Insert in batches
  console.log(`⬆️   Importing ${toInsert.length} prompts in batches of ${BATCH_SIZE}...`);

  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('prompts').insert(batch);

    if (error) {
      console.error(`❌  Batch ${Math.ceil((i + 1) / BATCH_SIZE)} failed:`, error.message);
      process.exit(1);
    }

    inserted += batch.length;
    const percentage = Math.round((inserted / toInsert.length) * 100);
    console.log(`  ✓  ${inserted}/${toInsert.length} inserted (${percentage}%)`);
  }

  console.log(`\n✅  Import complete! ${inserted} prompts added to database.`);
}

importDataset().catch((err) => {
  console.error('❌  Unexpected error:', err);
  process.exit(1);
});
