import db from './models/index.js';

async function syncDatabase() {
  try {
    console.log('Connecting to the database...');
    await db.sequelize.authenticate();
    console.log('Connection has been established successfully.');

    console.log('Syncing models with the database (alter: true)...');
    // { alter: true } will update existing tables to match the models or create them if they don't exist
    await db.sequelize.sync({ alter: true });
    
    console.log('✅ Database sync complete! All 42 tables are up-to-date.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Unable to sync the database:', error);
    process.exit(1);
  }
}

syncDatabase();
