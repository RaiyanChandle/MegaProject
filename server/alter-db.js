import db from './models/index.js';

async function alterTable() {
  try {
    await db.sequelize.authenticate();
    await db.sequelize.query('ALTER TABLE department_admins ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;');
    console.log('Successfully added isActive column to department_admins');
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
alterTable();
