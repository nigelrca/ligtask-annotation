import fs from 'fs';

const en = JSON.parse(fs.readFileSync('./scripts/LIGTask_TFG_flat_dataset.json', 'utf-8'));

// Group by (base_id, task_type) pair
const pairs = {};
en.forEach(rec => {
  const key = `${rec.base_id}|${rec.task_code}`;
  if (!pairs[key]) {
    pairs[key] = 0;
  }
  pairs[key]++;
});

// Find duplicates
const duplicates = Object.entries(pairs).filter(([_, count]) => count > 1);

console.log('Total records:', en.length);
console.log('Unique (base_id, task_type) pairs:', Object.keys(pairs).length);
console.log('Duplicate pairs found:', duplicates.length);

if (duplicates.length > 0) {
  console.log('Examples:');
  duplicates.slice(0, 5).forEach(([pair, count]) => {
    console.log(`  ${pair}: appears ${count} times`);
  });
}
