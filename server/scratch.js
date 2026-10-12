import 'dotenv/config';
import sequelize from './config/database.js';

async function checkComponentsAndExams() {
  try {
    const [components] = await sequelize.query(`
      SELECT DISTINCT name, category, "maxMarks" 
      FROM assessment_components 
      LIMIT 10
    `);
    console.log('Sample AssessmentComponents:', components);

    const [exams] = await sequelize.query(`
      SELECT DISTINCT "examType", name 
      FROM exams 
      LIMIT 10
    `);
    console.log('Sample Exams:', exams);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

checkComponentsAndExams();
