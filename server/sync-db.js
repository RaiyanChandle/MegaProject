import db from './models/index.js';

async function syncDatabase() {
  try {
    console.log('Connecting to the database...');
    await db.sequelize.authenticate();
    console.log('Connection has been established successfully.');

    // Pre-sync patch: Clean up legacy unique indexes that conflict with updated composite unique keys
    try {
      await db.sequelize.query('DROP INDEX IF EXISTS result_cards_student_id_academic_term_id;');
    } catch (e) {
      // Ignore if index does not exist
    }

    console.log('Syncing models with the database (alter: true)...');
    // { alter: true } updates existing tables to match the models or creates them if they don't exist
    await db.sequelize.sync({ alter: true });
    
    console.log('✅ Database sync complete! All tables are up-to-date.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Unable to sync the database:', error);
    process.exit(1);
  }
}

syncDatabase();
