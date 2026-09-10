/**
 * import-prompts.ts
 *
 * Reads your dataset JSON file and imports prompts into Supabase.
 *
 * Usage:
 *   npx ts-node scripts/import-prompts.ts
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DATASET FIELD MAP  ← update this section when preprocessing is finalized
 * ─────────────────────────────────────────────────────────────────────────────
 */

const FIELD_MAP = {
  // The field in your JSON that contains the unique ID (e.g. "CB_001")
  base_id: 'base_id',

  // The field for the English prompt
  english_text: 'query',

  // ⚠️  PLACEHOLDER — update once your colleagues finalize the field name
  filipino_text: 'filipino_query',

  // ⚠️  PLACEHOLDER — update once task_type field name is confirmed
  task_type: 'task_type',

  // The safety/harm category label
  category: 'category',

  // Whether the context was intended to make this prompt safe
  context_intended_to_be_safe: 'context_intended_to_be_safe',

  // The nested context object (sender, recipient, transmission_principle)
  context: 'context',
};

// Path to your dataset file relative to the project root
const DATASET_PATH = './dataset.json';

// How many rows to insert per Supabase batch (keep under 500)
const BATCH_SIZE = 50;

// ─────────────────────────────────────────────────────────────────────────────

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌  Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ─────────────────────────────────────────────────────────────────────────────

interface DatasetRow {
  [key: string]: unknown;
}

function mapRow(raw: DatasetRow) {
  const filipinoText = raw[FIELD_MAP.filipino_text];
  const taskType = raw[FIELD_MAP.task_type];

  // Warn on missing placeholder fields so you know what still needs updating
  if (!filipinoText) {
    console.warn(`  ⚠️  Missing field "${FIELD_MAP.filipino_text}" on ${raw[FIELD_MAP.base_id]} — storing empty string`);
  }
  if (!taskType) {
    console.warn(`  ⚠️  Missing field "${FIELD_MAP.task_type}" on ${raw[FIELD_MAP.base_id]} — defaulting to "NLU"`);
  }

  return {
    base_id:                    raw[FIELD_MAP.base_id]                    as string,
    english_text:               raw[FIELD_MAP.english_text]               as string,
    filipino_text:              (filipinoText as string)                  ?? '',
    task_type:                  (taskType as 'NLU' | 'NLR' | 'NLG')      ?? 'NLU',
    category:                   raw[FIELD_MAP.category]                   as string,
    context_intended_to_be_safe:raw[FIELD_MAP.context_intended_to_be_safe] as boolean,
    context:                    raw[FIELD_MAP.context]                    as object,
  };
}

async function importPrompts() {
  // 1. Read dataset file
  const datasetPath = path.resolve(__dirname, '..', DATASET_PATH);
  if (!fs.existsSync(datasetPath)) {
    console.error(`❌  Dataset file not found at: ${datasetPath}`);
    console.error('    Place your dataset JSON file at the project root as "dataset.json"');
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(datasetPath, 'utf-8')) as DatasetRow[];
  console.log(`📂  Loaded ${raw.length} rows from ${DATASET_PATH}`);

  // 2. Fetch existing base_ids so we can skip duplicates
  const { data: existing } = await supabase
    .from('prompts')
    .select('base_id');

  const existingIds = new Set((existing ?? []).map((r: { base_id: string }) => r.base_id));
  console.log(`📊  ${existingIds.size} prompts already in database — skipping duplicates`);

  // 3. Filter and map
  const toInsert = raw
    .filter((row) => {
      const id = row[FIELD_MAP.base_id] as string;
      if (existingIds.has(id)) {
        console.log(`  ⏭️  Skipping duplicate: ${id}`);
        return false;
      }
      return true;
    })
    .map(mapRow);

  if (toInsert.length === 0) {
    console.log('✅  Nothing new to import.');
    return;
  }

  console.log(`⬆️   Importing ${toInsert.length} new prompts in batches of ${BATCH_SIZE}...`);

  // 4. Insert in batches
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('prompts').insert(batch);

    if (error) {
      console.error(`❌  Batch ${i / BATCH_SIZE + 1} failed:`, error.message);
      process.exit(1);
    }

    inserted += batch.length;
    console.log(`  ✓  ${inserted}/${toInsert.length} inserted`);
  }

  console.log(`\n✅  Import complete. ${inserted} prompts added.`);
}

importPrompts().catch((err) => {
  console.error('❌  Unexpected error:', err);
  process.exit(1);
});
