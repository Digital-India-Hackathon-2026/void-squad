const Rule = require('../models/Rule');
const rulesData = require('../data/rules.json');

async function seedRules() {
  const count = await Rule.countDocuments();
  if (count > 0) {
    console.log(`ℹ️  Rules collection already has ${count} entries — skipping seed.`);
    return;
  }

  try {
    await Rule.insertMany(rulesData, { ordered: false });
    console.log(`✅ Seeded ${rulesData.length} FSSAI rules into the database.`);
  } catch (err) {
    // Ignore duplicate key errors (E11000) — may occur on concurrent starts
    if (err.code === 11000) {
      console.log('ℹ️  Some rules already existed — seed partially completed.');
    } else {
      console.error('❌ Error seeding rules:', err.message);
    }
  }
}

module.exports = seedRules;
