/**
 * import-translations.ts
 *
 * Reads the translation JSON file (English → Filipino pairs) and imports them
 * into the prompts table for the translation task.
 *
 * Usage:
 *   npx ts-node scripts/import-translations.ts
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

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

// Path to your translation dataset file
const TRANSLATIONS_PATH = './scripts/prompt_translations_fil.json';

// How many rows to insert per Supabase batch (keep under 500)
const BATCH_SIZE = 50;

// ─────────────────────────────────────────────────────────────────────────────

interface TranslationPair {
  english: string;
  filipino: string;
}

async function importTranslations() {
  // 1. Read translations file
  const translationsPath = path.resolve(__dirname, '..', TRANSLATIONS_PATH);
  if (!fs.existsSync(translationsPath)) {
    console.error(`❌  Translations file not found at: ${translationsPath}`);
    process.exit(1);
  }

  const rawData = JSON.parse(fs.readFileSync(translationsPath, 'utf-8'));
  
  // Convert object to array of pairs
  const translations: TranslationPair[] = Object.entries(rawData).map(([english, filipino]) => ({
    english: english as string,
    filipino: filipino as string,
  }));

  console.log(`📂  Loaded ${translations.length} translation pairs from ${TRANSLATIONS_PATH}`);

  // 2. Fetch existing base_ids so we can skip duplicates
  const { data: existing } = await supabase
    .from('prompts')
    .select('base_id')
    .eq('task_type', 'NLU'); // Translations are typically NLU tasks

  const existingIds = new Set((existing ?? []).map((r: { base_id: string }) => r.base_id));
  console.log(`📊  ${existingIds.size} prompts already in database`);

  // 3. Map translations to prompt rows with generated base_ids
  const toInsert = translations
    .map((pair, index) => {
      // Generate base_id: TR_001, TR_002, etc.
      const baseId = `TR_${String(index + 1).padStart(3, '0')}`;
      
      // Skip if already exists
      if (existingIds.has(baseId)) {
        console.log(`  ⏭️  Skipping duplicate: ${baseId}`);
        return null;
      }

      return {
        base_id: baseId,
        english_text: pair.english,
        filipino_text: pair.filipino,
        task_type: 'NLU',
        category: 'translation_task',
        context_intended_to_be_safe: true,
        context: {
          sender: {
            nature_of_the_interaction: 'Translation task for research dataset',
            platform_type: 'Translation annotation system',
          },
          recipient: {
            type: 'Translator',
            background: 'Research participant translating prompts',
          },
          transmission_principle: {
            sender_purpose: 'To collect accurate Filipino translations of English prompts',
            confidentiality: 'Private research data',
            source_accountability: 'Research institution',
          },
        },
      };
    })
    .filter((row) => row !== null);

  if (toInsert.length === 0) {
    console.log('✅  Nothing new to import.');
    return;
  }

  console.log(`⬆️   Importing ${toInsert.length} translation pairs in batches of ${BATCH_SIZE}...`);

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

  console.log(`\n✅  Import complete. ${inserted} translation pairs added.`);
}

importTranslations().catch((err) => {
  console.error('❌  Unexpected error:', err);
  process.exit(1);
});
