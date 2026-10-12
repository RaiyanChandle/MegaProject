import 'dotenv/config';
import sequelize from './config/database.js';

async function checkHallTicketTable() {
  try {
    const [cols] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'hall_tickets'
    `);
    console.log('Columns in hall_tickets:', cols);

    const [fks] = await sequelize.query(`
      SELECT tc.constraint_name, tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name 
      JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name 
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'hall_tickets'
    `);
    console.log('Foreign keys in hall_tickets:', fks);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

checkHallTicketTable();
