import { generateInstituteIds } from './utils/idGenerator.js';
import db from './models/index.js';

async function runTests() {
  console.log('Connecting to database for tests...');
  await db.sequelize.authenticate();
  
  // Ensure we have the sequence seeded for test
  await db.IdSequence.findOrCreate({
    where: { prefix: 'TEST' },
    defaults: { lastUsed: 0 }
  });

  // Reset to 0 just in case
  await db.sequelize.query(`UPDATE id_sequences SET "lastUsed" = 0 WHERE prefix = 'TEST'`);

  console.log('\\n--- Test 1: 50 concurrent calls of 1 ID ---');
  const promises = [];
  for (let i = 0; i < 50; i++) {
    promises.push(generateInstituteIds('TEST', 1));
  }
  
  const results = await Promise.all(promises);
  // results is array of arrays: [['TEST0001'], ['TEST0002'], ...]
  const flatResults = results.flat();
  const uniqueIds = new Set(flatResults);
  
  console.log(`Generated ${flatResults.length} IDs.`);
  console.log(`Unique IDs: ${uniqueIds.size}`);
  if (flatResults.length === 50 && uniqueIds.size === 50) {
    console.log('✅ Test 1 Passed: 50 concurrent calls yielded zero duplicates.');
  } else {
    console.error('❌ Test 1 Failed: Duplicates found or wrong number of IDs.');
  }

  console.log('\\n--- Test 2: Bulk call of 500 IDs ---');
  const bulkResults = await generateInstituteIds('TEST', 500);
  console.log(`Generated ${bulkResults.length} IDs.`);
  
  const expectedFirst = 51; // Because we used 50 above
  const expectedLast = 550;
  
  const isContiguous = bulkResults[0] === `TEST${String(expectedFirst).padStart(4, '0')}` && 
                       bulkResults[499] === `TEST${String(expectedLast).padStart(4, '0')}`;
                       
  if (bulkResults.length === 500 && isContiguous) {
    console.log('✅ Test 2 Passed: Bulk call reserved one contiguous block.');
  } else {
    console.error('❌ Test 2 Failed: Block is not contiguous or wrong size.');
    console.log('First:', bulkResults[0], 'Last:', bulkResults[bulkResults.length - 1]);
  }

  process.exit(0);
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
