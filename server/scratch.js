import 'dotenv/config';
import sequelize from './config/database.js';

async function updateSchema() {
  try {
    console.log('Adding REJECTED to enum_question_papers_status...');
    await sequelize.query(`ALTER TYPE "enum_question_papers_status" ADD VALUE IF NOT EXISTS 'REJECTED'`);
    
    console.log('Adding verification columns to question_papers table...');
    await sequelize.query(`ALTER TABLE question_papers ADD COLUMN IF NOT EXISTS "verificationRemarks" TEXT`);
    await sequelize.query(`ALTER TABLE question_papers ADD COLUMN IF NOT EXISTS "verifiedById" UUID`);
    await sequelize.query(`ALTER TABLE question_papers ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP WITH TIME ZONE`);

    const [cols] = await sequelize.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'question_papers'`);
    console.log('Updated question_papers columns:', cols);
  } catch (err) {
    console.error('Schema update error:', err);
  } finally {
    process.exit(0);
  }
}

updateSchema();
