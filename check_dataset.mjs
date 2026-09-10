import fs from 'fs';

const en = JSON.parse(fs.readFileSync('./scripts/LIGTask_TFG_flat_dataset.json', 'utf-8'));

// Group by base_id
const byBaseId = {};
en.forEach(rec => {
  if (!byBaseId[rec.base_id]) {
    byBaseId[rec.base_id] = [];
  }
  byBaseId[rec.base_id].push(rec.task_code);
});

// Find ones with multiple task types
const multiTask = Object.entries(byBaseId).filter(([_, tasks]) => tasks.length > 1);

console.log('Total unique base_ids:', Object.keys(byBaseId).length);
console.log('Base ids with multiple task types:', multiTask.length);
console.log('Example:', multiTask.slice(0, 3).map(([id, tasks]) => `${id}: ${tasks.join(', ')}`));
