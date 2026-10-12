import db from './config/database.js';

async function migrate() {
  try {
    await db.query(`ALTER TABLE result_cards ADD COLUMN IF NOT EXISTS "examType" VARCHAR(50) DEFAULT 'FINAL';`);
    await db.query(`DROP INDEX IF EXISTS result_cards_student_id_academic_term_id;`);
    await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS result_cards_student_term_exam ON result_cards ("studentId", "academicTermId", "examType");`);
    console.log('MIGRATION_SUCCESS');
  } catch (err) {
    console.error('MIGRATION_ERROR:', err);
  } finally {
    process.exit(0);
  }
}

migrate();
