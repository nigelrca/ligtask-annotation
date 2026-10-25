/**
 * import-final-dataset.ts
 *
 * Reads LIGTask_TFG_dataset_en_fil_final.json — a single merged file containing
 * both English and Filipino records — and upserts all 600 rows into Supabase.
 *
 * Structure of the input file:
 *   400 top-level records (200 EN + 200 FIL)
 *   Each record has 3 task_derivatives: nlu, nlr, nlg
 *   EN and FIL records are paired by (base_id + context_intended_to_be_safe)
 *   Pairing produces 200 merged records × 3 tasks = 600 prompts rows
 *
 * Generated task_instance_id format: CB_001_SAFE_NLU (matches existing schema)
 *
 * Usage:
 *   npx ts-node --esm scripts/import-final-dataset.ts
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

// Path to the final merged dataset
const FINAL_DATASET_PATH = path.resolve(__dirname, 'LIGTask_TFG_dataset_en_fil_final.json');

// How many rows to upsert per Supabase batch (keep under 500)
const BATCH_SIZE = 50;

// ─────────────────────────────────────────────────────────────────────────────

type TaskKey = 'nlu' | 'nlr' | 'nlg';
type TaskCode = 'NLU' | 'NLR' | 'NLG';

interface TaskDerivative {
  task_code: TaskCode;
  task_name: string;
  capability: string;
  instruction: string;
  input: {
    base_id: string;
    query: string;
    category: string;
    context: object;
    language: string;
  };
  output_schema: object;
  gold: object;
}

interface FinalRecord {
  base_id: string;
  query: string;
  source_query_en: string;
  category: string;
  context_intended_to_be_safe: boolean;
  context: object;
  processing_stage: string;
  task_derivatives: {
    nlu: TaskDerivative;
    nlr: TaskDerivative;
    nlg: TaskDerivative;
  };
  language: 'en' | 'fil';
}

interface PromptRow {
  task_instance_id: string;
  base_id: string;
  english_text: string;
  filipino_text: string;
  task_type: TaskCode;
  category: string;
  instruction: string;
  context: object;
  context_intended_to_be_safe: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────

async function importFinalDataset() {
  // 1. Read the final dataset file
  if (!fs.existsSync(FINAL_DATASET_PATH)) {
    console.error(`❌  Dataset file not found at: ${FINAL_DATASET_PATH}`);
    process.exit(1);
  }

  const allRecords = JSON.parse(fs.readFileSync(FINAL_DATASET_PATH, 'utf-8')) as FinalRecord[];
  console.log(`📂  Loaded ${allRecords.length} total records from final dataset`);

  // 2. Split into English and Filipino records
  const enRecords = allRecords.filter((r) => r.language === 'en');
  const filRecords = allRecords.filter((r) => r.language === 'fil');

  console.log(`    ├─ EN records : ${enRecords.length}`);
  console.log(`    └─ FIL records: ${filRecords.length}`);

  if (enRecords.length !== filRecords.length) {
    console.warn(`⚠️  EN and FIL record counts differ! Unmatched records will be skipped.`);
  }

  // 3. Build a lookup map for FIL records by (base_id + context_intended_to_be_safe)
  //    Key: "CB_001_true" or "CB_001_false"
  const filMap = new Map<string, FinalRecord>();
  for (const rec of filRecords) {
    const key = `${rec.base_id}_${rec.context_intended_to_be_safe}`;
    filMap.set(key, rec);
  }

  // 4. Build the rows to upsert
  const TASK_KEYS: TaskKey[] = ['nlu', 'nlr', 'nlg'];
  const toUpsert: PromptRow[] = [];
  let skipped = 0;

  for (const enRec of enRecords) {
    const safeStr = enRec.context_intended_to_be_safe ? 'SAFE' : 'UNSAFE';
    const filKey = `${enRec.base_id}_${enRec.context_intended_to_be_safe}`;
    const filRec = filMap.get(filKey);

    if (!filRec) {
      console.warn(`  ⚠️  No FIL match for: ${enRec.base_id} (safe=${enRec.context_intended_to_be_safe}) — skipping all 3 tasks`);
      skipped += 3;
      continue;
    }

    for (const taskKey of TASK_KEYS) {
      const enTask = enRec.task_derivatives[taskKey];
      const filTask = filRec.task_derivatives[taskKey];

      const taskCode = taskKey.toUpperCase() as TaskCode;
      const taskInstanceId = `${enRec.base_id}_${safeStr}_${taskCode}`;

      toUpsert.push({
        task_instance_id: taskInstanceId,
        base_id: enRec.base_id,
        english_text: enTask.input.query,
        filipino_text: filTask.input.query,
        task_type: taskCode,
        category: enRec.category,
        instruction: enTask.instruction,
        context: enRec.context,
        context_intended_to_be_safe: enRec.context_intended_to_be_safe,
      });
    }
  }

  console.log(`\n✓  Built ${toUpsert.length} rows to upsert`);
  if (skipped > 0) {
    console.warn(`⏭️  Skipped ${skipped} rows due to missing FIL counterpart`);
  }

  if (toUpsert.length === 0) {
    console.log('✅  Nothing to upsert.');
    return;
  }

  // 5. Upsert in batches
  console.log(`\n⬆️   Upserting ${toUpsert.length} prompts in batches of ${BATCH_SIZE}...`);

  let upserted = 0;
  for (let i = 0; i < toUpsert.length; i += BATCH_SIZE) {
    const batch = toUpsert.slice(i, i + BATCH_SIZE);

    const { error } = await supabase
      .from('prompts')
      .upsert(batch, { onConflict: 'task_instance_id' });

    if (error) {
      console.error(`❌  Batch ${Math.ceil((i + 1) / BATCH_SIZE)} failed:`, error.message);
      process.exit(1);
    }

    upserted += batch.length;
    const pct = Math.round((upserted / toUpsert.length) * 100);
    console.log(`  ✓  ${upserted}/${toUpsert.length} upserted (${pct}%)`);
  }

  console.log(`\n✅  Import complete! ${upserted} prompts upserted to Supabase.`);
  console.log(`    The annotator view will now use the final EN+FIL translations.`);
}

importFinalDataset().catch((err) => {
  console.error('❌  Unexpected error:', err);
  process.exit(1);
});
