import fs from 'fs';

const en = JSON.parse(fs.readFileSync('./scripts/LIGTask_TFG_flat_dataset.json', 'utf-8'));

// Find a duplicate pair
const first = en.find(r => r.base_id === 'CB_001' && r.task_code === 'NLU');
const second = en.find((r, i) => i > en.indexOf(first) && r.base_id === 'CB_001' && r.task_code === 'NLU');

console.log('First CB_001|NLU:');
console.log('  task_instance_id:', first.task_instance_id);
console.log('  query:', first.input.query.substring(0, 80));

console.log('\nSecond CB_001|NLU:');
console.log('  task_instance_id:', second.task_instance_id);
console.log('  query:', second.input.query.substring(0, 80));

console.log('\nAre queries identical?', first.input.query === second.input.query);
console.log('Are they the same object?', first === second);
